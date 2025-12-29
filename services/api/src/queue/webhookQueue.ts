import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis';

export const WEBHOOK_QUEUE_NAME = 'webhook-delivery';

export const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
    connection: redisConfig,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
});
