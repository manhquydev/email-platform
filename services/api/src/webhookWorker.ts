import { Worker, Job } from 'bullmq';
import { redisConfig } from './config/redis';
import { WEBHOOK_QUEUE_NAME } from './queue/webhookQueue';
import { prisma } from './lib/prisma';
import { signPayload, WebhookPayload } from './services/webhookService';
import { isInternalUrl } from './utils/network';

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

            // SSRF Protection: Block requests to internal networks
            if (isInternalUrl(webhook.url)) {
                logger.warn({ webhookId, url: webhook.url }, 'Webhook URL blocked: internal network access not allowed');
                await prisma.webhookLog.create({
                    data: {
                        webhookId,
                        eventType: payload.event,
                        payload: payload as any,
                        statusCode: 0,
                        responseBody: 'SSRF Protection: Internal network URLs are not allowed',
                        duration: 0,
                    }
                });
                return;
            }

            const payloadString = JSON.stringify(payload);
            const signature = signPayload(payloadString, webhook.secret);

            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            try {
                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Ephemera-Event': payload.event,
                        'X-Ephemera-Delivery': payload.idempotencyKey,
                        'X-Ephemera-Signature': `sha256=${signature}`,
                        'X-Ephemera-Timestamp': payload.timestamp,
                        'User-Agent': 'Ephemera-Webhook/1.0',
                    },
                    body: payloadString,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

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
