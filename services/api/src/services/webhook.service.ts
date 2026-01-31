
import { prisma } from "../lib/prisma";
import { BounceType, OutboundStatus } from "@prisma/client";

export type WebhookEvent = {
    provider: string; // 'ses', 'mailgun', 'google'
    messageId: string; // Internal or Provider Message ID
    eventType: 'DELIVERY' | 'BOUNCE' | 'COMPLAINT';
    timestamp: Date;
    meta?: any;
    // Bounce/Complaint details
    bounceType?: BounceType;
    bounceSubType?: string;
    bounceReason?: string;
    complaintType?: string;
};

export class WebhookService {
    /**
     * Process a normalized webhook event
     */
    async processEvent(event: WebhookEvent) {
        console.log(`[WebhookService] Processing ${event.eventType} from ${event.provider} for msg ${event.messageId}`);

        // Find the message
        // Note: Providers often return their own Message-ID (espMessageId).
        // Some might return our custom header ID if we set it (messageId).
        // We'll try to find by espMessageId first, then by internal messageId.

        const message = await prisma.outboundMessage.findFirst({
            where: {
                OR: [
                    { espMessageId: event.messageId },
                    { messageId: event.messageId } // In case we passed our ID and they returned it
                ]
            }
        });

        if (!message) {
            console.warn(`[WebhookService] Message not found for ID: ${event.messageId}`);
            return;
        }

        const updateData: any = {
            metadata: {
                ...(message.metadata as object || {}),
                lastEvent: event
            }
        };

        switch (event.eventType) {
            case 'DELIVERY':
                updateData.status = OutboundStatus.DELIVERED;
                updateData.deliveredAt = event.timestamp;
                break;

            case 'BOUNCE':
                updateData.status = OutboundStatus.BOUNCED;
                updateData.bouncedAt = event.timestamp;
                updateData.bounceType = event.bounceType || BounceType.HARD;
                updateData.bounceSubType = event.bounceSubType;
                updateData.bounceMessage = event.bounceReason;

                // Add to suppression list if Hard Bounce
                if (event.bounceType === BounceType.HARD) {
                    await this.addToSuppressionList(message.toAddress, 'hard_bounce', message.id);
                }
                break;

            case 'COMPLAINT':
                updateData.status = OutboundStatus.COMPLAINED;
                updateData.complaintType = event.complaintType;

                // Always add complaints to suppression list
                await this.addToSuppressionList(message.toAddress, 'complaint', message.id);
                break;
        }

        await prisma.outboundMessage.update({
            where: { id: message.id },
            data: updateData
        });

        console.log(`[WebhookService] Updated message ${message.id} status to ${updateData.status}`);
    }

    private async addToSuppressionList(email: string, reason: string, sourceId: string) {
        try {
            await prisma.bounceSuppressionList.upsert({
                where: { email },
                update: {
                    reason,
                    sourceId,
                    createdAt: new Date() // Refresh timestamp
                },
                create: {
                    email,
                    reason,
                    sourceId
                }
            });
            console.log(`[WebhookService] Added ${email} to suppression list (${reason})`);
        } catch (error) {
            console.error(`[WebhookService] Failed to add to suppression list:`, error);
        }
    }
}

export const webhookService = new WebhookService();
