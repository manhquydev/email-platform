import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis';
import { prisma } from '../lib/prisma';
import { outboundService } from '../services/outbound';
import fs from 'fs/promises';
import { simpleParser } from 'mailparser';
import { DkimService } from '../services/dkim.service';
import { FolderService } from '../services/folder-service';
import { Message, User } from '@prisma/client';

export const EMAIL_QUEUE_NAME = 'email-ingest';

// Define the Queue here if not already imported or keep it in queue/emailQueue.ts
// We are implementing the worker logic here

interface OutboundJobData {
  rawPath: string;
  userId: string;
  envelope: {
    mailFrom: { address: string; args: boolean | string };
    rcptTo: { address: string; args: boolean | string }[];
  };
}

export const setupOutboundWorker = () => {
  const worker = new Worker(EMAIL_QUEUE_NAME, async (job: Job) => {
    if (job.name === 'outbound') {
      await processOutboundEmail(job.data as OutboundJobData);
    }
    // 'inbound' jobs are processed by existing worker or webhookWorker
  }, {
    connection: redisConfig,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000
    }
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  return worker;
};

async function processOutboundEmail(data: OutboundJobData) {
  const { rawPath, userId, envelope } = data;

  try {
    // 1. Read and parse email
    const rawContent = await fs.readFile(rawPath);
    const parsed = await simpleParser(rawContent);
    const fromAddress = envelope.mailFrom.address;
    const toAddresses = envelope.rcptTo.map(r => r.address);
    const subject = parsed.subject || '(No Subject)';
    const domainName = fromAddress.split('@')[1];

    // 2. Prepare OutboundMessage record
    // We create it with status QUEUED/SENDING
    const messageId = parsed.messageId || `<${Date.now()}.${Math.random().toString(36).substring(7)}@${domainName}>`;

    // Find inbox if applicable
    const inbox = await prisma.inbox.findFirst({
        where: {
            // approximation: find inbox matching from address
            localPart: fromAddress.split('@')[0],
            domain: { name: domainName }
        }
    });

    // Find domain
    const domain = await prisma.domain.findUnique({ where: { name: domainName } });

    // Ensure we have a domain record to link (if valid internal domain)
    // If user is sending from external domain (via alias), this might fail FKey.
    // Assuming for now user sends from our system domains or custom domains registered here.
    if (!domain) {
        throw new Error(`Domain ${domainName} not found in system`);
    }

    const outboundMsg = await prisma.outboundMessage.create({
      data: {
        userId,
        domainId: domain.id,
        inboxId: inbox?.id,
        fromAddress,
        toAddress: toAddresses.join(', '), // Storing as comma-separated for now
        subject,
        messageId,
        status: 'SENDING',
        attempts: 1,
      }
    });

    // 3. Send via OutboundService (Nodemailer)
    // OutboundService handles DKIM signing internally if domain has DKIM keys
    // We just pass the raw parameters or use parsed content

    // Note: OutboundService.sendEmail constructs a new email.
    // Since we have the raw EML from SMTP submission, we might want to send that directly
    // OR reconstruct it to ensure clean headers. Reconstructing is safer.

    await outboundService.sendEmail(
        fromAddress,
        toAddresses.join(', '),
        subject,
        parsed.text,
        parsed.html as string, // mailparser types might be slightly different
        parsed.attachments.map(a => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType
        })),
        {
            senderName: parsed.from?.value[0]?.name
            // replyTo, headers
        }
    );

    // 4. Update status to SENT
    await prisma.outboundMessage.update({
        where: { id: outboundMsg.id },
        data: {
            status: 'SENT',
            sentAt: new Date(),
            deliveredAt: new Date() // In SMTP relay, sent = handed off. Delivered is later.
        }
    });

    // 5. Append to Sent Folder
    // We need to store it as a Message in the inbox so it shows up in IMAP/Webmail
    if (inbox) {
        const sentFolder = await FolderService.ensureSpecialFolders(inbox.id).then(() =>
             prisma.folder.findFirst({ where: { inboxId: inbox.id, specialUse: '\\Sent' } })
        );

        if (sentFolder) {
            await prisma.message.create({
                data: {
                    inboxId: inbox.id,
                    folderId: sentFolder.id,
                    fromAddress,
                    toAddress: toAddresses.join(', '),
                    subject,
                    textBody: parsed.text,
                    htmlBody: parsed.html as string,
                    receivedAt: new Date(),
                    isRead: true, // Sent messages are read
                    size: rawContent.length,
                    messageId
                }
            });
        }
    }

  } catch (error) {
    console.error('Failed to process outbound email:', error);
    // TODO: Update OutboundMessage status to FAILED/BOUNCED
    throw error; // BullMQ will retry based on config
  } finally {
    // Cleanup raw file
    // await fs.unlink(rawPath).catch(() => {});
  }
}
