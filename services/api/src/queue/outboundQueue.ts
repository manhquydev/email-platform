import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis';

export const OUTBOUND_QUEUE_NAME = 'outbound-email';

export interface OutboundEmailJobData {
    outboundMessageId: string;
    userId: string;
    domainId: string;
    inboxId?: string;
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}

export const outboundQueue = new Queue<OutboundEmailJobData>(OUTBOUND_QUEUE_NAME, {
    connection: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
});
