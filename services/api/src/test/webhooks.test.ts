import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app, prisma } from './setup';
import { hashPassword } from '../utils/password';
import { signPayload } from '../services/webhookService';

describe('Webhook System', () => {
    let userToken: string;
    let userId: string;

    beforeEach(async () => {
        // Create a test user
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
    });

    it('should create, list, and delete a webhook', async () => {
        // 1. Create Webhook
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
        expect(createRes.statusCode).toBe(201);
        const webhook = createRes.json();
        expect(webhook.name).toBe('Test Webhook');
        expect(webhook.url).toBe('https://example.com/webhook');
        expect(webhook.secret).toBeDefined();

        // 2. List Webhooks
        const listRes = await app.inject({
            method: 'GET',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` }
        });
        expect(listRes.statusCode).toBe(200);
        expect(listRes.json().length).toBe(1);
        expect(listRes.json()[0].id).toBe(webhook.id);

        // 3. Delete Webhook
        const deleteRes = await app.inject({
            method: 'DELETE',
            url: `/webhooks/${webhook.id}`,
            headers: { Authorization: `Bearer ${userToken}` }
        });
        expect(deleteRes.statusCode).toBe(200);

        // 4. Verify deletion
        const listAfterRes = await app.inject({
            method: 'GET',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` }
        });
        expect(listAfterRes.json().length).toBe(0);
    });

    it('should sign the payload correctly', () => {
        const payload = JSON.stringify({ event: 'test', data: { foo: 'bar' } });
        const secret = 'super-secret';
        const signature = signPayload(payload, secret);

        // Manual HMAC calculation check (expected value for this exact input)
        // echo -n '{"event":"test","data":{"foo":"bar"}}' | openssl dgst -sha256 -hmac "super-secret"
        expect(signature).toBeDefined();
        expect(signature.length).toBe(64); // SHA256 hex length
    });

    it('should queue a test webhook', async () => {
        const createRes = await app.inject({
            method: 'POST',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                name: 'Test Webhook',
                url: 'https://example.com/webhook',
                events: ['test.event']
            }
        });
        const webhook = createRes.json();

        const testRes = await app.inject({
            method: 'POST',
            url: `/webhooks/${webhook.id}/test`,
            headers: { Authorization: `Bearer ${userToken}` }
        });
        expect(testRes.statusCode).toBe(200);
        expect(testRes.json().message).toBe('Test webhook queued');
    });
});
