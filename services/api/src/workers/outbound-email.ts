import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis';
import { prisma } from '../lib/prisma';
import { outboundService } from '../services/outbound';
import { recordAudit } from '../utils/audit';
import { OUTBOUND_EMAIL_QUEUE_NAME } from '../lib/queues/outbound';

export interface OutboundEmailJobData {
  outboundMessageId: string;
  userId: string;
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
  headers?: Record<string, string>;
}

export const setupOutboundEmailWorker = (log: any) => {
  const worker = new Worker<OutboundEmailJobData>(
    OUTBOUND_EMAIL_QUEUE_NAME,
    async (job: Job<OutboundEmailJobData>) => {
      const { outboundMessageId, userId, from, to, subject, text, html, attachments, headers } = job.data;

      log.info({ jobId: job.id, outboundMessageId }, 'Processing outbound email job');

      try {
        // 1. Update status to SENDING (if not already)
        await prisma.outboundMessage.update({
          where: { id: outboundMessageId },
          data: {
            status: 'SENDING',
            lastAttemptAt: new Date(),
            attempts: { increment: 1 }
          }
        });

        // 2. Send Email via Service
        // Rehydrate attachments (convert Buffer-like objects back to Buffer)
        const sanitizedAttachments = attachments?.map((att: any) => {
          if (att.content && att.content.type === 'Buffer' && Array.isArray(att.content.data)) {
            return { ...att, content: Buffer.from(att.content.data) };
          }
          return att;
        });

        const info = await outboundService.sendEmail(
          from,
          to,
          subject,
          text,
          html,
          sanitizedAttachments,
          { headers }
        );

        // 3. Update status to SENT
        await prisma.outboundMessage.update({
          where: { id: outboundMessageId },
          data: {
            messageId: info.messageId,
            status: 'SENT',
            sentAt: new Date(),
          }
        });

        // 4. Record Audit Log
        await recordAudit(userId, "EMAIL_SENT", {
          msgId: info.messageId,
          outboundMessageId,
          from,
          to,
          jobId: job.id
        });

        log.info({ jobId: job.id, messageId: info.messageId }, 'Outbound email sent successfully');
        return { ok: true, messageId: info.messageId };

      } catch (err: any) {
        log.error({ jobId: job.id, err }, 'Failed to process outbound email job');

        // Update status to FAILED (temporary, BullMQ might retry)
        // If it's the final attempt, the status remains FAILED (or we can use 'failed' event listener)
        // For now, we update the bounce message on every failure
        await prisma.outboundMessage.update({
          where: { id: outboundMessageId },
          data: {
            // Only set to FAILED if we are out of attempts?
            // Actually, let's keep it as SENDING/QUEUED if it's going to retry?
            // The job attempts handling is internal to BullMQ.
            // We can update the status to FAILED here, and if it retries, it goes back to SENDING.
            // But if we want to be strict, we might only set FAILED on the worker 'failed' event.
            // However, updating the error message is useful.
            status: 'FAILED',
            bounceMessage: err.message
          }
        }).catch(() => { });

        throw err; // Rethrow so BullMQ knows it failed
      }
    },
    {
      connection: redisConfig,
      concurrency: 5, // Process up to 5 emails in parallel
      limiter: {
        max: 10,
        duration: 1000 // Rate limit: 10 emails per second per worker instance
      }
    }
  );

  worker.on('failed', async (job, err) => {
    log.error({ jobId: job?.id, err }, 'Outbound email worker job failed');
  });

  return worker;
};
