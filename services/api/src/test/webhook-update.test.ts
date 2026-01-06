import { describe, it, expect, beforeEach } from 'vitest';
import { app, prisma } from './setup';
import { hashPassword } from '../utils/password';

describe('Webhook Update Endpoint (PUT /webhooks/:id)', () => {
    let userToken: string;
    let userId: string;
    let otherUserToken: string;
    let otherUserId: string;

    beforeEach(async () => {
        // Create first test user
        const passwordHash = await hashPassword('password123');
        const user = await prisma.user.create({
            data: {
                email: `test-${Math.random()}@example.com`,
                passwordHash,
                emailVerified: new Date(),
            }
        });
        userId = user.id;

        const loginRes = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: { email: user.email, password: 'password123' }
        });
        userToken = loginRes.json().token;

        // Create second test user
        const otherPasswordHash = await hashPassword('password456');
        const otherUser = await prisma.user.create({
            data: {
                email: `other-${Math.random()}@example.com`,
                passwordHash: otherPasswordHash,
                emailVerified: new Date(),
            }
        });
        otherUserId = otherUser.id;

        const otherLoginRes = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: { email: otherUser.email, password: 'password456' }
        });
        otherUserToken = otherLoginRes.json().token;
    });

    it('should update webhook name', async () => {
        // Create a webhook
        const createRes = await app.inject({
            method: 'POST',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                name: 'Original Name',
                url: 'https://example.com/webhook',
                events: ['email.received']
            }
        });
        expect(createRes.statusCode).toBe(201);
        const webhook = createRes.json();

        // Update webhook name
        const updateRes = await app.inject({
            method: 'PUT',
            url: `/webhooks/${webhook.id}`,
            headers: { Authorization: `Bearer ${userToken}` },
            payload: { name: 'Updated Name' }
        });
        expect(updateRes.statusCode).toBe(200);
        expect(updateRes.json().name).toBe('Updated Name');
        expect(updateRes.json().url).toBe('https://example.com/webhook'); // URL unchanged
    });

    it('should update webhook URL', async () => {
        // Create a webhook
        const createRes = await app.inject({
            method: 'POST',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                name: 'Test Webhook',
                url: 'https://old.example.com/webhook',
                events: ['email.received']
            }
        });
        const webhook = createRes.json();

        // Update webhook URL
        const updateRes = await app.inject({
            method: 'PUT',
            url: `/webhooks/${webhook.id}`,
            headers: { Authorization: `Bearer ${userToken}` },
            payload: { url: 'https://new.example.com/webhook' }
        });
        expect(updateRes.statusCode).toBe(200);
        expect(updateRes.json().url).toBe('https://new.example.com/webhook');
    });

    it('should update webhook events', async () => {
        // Create a webhook
        const createRes = await app.inject({
            method: 'POST',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                name: 'Test Webhook',
                url: 'https://example.com/webhook',
                events: ['email.received']
            }
        });
        const webhook = createRes.json();

        // Update webhook events
        const updateRes = await app.inject({
            method: 'PUT',
            url: `/webhooks/${webhook.id}`,
            headers: { Authorization: `Bearer ${userToken}` },
            payload: { events: ['email.received', 'email.deleted', 'inbox.created'] }
        });
        expect(updateRes.statusCode).toBe(200);
        expect(updateRes.json().events).toEqual(['email.received', 'email.deleted', 'inbox.created']);
    });

    it('should toggle webhook isActive status', async () => {
        // Create a webhook (defaults to active)
        const createRes = await app.inject({
            method: 'POST',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                name: 'Test Webhook',
                url: 'https://example.com/webhook',
                events: ['email.received']
            }
        });
        const webhook = createRes.json();
        expect(webhook.isActive).toBe(true);

        // Deactivate webhook
        const deactivateRes = await app.inject({
            method: 'PUT',
            url: `/webhooks/${webhook.id}`,
            headers: { Authorization: `Bearer ${userToken}` },
            payload: { isActive: false }
        });
        expect(deactivateRes.statusCode).toBe(200);
        expect(deactivateRes.json().isActive).toBe(false);

        // Reactivate webhook
        const reactivateRes = await app.inject({
            method: 'PUT',
            url: `/webhooks/${webhook.id}`,
            headers: { Authorization: `Bearer ${userToken}` },
            payload: { isActive: true }
        });
        expect(reactivateRes.statusCode).toBe(200);
        expect(reactivateRes.json().isActive).toBe(true);
    });

    it('should update multiple fields at once', async () => {
        // Create a webhook
        const createRes = await app.inject({
            method: 'POST',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                name: 'Original',
                url: 'https://old.example.com/webhook',
                events: ['email.received']
            }
        });
        const webhook = createRes.json();

        // Update multiple fields
        const updateRes = await app.inject({
            method: 'PUT',
            url: `/webhooks/${webhook.id}`,
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                name: 'Updated',
                url: 'https://new.example.com/webhook',
                events: ['test.event'],
                isActive: false
            }
        });
        expect(updateRes.statusCode).toBe(200);
        const updated = updateRes.json();
        expect(updated.name).toBe('Updated');
        expect(updated.url).toBe('https://new.example.com/webhook');
        expect(updated.events).toEqual(['test.event']);
        expect(updated.isActive).toBe(false);
    });

    it('should return 404 for non-existent webhook', async () => {
        const updateRes = await app.inject({
            method: 'PUT',
            url: '/webhooks/00000000-0000-0000-0000-000000000000',
            headers: { Authorization: `Bearer ${userToken}` },
            payload: { name: 'Test' }
        });
        expect(updateRes.statusCode).toBe(404);
        expect(updateRes.json().error).toBe('Webhook not found');
    });

    it('should return 400 for invalid URL', async () => {
        // Create a webhook
        const createRes = await app.inject({
            method: 'POST',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                name: 'Test Webhook',
                url: 'https://example.com/webhook',
                events: ['email.received']
            }
        });
        const webhook = createRes.json();

        // Try to update with invalid URL
        const updateRes = await app.inject({
            method: 'PUT',
            url: `/webhooks/${webhook.id}`,
            headers: { Authorization: `Bearer ${userToken}` },
            payload: { url: 'not-a-valid-url' }
        });
        expect(updateRes.statusCode).toBe(400);
    });

    it('should return 400 for name exceeding max length', async () => {
        // Create a webhook
        const createRes = await app.inject({
            method: 'POST',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                name: 'Test Webhook',
                url: 'https://example.com/webhook',
                events: ['email.received']
            }
        });
        const webhook = createRes.json();

        // Try to update with name exceeding 100 characters
        const longName = 'a'.repeat(101);
        const updateRes = await app.inject({
            method: 'PUT',
            url: `/webhooks/${webhook.id}`,
            headers: { Authorization: `Bearer ${userToken}` },
            payload: { name: longName }
        });
        expect(updateRes.statusCode).toBe(400);
    });

    it('should not allow updating another user\'s webhook', async () => {
        // First user creates a webhook
        const createRes = await app.inject({
            method: 'POST',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                name: 'User1 Webhook',
                url: 'https://example.com/webhook',
                events: ['email.received']
            }
        });
        const webhook = createRes.json();

        // Second user tries to update first user's webhook
        const updateRes = await app.inject({
            method: 'PUT',
            url: `/webhooks/${webhook.id}`,
            headers: { Authorization: `Bearer ${otherUserToken}` },
            payload: { name: 'Hacked!' }
        });
        expect(updateRes.statusCode).toBe(404); // Returns 404 as webhook not found for this user
    });

    it('should require authentication', async () => {
        const updateRes = await app.inject({
            method: 'PUT',
            url: '/webhooks/00000000-0000-0000-0000-000000000000',
            payload: { name: 'Test' }
        });
        expect(updateRes.statusCode).toBe(401);
    });
});
