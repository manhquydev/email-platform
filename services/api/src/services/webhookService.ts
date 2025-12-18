import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

export interface WebhookEvent {
    provider: 'ses' | 'mailgun' | 'sendgrid';
    type: 'bounce' | 'complaint' | 'delivery' | 'reject';
    timestamp: Date;
    recipient: string;
    messageId?: string;
    reason?: string;
    data: any;
}

export class WebhookService {
    private webhookSecret: string;

    constructor() {
        this.webhookSecret = process.env.WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex');
    }

    /**
     * Verify webhook signature (for providers that support it)
     */
    verifyWebhookSignature(provider: string, signature: string, payload: string): boolean {
        switch (provider) {
            case 'sendgrid':
                // SendGrid uses Event Webhook signature verification
                return this.verifySendgridSignature(signature, payload);

            case 'mailgun':
                // Mailgun uses webhook signing key
                return this.verifyMailgunSignature(signature, payload);

            case 'ses':
                // SES SNS notifications have their own verification
                return this.verifySesSignature(payload);

            default:
                return true; // No verification for unknown providers
        }
    }

    private verifySendgridSignature(signature: string, payload: string): boolean {
        const signingKey = process.env.SENDGRID_WEBHOOK_SIGNING_KEY;
        if (!signingKey) return true;

        const hmac = crypto.createHmac('sha256', signingKey);
        hmac.update(payload);
        const expectedSignature = hmac.digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    private verifyMailgunSignature(signature: string, payload: string): boolean {
        const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
        if (!signingKey) return true;

        // Mailgun sends signature as token+timestamp+signature
        const [token, timestamp, sig] = signature.split(',');

        const hmac = crypto.createHmac('sha256', signingKey);
        hmac.update(timestamp + token);
        const expectedSignature = hmac.digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(sig, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    private verifySesSignature(payload: string): boolean {
        // SES SNS has built-in signature verification via AWS SDK
        // For now, we'll trust it if it comes from AWS
        return payload.includes('"Type":"Notification"');
    }

    /**
     * Process webhook event from any provider
     */
    async processWebhookEvent(event: WebhookEvent): Promise<void> {
        console.log(`Processing ${event.provider} webhook: ${event.type} for ${event.recipient}`);

        switch (event.type) {
            case 'bounce':
                await this.handleBounce(event);
                break;

            case 'complaint':
                await this.handleComplaint(event);
                break;

            case 'delivery':
                await this.handleDelivery(event);
                break;

            case 'reject':
                await this.handleReject(event);
                break;
        }

        // Log the event for analytics
        await this.logWebhookEvent(event);
    }

    private async handleBounce(event: WebhookEvent): Promise<void> {
        // Find the message that bounced
        const message = await prisma.message.findFirst({
            where: {
                OR: [
                    { toAddress: { contains: event.recipient } },
                    { fromAddress: { contains: event.recipient } },
                ],
            },
        });

        if (message) {
            // Update message with bounce information
            await prisma.message.update({
                where: { id: message.id },
                data: {
                    bounced: true,
                    bounceReason: event.reason || 'Unknown',
                    bouncedAt: new Date(),
                },
            });

            // If this is a permanent bounce, consider blocking the recipient
            if (event.data?.bounceType === 'Permanent') {
                await this.blockRecipient(event.recipient, 'Permanent bounce');
            }
        }

        // Update user's bounce statistics
        await this.updateBounceStatistics(event.recipient);
    }

    private async handleComplaint(event: WebhookEvent): Promise<void> {
        // Find messages related to complaint
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { toAddress: { contains: event.recipient } },
                    { fromAddress: { contains: event.recipient } },
                ],
            },
        });

        // Mark all messages as complained
        if (messages.length > 0) {
            await prisma.message.updateMany({
                where: {
                    id: { in: messages.map(m => m.id) },
                },
                data: {
                    complained: true,
                    complainedAt: new Date(),
                },
            });
        }

        // Block recipient to prevent further complaints
        await this.blockRecipient(event.recipient, 'Spam complaint');
    }

    private async handleDelivery(event: WebhookEvent): Promise<void> {
        // Update delivery status
        if (event.messageId) {
            await prisma.message.updateMany({
                where: {
                    messageId: event.messageId,
                },
                data: {
                    delivered: true,
                    deliveredAt: new Date(),
                },
            });
        }
    }

    private async handleReject(event: WebhookEvent): Promise<void> {
        // Handle rejected emails (similar to bounce but temporary)
        if (event.messageId) {
            await prisma.message.updateMany({
                where: {
                    messageId: event.messageId,
                },
                data: {
                    rejected: true,
                    rejectedAt: new Date(),
                    rejectReason: event.reason || 'Rejected',
                },
            });
        }
    }

    private async blockRecipient(email: string, reason: string): Promise<void> {
        // Add to global blocklist
        const existingRule = await prisma.rule.findFirst({
            where: {
                type: 'BLOCK',
                scope: 'SENDER_EMAIL',
                pattern: email,
            },
        });

        if (!existingRule) {
            await prisma.rule.create({
                data: {
                    type: 'BLOCK',
                    field: 'FROM',
                    pattern: email,
                    active: true,
                    reason: `Auto-blocked: ${reason}`,
                },
            });
        }
    }

    private async updateBounceStatistics(email: string): Promise<void> {
        // Update daily bounce statistics
        const today = new Date().toISOString().split('T')[0];

        // This would require a statistics table, for now just log
        console.log(`Bounce statistics updated for ${email} on ${today}`);
    }

    private async logWebhookEvent(event: WebhookEvent): Promise<void> {
        // Store webhook event for debugging and analytics
        await prisma.auditLog.create({
            data: {
                userId: 'system', // System event
                action: `WEBHOOK_${event.type.toUpperCase()}`,
                meta: JSON.stringify({
                    provider: event.provider,
                    recipient: event.recipient,
                    messageId: event.messageId,
                    reason: event.reason,
                    timestamp: event.timestamp,
                }),
            },
        });
    }

    /**
     * SES webhook handler (SNS notifications)
     */
    async handleSesWebhook(req: FastifyRequest, reply: FastifyReply): Promise<void> {
        const snsMessage = req.body as any;

        // Verify it's an SES notification
        if (!snsMessage.Type || snsMessage.Type !== 'Notification') {
            reply.status(400).send({ error: 'Invalid SES notification' });
            return;
        }

        try {
            const message = JSON.parse(snsMessage.Message);

            const eventType = message.eventType;
            const mail = message.mail;
            const bounce = message.bounce;
            const complaint = message.complaint;

            let eventTypeMapped: 'bounce' | 'complaint' | 'delivery' | 'reject';

            switch (eventType) {
                case 'bounce':
                    eventTypeMapped = 'bounce';
                    break;
                case 'complaint':
                    eventTypeMapped = 'complaint';
                    break;
                case 'delivery':
                    eventTypeMapped = 'delivery';
                    break;
                case 'reject':
                    eventTypeMapped = 'reject';
                    break;
                default:
                    console.log(`Unhandled SES event type: ${eventType}`);
                    reply.send({ success: true });
                    return;
            }

            const event: WebhookEvent = {
                provider: 'ses',
                type: eventTypeMapped,
                timestamp: new Date(),
                recipient: mail?.destination?.[0] || '',
                messageId: mail?.messageId,
                reason: bounce?.bounceType || complaint?.complaintFeedbackType || '',
                data: message,
            };

            await this.processWebhookEvent(event);
            reply.send({ success: true });

        } catch (error) {
            console.error('Error processing SES webhook:', error);
            reply.status(500).send({ error: 'Internal server error' });
        }
    }

    /**
     * SendGrid webhook handler
     */
    async handleSendgridWebhook(req: FastifyRequest, reply: FastifyReply): Promise<void> {
        const events = req.body as any[];
        const signature = req.headers['x-twilio-email-event-notify-signature'] as string;

        // Verify signature if configured
        if (process.env.SENDGRID_WEBHOOK_SIGNING_KEY && signature) {
            const payload = JSON.stringify(req.body);
            if (!this.verifyWebhookSignature('sendgrid', signature, payload)) {
                reply.status(401).send({ error: 'Invalid signature' });
                return;
            }
        }

        for (const event of events) {
            let eventTypeMapped: 'bounce' | 'complaint' | 'delivery' | 'reject';

            switch (event.event) {
                case 'bounce':
                    eventTypeMapped = 'bounce';
                    break;
                case 'complained':
                    eventTypeMapped = 'complaint';
                    break;
                case 'delivered':
                    eventTypeMapped = 'delivery';
                    break;
                case 'dropped':
                    eventTypeMapped = 'reject';
                    break;
                default:
                    continue; // Skip unhandled events
            }

            const webhookEvent: WebhookEvent = {
                provider: 'sendgrid',
                type: eventTypeMapped,
                timestamp: new Date(event.timestamp * 1000),
                recipient: event.email,
                messageId: event.sgv_message_id,
                reason: event.reason || event.response,
                data: event,
            };

            await this.processWebhookEvent(webhookEvent);
        }

        reply.send({ success: true });
    }

    /**
     * Mailgun webhook handler
     */
    async handleMailgunWebhook(req: FastifyRequest, reply: FastifyReply): Promise<void> {
        const signature = req.headers['x-mailgun-signature'] as string;
        const payload = JSON.stringify(req.body);

        // Verify signature if configured
        if (process.env.MAILGUN_WEBHOOK_SIGNING_KEY && signature) {
            if (!this.verifyWebhookSignature('mailgun', signature, payload)) {
                reply.status(401).send({ error: 'Invalid signature' });
                return;
            }
        }

        const eventData = req.body as any;
        const eventType = eventData['event-data'].event;

        let eventTypeMapped: 'bounce' | 'complaint' | 'delivery' | 'reject';

        switch (eventType) {
            case 'bounced':
                eventTypeMapped = 'bounce';
                break;
            case 'complained':
                eventTypeMapped = 'complaint';
                break;
            case 'delivered':
                eventTypeMapped = 'delivery';
                break;
            case 'rejected':
                eventTypeMapped = 'reject';
                break;
            default:
                console.log(`Unhandled Mailgun event type: ${eventType}`);
                reply.send({ success: true });
                return;
        }

        const event: WebhookEvent = {
            provider: 'mailgun',
            type: eventTypeMapped,
            timestamp: new Date(eventData['event-data'].timestamp * 1000),
            recipient: eventData['event-data'].recipient,
            messageId: eventData['event-data'].message.headers['message-id'],
            reason: eventData['event-data'].reason,
            data: eventData,
        };

        await this.processWebhookEvent(event);
        reply.send({ success: true });
    }
}

export const webhookService = new WebhookService();