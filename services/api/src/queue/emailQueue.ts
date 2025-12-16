import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis';

export const EMAIL_QUEUE_NAME = 'email-ingest';

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
    connection: redisConfig,
});
