import { Worker, Job } from 'bullmq';
import { redisConfig } from './config/redis';
import { EMAIL_QUEUE_NAME } from './queue/emailQueue';
import { simpleParser, AddressObject, Attachment, ParsedMail } from 'mailparser';
import { promises as fs } from 'fs';
import path from 'path';
import { appConfig } from './config';
import { prisma } from './lib/prisma';
import { evaluateRules } from './lib/rules';
import { headersToObject } from './utils/headers';
import { generateToken } from './utils/token';
import { storageService } from './services/storage';
import { checkSpam, shouldRejectEmail, formatSpamSymbols } from './services/spamFilter';
import { scanBuffer, hasVirus, getDetectedViruses } from './services/virusScanner';
import { syncMessageToMaildir } from './services/maildirSync';
import { processFiltersForMessage } from './services/emailFilters';
import { notifyNewEmail, notifyInboxTelegramSubscribers } from './services/telegram';
import { forwardMessageIfMatched } from './services/emailForwarder';
import { triggerWebhook } from './services/webhookService';
import { anonymizeIp } from './utils/ip-anonymizer';
import { sanitizeHtml, sanitizeHeaders } from './utils/email-sanitizer';
import { evaluateMessage as evaluateVisibility, type EmailData } from './services/visibility-engine';
import { realtimeEvents } from './services/realtime-events';
import { pushNotification } from './services/push-notification';

type Logger = {
    info: (obj: Record<string, unknown> | string, msg?: string) => void;
    warn: (obj: Record<string, unknown> | string, msg?: string) => void;
    error: (obj: Record<string, unknown> | string, msg?: string) => void;
};

// Helper function to create a logger (since the app one might not be easily injectable here without dependency injection refactor)
// For now we will rely on a passed logger or create a simple one if running standalone.
// Actually, we can pass a logger instance if we run this inside index.ts

const ensureDomainAndInbox = async (address: string) => {
    const [localPart, domainName] = address.split("@");
    if (!localPart || !domainName) {
        throw new Error(`Invalid recipient ${address}`);
    }

    let domain = await prisma.domain.findUnique({ where: { name: domainName } });
    if (!domain) {
        if (!appConfig.allowAutoDomainCreation) {
            throw new Error(`Domain ${domainName} not registered`);
        }
        domain = await prisma.domain.create({
            data: { name: domainName, verificationToken: generateToken() },
        });
    }

    let inbox = await prisma.inbox.findUnique({
        where: { domainId_localPart: { domainId: domain.id, localPart } },
    });

    if (!inbox) {
        inbox = await prisma.inbox.create({
            data: { domainId: domain.id, localPart },
        });
    } else if (inbox.deletedAt) {
        inbox = await prisma.inbox.update({ where: { id: inbox.id }, data: { deletedAt: null, expiresAt: null } });
    }

    return { domain, inbox };
};

const persistAttachments = async (messageId: string, inboxId: string, attachments: Attachment[], logger: Logger) => {
    const saved = [];

    // Scan all attachments for viruses first
    const attachmentsToScan = attachments.filter(a => a.content && a.content.length > 0).map(a => ({
        id: a.checksum || a.filename || 'unknown',
        buffer: a.content,
        filename: a.filename ?? 'attachment.bin'
    }));

    if (attachmentsToScan.length > 0) {
        const scanResults = await Promise.all(
            attachmentsToScan.map(async ({ id, buffer, filename }) => ({
                id,
                filename,
                result: await scanBuffer(buffer)
            }))
        );

        if (hasVirus(scanResults)) {
            const detected = getDetectedViruses(scanResults);
            logger.warn({ detected }, 'Virus detected in attachments');
            throw new Error(`Virus detected: ${detected.map(d => `${d.filename}: ${d.virus}`).join(', ')}`);
        }
    }

    for (const attachment of attachments ?? []) {
        if (attachment.size && attachment.size > appConfig.maxAttachmentBytes) {
            throw new Error(`Attachment too large: ${attachment.filename ?? "unknown"}`);
        }
        const mime = (attachment.contentType ?? "").toLowerCase();
        const extension = (attachment.filename?.split(".").pop() ?? "").toLowerCase();
        const mimeAllowed = appConfig.allowedAttachmentMimePrefixes.some((prefix) => mime.startsWith(prefix));
        const extAllowed = extension ? appConfig.allowedAttachmentExtensions.includes(extension) : false;
        if (appConfig.allowedAttachmentMimePrefixes.length && !(mimeAllowed || extAllowed)) {
            throw new Error(`Attachment type not allowed: ${attachment.filename ?? mime}`);
        }
        const storageKey = path.join(inboxId, messageId, attachment.filename ?? "attachment.bin");

        await storageService.save(storageKey, attachment.content, attachment.contentType);

        const record = await prisma.attachment.create({
            data: {
                messageId,
                filename: attachment.filename ?? "attachment.bin",
                mimeType: attachment.contentType,
                size: attachment.size ?? null,
                storageKey,
            },
        });
        saved.push(record);
    }
    return saved;
};

const addressToText = (address?: AddressObject | AddressObject[]) => {
    if (!address) return undefined;
    if (Array.isArray(address)) return address.map((a) => a.text).join(", ");
    return address.text;
};

const enforceRateLimits = async (args: { inboxId: string; domainName: string; sourceIp?: string }) => {
    const windowStart = new Date(Date.now() - appConfig.smtpRateLimit.windowMinutes * 60 * 1000);
    const [ipCount, domainCount, inboxCount] = await Promise.all([
        args.sourceIp
            ? prisma.message.count({
                where: { sourceIp: args.sourceIp, receivedAt: { gt: windowStart }, deletedAt: null },
            })
            : Promise.resolve(0),
        prisma.message.count({
            where: { inbox: { domain: { name: args.domainName } }, receivedAt: { gt: windowStart }, deletedAt: null },
        }),
        prisma.message.count({
            where: { inboxId: args.inboxId, receivedAt: { gt: windowStart }, deletedAt: null },
        }),
    ]);

    if (args.sourceIp && ipCount >= appConfig.smtpRateLimit.perIp) {
        throw new Error("Rate limit exceeded (source IP)");
    }
    if (domainCount >= appConfig.smtpRateLimit.perDomain) {
        throw new Error("Rate limit exceeded (domain)");
    }
    if (inboxCount >= appConfig.smtpRateLimit.perInbox) {
        throw new Error("Rate limit exceeded (inbox)");
    }
};

interface EmailJobData {
    rawPath: string;
    envelope: {
        rcptTo: { address: string }[];
        remoteAddress?: string;
    };
}

export const setupEmailWorker = (logger: Logger) => {
    const worker = new Worker<EmailJobData>(
        EMAIL_QUEUE_NAME,
        async (job: Job<EmailJobData>) => {
            const { rawPath, envelope } = job.data;
            logger.info({ jobId: job.id, rawPath }, "processing email job");

            try {
                const rawContent = await fs.readFile(rawPath);
                const mail: ParsedMail = await simpleParser(rawContent);

                const recipients = envelope.rcptTo.map((r) => r.address).filter(Boolean) ?? [];
                if (recipients.length === 0) {
                    throw new Error("No recipients found");
                }

                const primaryRecipient = recipients[0]!;
                const [localPart, recipientDomain] = primaryRecipient.split("@");
                if (!localPart || !recipientDomain) {
                    throw new Error(`Invalid recipient ${primaryRecipient}`);
                }

                const rawHtmlBody = typeof mail.html === "string" ? mail.html : "";
                const textBody = mail.text ?? "";

                // Sanitize HTML to remove tracking pixels and privacy-invasive content
                const sanitizeResult = sanitizeHtml(rawHtmlBody, { removeTrackingPixels: true, rewriteTrackingLinks: true });
                const htmlBody = sanitizeResult.html;
                if (sanitizeResult.trackingPixelsRemoved > 0 || sanitizeResult.linksRewritten > 0) {
                    logger.info({
                        trackingPixelsRemoved: sanitizeResult.trackingPixelsRemoved,
                        linksRewritten: sanitizeResult.linksRewritten
                    }, 'email sanitized for privacy');
                }

                const toAddress = addressToText(mail.to) ?? primaryRecipient;
                const fromAddress = addressToText(mail.from as AddressObject | AddressObject[] | undefined);
                const sourceIp = envelope.remoteAddress;

                // Blocked sender domains
                const senderDomain = fromAddress?.split("@")[1]?.toLowerCase();
                if (senderDomain && appConfig.blockedSenderDomains.includes(senderDomain)) {
                    throw new Error(`Sender domain blocked: ${senderDomain}`);
                }

                const ruleResult = await evaluateRules({
                    senderDomain,
                    senderEmail: fromAddress?.toLowerCase(),
                    recipientDomain,
                    recipientInbox: `${localPart}@${recipientDomain}`,
                    sourceIp,
                });
                if (ruleResult.action === "BLOCK") {
                    throw new Error(`Blocked by rule ${ruleResult.rule.scope}:${ruleResult.rule.value}`);
                }

                const { inbox, domain } = await ensureDomainAndInbox(primaryRecipient);
                await enforceRateLimits({ inboxId: inbox.id, domainName: domain.name, sourceIp });

                // Quota checks
                const inboxMessageCount = await prisma.message.count({ where: { inboxId: inbox.id, deletedAt: null } });
                if (inboxMessageCount >= appConfig.quotaMessagesPerInbox) {
                    throw new Error("Inbox quota exceeded");
                }
                const domainMessageCount = await prisma.message.count({
                    where: { inbox: { domainId: inbox.domainId }, deletedAt: null },
                });
                if (domainMessageCount >= appConfig.quotaMessagesPerDomain) {
                    throw new Error("Domain quota exceeded");
                }

                // Spam check using Rspamd
                const spamResult = await checkSpam(rawContent, sourceIp);
                logger.info({
                    spamScore: spamResult.score,
                    action: spamResult.action,
                    spf: spamResult.spf,
                    dkim: spamResult.dkim,
                    dmarc: spamResult.dmarc,
                    symbols: formatSpamSymbols(spamResult)
                }, 'spam check result');

                if (shouldRejectEmail(spamResult)) {
                    logger.warn({ spamResult }, 'Rejecting spam email');
                    throw new Error(`Email rejected as spam (score: ${spamResult.score})`);
                }

                const message = await prisma.message.create({
                    data: {
                        inboxId: inbox.id,
                        messageId: mail.messageId ?? generateToken(),
                        fromAddress,
                        toAddress,
                        subject: mail.subject ?? "",
                        receivedAt: new Date(),
                        textBody,
                        htmlBody,
                        headers: sanitizeHeaders(headersToObject(mail.headers as Map<string, string | string[] | undefined>)),
                        spamScore: spamResult.score,
                        spfResult: spamResult.spf,
                        dkimResult: spamResult.dkim,
                        dmarcResult: spamResult.dmarc,
                        size: rawContent.length,
                        sourceIp: anonymizeIp(sourceIp),
                    },
                });

                await persistAttachments(message.id, inbox.id, mail.attachments, logger);

                // Sync message to Maildir for IMAP access
                try {
                    const messageWithRelations = await prisma.message.findUnique({
                        where: { id: message.id },
                        include: { inbox: { include: { domain: true } } },
                    });
                    if (messageWithRelations) {
                        await syncMessageToMaildir(messageWithRelations as any);
                        logger.info({ messageId: message.id }, 'synced message to Maildir');

                        // Release 2: Telegram Notification
                        try {
                            if (messageWithRelations.inbox.ownerId) {
                                await notifyNewEmail(messageWithRelations.inbox.ownerId, messageWithRelations as any);
                            }
                        } catch (telegramErr) {
                            logger.warn({ err: telegramErr }, 'failed to send Telegram notification');
                        }

                        // Release 2b: Per-Inbox Telegram Notifications (with visibility check)
                        try {
                            const inboxEmail = `${messageWithRelations.inbox.localPart}@${messageWithRelations.inbox.domain.name}`;

                            // Check visibility rules before sending Telegram notification
                            const emailDataForVisibility: EmailData = {
                                fromAddress: fromAddress ?? null,
                                toAddress: toAddress ?? null,
                                subject: message.subject,
                                textBody,
                                htmlBody,
                                headers: message.headers as Record<string, string> | null,
                                size: message.size,
                                spamScore: message.spamScore,
                                hasAttachment: (messageWithRelations as any).attachments?.length > 0 || false,
                            };

                            const visibilityResult = await evaluateVisibility(messageWithRelations.inbox.id, emailDataForVisibility);

                            // Only send notification if email is visible (not hidden)
                            if (visibilityResult.action !== 'HIDDEN') {
                                await notifyInboxTelegramSubscribers(inboxEmail, {
                                    id: message.id,
                                    fromAddress: fromAddress ?? null,
                                    subject: message.subject,
                                    textBody,
                                });
                                logger.info({ messageId: message.id, visibility: visibilityResult.action }, 'sent inbox Telegram notification');
                            } else {
                                logger.info({ messageId: message.id, reason: visibilityResult.reason }, 'skipped Telegram notification - message hidden by visibility rules');
                            }
                        } catch (inboxTelegramErr) {
                            logger.warn({ err: inboxTelegramErr }, 'failed to send inbox Telegram notifications');
                        }

                        // Release 3: Email Forwarding
                        try {
                            await forwardMessageIfMatched(messageWithRelations as any);
                        } catch (forwardErr) {
                            logger.warn({ err: forwardErr }, 'failed to forward email');
                        }

                        // Release 4: Webhooks
                        try {
                            if (messageWithRelations.inbox.ownerId) {
                                await triggerWebhook(messageWithRelations.inbox.ownerId, 'email.received', {
                                    id: message.id,
                                    inboxId: message.inboxId,
                                    from: fromAddress,
                                    to: toAddress,
                                    subject: message.subject,
                                    receivedAt: message.receivedAt,
                                    size: message.size,
                                    spf: spamResult.spf,
                                    dkim: spamResult.dkim,
                                    dmarc: spamResult.dmarc,
                                    spamScore: spamResult.score,
                                });
                            }
                        } catch (webhookErr) {
                            logger.warn({ err: webhookErr }, 'failed to trigger webhook');
                        }

                        // Realtime WebSocket/SSE notification
                        try {
                            if (messageWithRelations.inbox.ownerId) {
                                await realtimeEvents.publishEmailNew(
                                    messageWithRelations.inbox.ownerId,
                                    {
                                        inboxId: inbox.id,
                                        messageId: message.id,
                                        from: fromAddress ?? null,
                                        subject: message.subject ?? null,
                                        receivedAt: message.receivedAt.toISOString(),
                                        spf: spamResult.spf,
                                        dkim: spamResult.dkim,
                                        dmarc: spamResult.dmarc,
                                    }
                                );
                                logger.info({ messageId: message.id }, 'published realtime email.new event');
                            }
                        } catch (realtimeErr) {
                            logger.warn({ err: realtimeErr }, 'failed to publish realtime event');
                        }

                        // Browser Push notification
                        try {
                            if (messageWithRelations.inbox.ownerId) {
                                await pushNotification.sendEmailNotification(
                                    messageWithRelations.inbox.ownerId,
                                    {
                                        from: fromAddress ?? null,
                                        subject: message.subject ?? null,
                                        inboxId: inbox.id,
                                        spf: spamResult.spf,
                                        dkim: spamResult.dkim,
                                        dmarc: spamResult.dmarc,
                                    }
                                );
                                logger.info({ messageId: message.id }, 'sent browser push notification');
                            }
                        } catch (pushErr) {
                            logger.warn({ err: pushErr }, 'failed to send push notification');
                        }
                    }
                } catch (maildirErr) {
                    logger.warn({ err: maildirErr }, 'failed to sync message to Maildir');
                }

                logger.info({ inboxId: inbox.id, messageId: message.id, spamScore: spamResult.score, spf: spamResult.spf, dkim: spamResult.dkim, dmarc: spamResult.dmarc }, "stored inbound email via worker");

                // Process email filters
                try {
                    const filterResult = await processFiltersForMessage(
                        message.id,
                        inbox.id,
                        {
                            fromAddress,
                            toAddress,
                            subject: mail.subject ?? null,
                            textBody,
                            htmlBody,
                            hasAttachment: (mail.attachments?.length ?? 0) > 0,
                        }
                    );
                    if (filterResult.filtersMatched > 0) {
                        logger.info({
                            messageId: message.id,
                            filtersMatched: filterResult.filtersMatched,
                            actionsExecuted: filterResult.actionsExecuted,
                            deleted: filterResult.deleted
                        }, 'email filters processed');
                    }
                } catch (filterErr) {
                    logger.warn({ err: filterErr }, 'failed to process email filters');
                }

                // Clean up raw file
                await fs.unlink(rawPath).catch(e => logger.warn({ err: e }, "failed to delete raw file"));

            } catch (err) {
                logger.error({ err, jobId: job.id }, "failed to process email job");
                throw err;
            }
        },
        {
            connection: redisConfig,
        }
    );

    return worker;
};
