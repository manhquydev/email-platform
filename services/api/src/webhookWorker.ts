import { Worker, Job } from 'bullmq';
import { redisConfig } from './config/redis';
import { WEBHOOK_QUEUE_NAME } from './queue/webhookQueue';
import { prisma } from './lib/prisma';
import { signPayload, WebhookPayload } from './services/webhookService';

interface WebhookJobData {
    webhookId: string;
    payload: WebhookPayload;
}

export const setupWebhookWorker = (logger: { info: any, error: any, warn: any }) => {
    const worker = new Worker<WebhookJobData>(
        WEBHOOK_QUEUE_NAME,
        async (job: Job<WebhookJobData>) => {
            const { webhookId, payload } = job.data;
            const startTime = Date.now();

            const webhook = await prisma.webhook.findUnique({
                where: { id: webhookId }
            });

            if (!webhook || !webhook.isActive) {
                logger.warn({ webhookId }, 'Webhook not found or inactive, skipping');
                return;
            }

            const payloadString = JSON.stringify(payload);
            const signature = signPayload(payloadString, webhook.secret);

            try {
                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Ephemera-Signature': signature,
                        'X-Ephemera-Event': payload.event,
                    },
                    body: payloadString,
                });

                const responseBody = await response.text();
                const duration = Date.now() - startTime;

                await prisma.webhookLog.create({
                    data: {
                        webhookId,
                        eventType: payload.event,
                        payload: payload as any,
                        statusCode: response.status,
                        responseBody: responseBody.substring(0, 1000), // Truncate long responses
                        duration,
                    }
                });

                if (!response.ok) {
                    throw new Error(`Webhook delivery failed with status ${response.status}`);
                }

                logger.info({ webhookId, event: payload.event, status: response.status }, 'Webhook delivered successfully');
            } catch (error) {
                const duration = Date.now() - startTime;
                await prisma.webhookLog.create({
                    data: {
                        webhookId,
                        eventType: payload.event,
                        payload: payload as any,
                        statusCode: (error as any).status || 0,
                        responseBody: (error as any).message,
                        duration,
                    }
                });

                logger.error({ webhookId, event: payload.event, err: error }, 'Webhook delivery error');
                throw error; // Rethrow to trigger BullMQ retry
            }
        },
        {
            connection: redisConfig,
        }
    );

    return worker;
};
