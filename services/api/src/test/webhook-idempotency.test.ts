import { describe, it, expect, beforeEach } from 'vitest';
import { app, prisma } from './setup';
import { hashPassword } from '../utils/password';
import { generateIdempotencyKey, WebhookPayload } from '../services/webhookService';

describe('Webhook Idempotency Key', () => {
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

    describe('generateIdempotencyKey', () => {
        it('should generate a valid UUID', () => {
            const key = generateIdempotencyKey();
            expect(key).toBeDefined();
            // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(key).toMatch(uuidRegex);
        });

        it('should generate unique keys', () => {
            const keys = new Set<string>();
            for (let i = 0; i < 100; i++) {
                keys.add(generateIdempotencyKey());
            }
            expect(keys.size).toBe(100);
        });
    });

    describe('WebhookPayload interface', () => {
        it('should include idempotencyKey field', () => {
            const payload: WebhookPayload = {
                event: 'test.event',
                timestamp: new Date().toISOString(),
                idempotencyKey: generateIdempotencyKey(),
                data: { test: true }
            };

            expect(payload.idempotencyKey).toBeDefined();
            expect(typeof payload.idempotencyKey).toBe('string');
        });
    });

    describe('Webhook Test Endpoint with Idempotency', () => {
        it('should queue a test webhook with idempotency key', async () => {
            // Create a webhook
            const createRes = await app.inject({
                method: 'POST',
                url: '/webhooks',
                headers: { Authorization: `Bearer ${userToken}` },
                payload: {
                    name: 'Idempotency Test Webhook',
                    url: 'https://example.com/webhook',
                    events: ['test.event']
                }
            });
            expect(createRes.statusCode).toBe(201);
            const webhook = createRes.json();

            // Trigger test webhook
            const testRes = await app.inject({
                method: 'POST',
                url: `/webhooks/${webhook.id}/test`,
                headers: { Authorization: `Bearer ${userToken}` }
            });
            expect(testRes.statusCode).toBe(200);
            expect(testRes.json().success).toBe(true);
        });
    });
});
