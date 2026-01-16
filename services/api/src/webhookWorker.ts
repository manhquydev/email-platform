import { Worker, Job } from 'bullmq';
import { redisConfig } from './config/redis';
import { WEBHOOK_QUEUE_NAME } from './queue/webhookQueue';
import { prisma } from './lib/prisma';
import { signPayload, WebhookPayload } from './services/webhookService';

// SSRF Protection: Block internal network URLs
const isInternalUrl = (urlString: string): boolean => {
    try {
        const url = new URL(urlString);
        const hostname = url.hostname.toLowerCase();

        // Block localhost and loopback
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
            return true;
        }

        // Block private IP ranges
        const ipv4Parts = hostname.split('.');
        if (ipv4Parts.length === 4) {
            const first = parseInt(ipv4Parts[0], 10);
            const second = parseInt(ipv4Parts[1], 10);

            // 10.x.x.x
            if (first === 10) return true;
            // 172.16.x.x - 172.31.x.x
            if (first === 172 && second >= 16 && second <= 31) return true;
            // 192.168.x.x
            if (first === 192 && second === 168) return true;
            // 169.254.x.x (link-local)
            if (first === 169 && second === 254) return true;
        }

        // Block internal docker/kubernetes hostnames
        if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.svc.cluster.local')) {
            return true;
        }

        return false;
    } catch {
        return true; // Block invalid URLs
    }
};

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
                        'X-Ephemera-Signature': signature,
                        'X-Ephemera-Event': payload.event,
                        'X-Ephemera-Idempotency-Key': payload.idempotencyKey,
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
