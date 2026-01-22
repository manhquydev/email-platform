/**
 * Webhook Test Receiver
 * Internal endpoint to test webhook delivery without external services
 *
 * Usage:
 * 1. Create webhook with URL: https://api.manhquy.click/webhook-test/receive/{unique-id}
 * 2. Trigger webhook (send email, test button, etc.)
 * 3. Check received payloads: GET /webhook-test/payloads/{unique-id}
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';

// In-memory storage for test payloads (cleared on restart)
// Key: receiverId, Value: array of received payloads
const receivedPayloads: Map<string, Array<{
    id: string;
    receivedAt: string;
    headers: Record<string, string>;
    body: any;
    signature: string | null;
    signatureValid: boolean | null;
}>> = new Map();

// Max payloads per receiver (prevent memory bloat)
const MAX_PAYLOADS_PER_RECEIVER = 50;

// Auto-cleanup old receivers after 1 hour
const RECEIVER_TTL_MS = 60 * 60 * 1000;
const receiverTimestamps: Map<string, number> = new Map();

// Cleanup expired receivers periodically
setInterval(() => {
    const now = Date.now();
    for (const [id, timestamp] of receiverTimestamps.entries()) {
        if (now - timestamp > RECEIVER_TTL_MS) {
            receivedPayloads.delete(id);
            receiverTimestamps.delete(id);
        }
    }
}, 5 * 60 * 1000); // Every 5 minutes

export async function webhookTestReceiverRoutes(app: FastifyInstance) {
    // Generate a new receiver ID
    app.post('/webhook-test/create', { preHandler: app.authenticate }, async (request) => {
        const receiverId = crypto.randomBytes(16).toString('hex');
        receivedPayloads.set(receiverId, []);
        receiverTimestamps.set(receiverId, Date.now());

        const baseUrl = process.env.API_URL || 'https://api.manhquy.click';

        return {
            receiverId,
            webhookUrl: `${baseUrl}/webhook-test/receive/${receiverId}`,
            viewUrl: `${baseUrl}/webhook-test/payloads/${receiverId}`,
            expiresIn: '1 hour',
            note: 'Use webhookUrl when creating a webhook, then check viewUrl for received payloads'
        };
    });

    // Receive webhook payload (public - no auth, simulates external endpoint)
    app.post('/webhook-test/receive/:receiverId', async (request, reply) => {
        const { receiverId } = request.params as { receiverId: string };

        if (!receivedPayloads.has(receiverId)) {
            return reply.status(404).send({ error: 'Receiver not found or expired' });
        }

        const payloads = receivedPayloads.get(receiverId)!;

        // Extract signature from headers
        const signature = request.headers['x-ephemera-signature'] as string | undefined;
        const event = request.headers['x-ephemera-event'] as string | undefined;
        const delivery = request.headers['x-ephemera-delivery'] as string | undefined;

        // Store received payload
        const entry = {
            id: crypto.randomUUID(),
            receivedAt: new Date().toISOString(),
            headers: {
                'x-ephemera-event': event || '',
                'x-ephemera-delivery': delivery || '',
                'x-ephemera-signature': signature ? signature.substring(0, 20) + '...' : '',
                'x-ephemera-timestamp': request.headers['x-ephemera-timestamp'] as string || '',
                'content-type': request.headers['content-type'] as string || '',
                'user-agent': request.headers['user-agent'] as string || '',
            },
            body: request.body,
            signature: signature || null,
            signatureValid: null as boolean | null, // Will be validated if secret provided
        };

        // Keep only last N payloads
        if (payloads.length >= MAX_PAYLOADS_PER_RECEIVER) {
            payloads.shift();
        }
        payloads.push(entry);

        // Update timestamp
        receiverTimestamps.set(receiverId, Date.now());

        // Return success (webhook endpoints should return 2xx)
        return {
            received: true,
            id: entry.id,
            event,
            timestamp: entry.receivedAt
        };
    });

    // Get received payloads
    app.get('/webhook-test/payloads/:receiverId', async (request, reply) => {
        const { receiverId } = request.params as { receiverId: string };

        if (!receivedPayloads.has(receiverId)) {
            return reply.status(404).send({ error: 'Receiver not found or expired' });
        }

        const payloads = receivedPayloads.get(receiverId)!;

        return {
            receiverId,
            count: payloads.length,
            payloads: payloads.slice().reverse(), // Newest first
        };
    });

    // Verify a payload signature (utility)
    app.post('/webhook-test/verify', async (request, reply) => {
        const bodySchema = z.object({
            payload: z.string(),
            signature: z.string(),
            secret: z.string(),
        });

        const parsed = bodySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Invalid request' });
        }

        const { payload, signature, secret } = parsed.data;

        const expectedSignature = `sha256=${crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex')}`;

        const isValid = signature === expectedSignature;

        return {
            valid: isValid,
            expected: expectedSignature,
            received: signature,
        };
    });

    // Clear payloads for a receiver
    app.delete('/webhook-test/payloads/:receiverId', { preHandler: app.authenticate }, async (request, reply) => {
        const { receiverId } = request.params as { receiverId: string };

        if (!receivedPayloads.has(receiverId)) {
            return reply.status(404).send({ error: 'Receiver not found' });
        }

        receivedPayloads.set(receiverId, []);
        return { success: true, message: 'Payloads cleared' };
    });

    // Delete a receiver
    app.delete('/webhook-test/receiver/:receiverId', { preHandler: app.authenticate }, async (request, reply) => {
        const { receiverId } = request.params as { receiverId: string };

        if (!receivedPayloads.has(receiverId)) {
            return reply.status(404).send({ error: 'Receiver not found' });
        }

        receivedPayloads.delete(receiverId);
        receiverTimestamps.delete(receiverId);
        return { success: true, message: 'Receiver deleted' };
    });
}
