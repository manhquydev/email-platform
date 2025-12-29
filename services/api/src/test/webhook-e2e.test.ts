import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { app, prisma } from './setup';
import { hashPassword } from '../utils/password';
import { signPayload } from '../services/webhookService';
import fastify from 'fastify';
import { WEBHOOK_QUEUE_NAME } from '../queue/webhookQueue';

describe('Webhook Comprehensive E2E', () => {
    let userToken: string;
    let userId: string;
    let mockReceiver: any;
    let receivedPayload: any = null;
    let receivedHeaders: any = null;
    let mockReceiverPort: number;

    beforeEach(async () => {
        // 1. Setup Mock Receiver Server
        mockReceiver = fastify();
        mockReceiver.post('/webhook', async (request, reply) => {
            receivedPayload = request.body;
            receivedHeaders = request.headers;
            return { received: true };
        });
        const address = await mockReceiver.listen({ port: 0 }); // Random port
        mockReceiverPort = parseInt(address.split(':').pop());
        receivedPayload = null;
        receivedHeaders = null;

        // 2. Setup Test User
        const passwordHash = await hashPassword('password123');
        const user = await prisma.user.create({
            data: {
                email: `e2e-${Math.random()}@example.com`,
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

    afterAll(async () => {
        if (mockReceiver) await mockReceiver.close();
    });

    it('should deliver webhook and log result correctly', async () => {
        // 1. Create Webhook pointing to our mock receiver
        const webhookRes = await app.inject({
            method: 'POST',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                name: 'E2E Webhook',
                url: `http://localhost:${mockReceiverPort}/webhook`,
                events: ['email.received', 'test.event']
            }
        });
        expect(webhookRes.statusCode).toBe(201);
        const webhook = webhookRes.json();

        // 2. Trigger Webhook via Test Endpoint
        await app.inject({
            method: 'POST',
            url: `/webhooks/${webhook.id}/test`,
            headers: { Authorization: `Bearer ${userToken}` }
        });

        // 3. Since we don't have the worker running in this test environment automatically,
        // we can manually trigger the worker logic or wait if it's running.
        // For a true "comprehensive" test, let's run the worker logic for one job.
        const { triggerWebhook } = await import('../services/webhookService');
        // Actually, the /test endpoint already called triggerWebhook.

        // Wait for Redis/Queue to process (in tests we might need to manually process or use a local worker)
        // Let's import the worker setup and run it briefly or mock the fetch.
        // But the user asked for a "comprehensive" test, which usually implies E2E.

        // Let's manually run the processing logic for the job to avoid dependency on a running background worker
        const { webhookQueue } = await import('../queue/webhookQueue');
        const jobs = await webhookQueue.getJobs(['waiting']);
        expect(jobs.length).toBeGreaterThan(0);

        // We'll use the actual worker processor logic if possible, or just wait for the worker if it's already set up.
        // In our setup.ts, we don't start the worker. Let's start it here.
        const { setupWebhookWorker } = await import('../webhookWorker');
        const worker = setupWebhookWorker(app.log);

        // Wait for delivery (polling)
        let attempts = 0;
        while (!receivedPayload && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }

        expect(receivedPayload).toBeDefined();
        expect(receivedPayload.event).toBe('test.event');

        // 4. Verify Signature
        const signature = receivedHeaders['x-ephemera-signature'];
        expect(signature).toBeDefined();
        const expectedSignature = signPayload(JSON.stringify(receivedPayload), webhook.secret);
        expect(signature).toBe(expectedSignature);

        // 5. Verify Database Logs
        const logs = await prisma.webhookLog.findMany({
            where: { webhookId: webhook.id }
        });
        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].statusCode).toBe(200);
        expect(logs[0].eventType).toBe('test.event');

        await worker.close();
    });

    it('should handle delivery failure and log it', async () => {
        // 1. Create Webhook pointing to a non-existent endpoint
        const webhookRes = await app.inject({
            method: 'POST',
            url: '/webhooks',
            headers: { Authorization: `Bearer ${userToken}` },
            payload: {
                name: 'Fail Webhook',
                url: `http://localhost:${mockReceiverPort}/not-found`,
                events: ['test.event']
            }
        });
        const webhook = webhookRes.json();

        // 2. Trigger
        await app.inject({
            method: 'POST',
            url: `/webhooks/${webhook.id}/test`,
            headers: { Authorization: `Bearer ${userToken}` }
        });

        // 3. Process
        const { setupWebhookWorker } = await import('../webhookWorker');
        const worker = setupWebhookWorker(app.log);

        // Wait for log to appear
        let attempts = 0;
        let logs: any[] = [];
        while (logs.length === 0 && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 200));
            logs = await prisma.webhookLog.findMany({ where: { webhookId: webhook.id } });
            attempts++;
        }

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].statusCode).toBe(404);

        await worker.close();
    });
});
