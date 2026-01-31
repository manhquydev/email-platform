import { Queue } from 'bullmq';
import { redisConfig } from '../../config/redis';

export const OUTBOUND_EMAIL_QUEUE_NAME = 'outbound-email';

export const outboundQueue = new Queue(OUTBOUND_EMAIL_QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false, // Keep failed jobs for inspection
  },
});
