
import { FastifyRequest, FastifyReply } from "fastify";
import { webhookService } from "../../services/webhook.service";
import { BounceType } from "@prisma/client";
import crypto from "crypto";

export class MailgunWebhookHandler {

    private verifySignature(token: string, timestamp: string, signature: string): boolean {
        const apiKey = process.env.MAILGUN_SIGNING_KEY || process.env.MAILGUN_API_KEY;
        if (!apiKey) {
            console.warn("[Mailgun-Webhook] Missing MAILGUN_SIGNING_KEY or MAILGUN_API_KEY");
            return false;
        }

        const encodedToken = crypto
            .createHmac('sha256', apiKey)
            .update(timestamp.concat(token))
            .digest('hex');

        return encodedToken === signature;
    }

    async handle(request: FastifyRequest, reply: FastifyReply) {
        const body = request.body as any;

        if (!body || !body.signature) {
            return reply.status(400).send("Missing signature");
        }

        const { signature } = body;

        // 1. Verify Signature
        if (!this.verifySignature(signature.token, signature.timestamp, signature.signature)) {
            console.warn("[Mailgun-Webhook] Invalid signature");
            return reply.status(401).send("Invalid signature");
        }

        const eventData = body['event-data'];
        if (!eventData) return reply.send({ status: 'ignored' });

        const messageId = eventData.message?.headers['message-id']; // This is usually the provider ID
        // Alternatively eventData.id is the event ID.
        // We need the Message-ID we sent or the one they returned.
        // Mailgun returns the ID in the response of send().
        // In the webhook, 'message.headers.message-id' is the clean ID (e.g. <xyz@mailgun.org> or <xyz@domain.com>)

        // Clean up message ID (remove < >)
        const cleanMessageId = messageId ? messageId.replace(/[<>]/g, '') : null;

        if (!cleanMessageId) {
             console.warn("[Mailgun-Webhook] No Message-ID found in event");
             return reply.send({ status: 'ignored' });
        }

        const timestamp = new Date(eventData.timestamp * 1000);

        switch (eventData.event) {
            case 'delivered':
                await webhookService.processEvent({
                    provider: 'mailgun',
                    messageId: cleanMessageId,
                    eventType: 'DELIVERY',
                    timestamp
                });
                break;

            case 'failed':
                // Mailgun 'failed' covers bounces
                const isPermanent = eventData.severity === 'permanent';
                await webhookService.processEvent({
                    provider: 'mailgun',
                    messageId: cleanMessageId,
                    eventType: 'BOUNCE',
                    timestamp,
                    bounceType: isPermanent ? BounceType.HARD : BounceType.SOFT,
                    bounceReason: eventData['delivery-status']?.message || eventData.reason
                });
                break;

            case 'complained':
                await webhookService.processEvent({
                    provider: 'mailgun',
                    messageId: cleanMessageId,
                    eventType: 'COMPLAINT',
                    timestamp
                });
                break;
        }

        return reply.send({ status: 'ok' });
    }
}

export const mailgunWebhookHandler = new MailgunWebhookHandler();
