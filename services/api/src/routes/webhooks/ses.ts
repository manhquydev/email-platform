
import { FastifyRequest, FastifyReply } from "fastify";
import { webhookService } from "../../services/webhook.service";
import { BounceType } from "@prisma/client";
import https from "https";
import MessageValidator from "sns-validator";

// SNS message validator for cryptographic signature verification
const snsValidator = new MessageValidator();

// Promisified SNS validation wrapper
function validateSnsMessage(message: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    snsValidator.validate(message, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

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

    // Validate SNS Signature using sns-validator package
    async validateSignature(payload: SnsNotification): Promise<boolean> {
        try {
            await validateSnsMessage(payload);
            return true;
        } catch (err) {
            console.error("[SES-Webhook] SNS signature validation failed:", err);
            return false;
        }
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

        // Validate SNS signature for all message types
        const isValid = await this.validateSignature(snsMessage);
        if (!isValid) {
            console.error("[SES-Webhook] Rejected message with invalid signature");
            return reply.status(401).send({ error: "Invalid SNS signature" });
        }

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
