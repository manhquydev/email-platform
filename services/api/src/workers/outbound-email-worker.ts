import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis';
import { OUTBOUND_QUEUE_NAME, OutboundEmailJobData } from '../queue/outboundQueue';
import { prisma } from '../lib/prisma';
import { outboundService } from '../services/outbound';
import { recordAudit } from '../utils/audit';

export const setupOutboundEmailWorker = (logger: { info: any; error: any; warn: any }) => {
    const worker = new Worker<OutboundEmailJobData>(
        OUTBOUND_QUEUE_NAME,
        async (job: Job<OutboundEmailJobData>) => {
            const { outboundMessageId, userId, from, to, subject, text, html, attachments } = job.data;

            logger.info({ jobId: job.id, outboundMessageId, to }, 'Processing outbound email job');

            // Update status to SENDING
            await prisma.outboundMessage.update({
                where: { id: outboundMessageId },
                data: {
                    status: 'SENDING',
                    attempts: { increment: 1 },
                    lastAttemptAt: new Date(),
                }
            });

            try {
                const info = await outboundService.sendEmail(from, to, subject, text, html, attachments);

                // Update to SENT
                await prisma.outboundMessage.update({
                    where: { id: outboundMessageId },
                    data: {
                    messageId: info.messageId || `sent-${Date.now()}`,
                        status: 'SENT',
                        sentAt: new Date(),
                    }
                });

                // Record audit log
                await recordAudit(userId, 'EMAIL_SENT', {
                    msgId: info.messageId,
                    outboundMessageId,
                    from,
                    to
                });

                logger.info({ jobId: job.id, outboundMessageId, messageId: info.messageId }, 'Outbound email sent successfully');

                return { success: true, messageId: info.messageId };
            } catch (err: any) {
                logger.error({ jobId: job.id, outboundMessageId, err: err.message }, 'Failed to send outbound email');

                // Update to FAILED
                await prisma.outboundMessage.update({
                    where: { id: outboundMessageId },
                    data: {
                        status: 'FAILED',
                        bounceMessage: err.message,
                    }
                }).catch(() => { });

                throw err; // Rethrow to trigger BullMQ retry
            }
        },
        {
            connection: redisConfig,
            concurrency: 5,
        }
    );

    worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, err: err.message }, 'Outbound email job failed');
    });

    worker.on('completed', (job) => {
        logger.info({ jobId: job.id }, 'Outbound email job completed');
    });

    return worker;
};
