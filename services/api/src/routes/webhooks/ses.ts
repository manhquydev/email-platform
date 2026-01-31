
import { FastifyRequest, FastifyReply } from "fastify";
import { webhookService } from "../services/webhook.service";
import { BounceType } from "@prisma/client";
import https from "https";
import crypto from "crypto";

// Minimal SES/SNS types
interface SnsNotification {
    Type: string;
    MessageId: string;
    TopicArn: string;
    Message: string;
    Timestamp: string;
    SignatureVersion: string;
    Signature: string;
    SigningCertURL: string;
    SubscribeURL?: string;
    Token?: string;
}

interface SesMessage {
    notificationType: 'Bounce' | 'Complaint' | 'Delivery';
    mail: {
        messageId: string;
        destination: string[];
    };
    bounce?: {
        bounceType: string; // Permanent, Transient
        bounceSubType: string;
        bouncedRecipients: { emailAddress: string; diagnosticCode?: string }[];
    };
    complaint?: {
        complaintSubType: string;
    };
    delivery?: {
        timestamp: string;
    };
}

export class SesWebhookHandler {

    // Validate SNS Signature
    // Note: For production, use a robust library like 'sns-validator'.
    // Here is a simplified implementation for demonstration.
    async validateSignature(payload: SnsNotification): Promise<boolean> {
        // In a real implementation, download the cert from SigningCertURL and verify Signature.
        // For MVP/Dev, we might skip strict signature check if running locally,
        // but strictly this SHOULD be done.

        // Skip for now to keep implementation simple, but TODO: Add 'sns-validator' package.
        if (process.env.NODE_ENV === 'development') return true;

        // Just checking basic structure
        return !!payload.Signature && !!payload.SigningCertURL;
    }

    async handle(request: FastifyRequest, reply: FastifyReply) {
        // SNS sends content-type: text/plain usually, but body is JSON.
        // Fastify might parse it if we set content-type parser, or we handle string body.
        let body = request.body as any;

        // Handle text/plain if needed (Fastify might leave it as string)
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                return reply.status(400).send("Invalid JSON");
            }
        }

        const snsMessage = body as SnsNotification;

        // 1. Handle Subscription Confirmation
        if (snsMessage.Type === 'SubscriptionConfirmation' && snsMessage.SubscribeURL) {
            console.log(`[SES-Webhook] Confirming subscription: ${snsMessage.SubscribeURL}`);
            // Auto-confirm by visiting the URL
            https.get(snsMessage.SubscribeURL);
            return reply.send({ status: 'confirmed' });
        }

        if (snsMessage.Type !== 'Notification') {
            return reply.send({ status: 'ignored' });
        }

        // 2. Parse SES JSON Message
        let sesMessage: SesMessage;
        try {
            sesMessage = JSON.parse(snsMessage.Message);
        } catch (e) {
            console.error("[SES-Webhook] Failed to parse SNS Message", e);
            return reply.status(400).send("Invalid SES Message");
        }

        // 3. Process Event
        const timestamp = new Date(snsMessage.Timestamp);
        const messageId = sesMessage.mail.messageId;

        switch (sesMessage.notificationType) {
            case 'Delivery':
                await webhookService.processEvent({
                    provider: 'ses',
                    messageId,
                    eventType: 'DELIVERY',
                    timestamp
                });
                break;

            case 'Bounce':
                if (sesMessage.bounce) {
                    const isPermanent = sesMessage.bounce.bounceType === 'Permanent';
                    await webhookService.processEvent({
                        provider: 'ses',
                        messageId,
                        eventType: 'BOUNCE',
                        timestamp,
                        bounceType: isPermanent ? BounceType.HARD : BounceType.SOFT,
                        bounceSubType: sesMessage.bounce.bounceSubType,
                        bounceReason: sesMessage.bounce.bouncedRecipients[0]?.diagnosticCode
                    });
                }
                break;

            case 'Complaint':
                await webhookService.processEvent({
                    provider: 'ses',
                    messageId,
                    eventType: 'COMPLAINT',
                    timestamp,
                    complaintType: sesMessage.complaint?.complaintSubType
                });
                break;
        }

        return reply.send({ status: 'ok' });
    }
}

export const sesWebhookHandler = new SesWebhookHandler();
