
import { appConfig } from "../config";
import { prisma } from "../lib/prisma";
import { decrypt } from "../utils/encryption";
import { sanitizeEmailHeader, sanitizeEmailSubject } from "../utils/input-sanitizer";
import { EmailProviderFactory } from "./email-providers/factory";
import { EmailProvider } from "./email-providers/interface";

export class OutboundService {
    private provider: EmailProvider;

    constructor() {
        this.provider = EmailProviderFactory.getProvider();
        console.log("[OutboundService] Initialized with provider:", process.env.OUTBOUND_PROVIDER || "smtp");
    }

    async sendEmail(
        from: string,
        to: string,
        subject: string,
        text?: string,
        html?: string,
        attachments?: any[],
        options?: {
            replyTo?: string;
            headers?: Record<string, string>;
            senderName?: string;
        }
    ) {
        // SECURITY: Sanitize email headers to prevent header injection attacks
        const safeSubject = sanitizeEmailSubject(subject);
        const safeTo = sanitizeEmailHeader(to);
        const safeFrom = sanitizeEmailHeader(from);
        const safeReplyTo = options?.replyTo ? sanitizeEmailHeader(options.replyTo) : undefined;
        const safeSenderName = options?.senderName ? sanitizeEmailHeader(options.senderName) : undefined;

        // Sanitize custom headers if provided
        const safeHeaders: Record<string, string> = {};
        if (options?.headers) {
            for (const [key, value] of Object.entries(options.headers)) {
                safeHeaders[sanitizeEmailHeader(key)] = sanitizeEmailHeader(value);
            }
        }

        // Get mail configuration from environment
        const mailFromAddress = process.env.MAIL_FROM_ADDRESS || safeFrom;

        // Fetch DKIM configuration for the domain
        let dkimOptions = undefined;
        try {
            const domainName = mailFromAddress.split("@")[1];
            if (domainName) {
                const domainRecord = await prisma.domain.findUnique({
                    where: { name: domainName },
                    include: { dkim: true }
                });

                if (domainRecord?.dkim) {
                    dkimOptions = {
                        domainName: domainRecord.name,
                        keySelector: domainRecord.dkim.selector,
                        privateKey: decrypt(domainRecord.dkim.privateKey)
                    };
                    console.log(`[OutboundService] Found DKIM config for ${domainName}`);
                }
            }
        } catch (dkimErr) {
            console.error("[OutboundService] Failed to fetch/decrypt DKIM config:", dkimErr);
            // Continue sending without DKIM if it fails
        }

        try {
            const result = await this.provider.sendEmail({
                from: mailFromAddress,
                to: safeTo,
                subject: safeSubject,
                text,
                html,
                attachments,
                replyTo: safeReplyTo,
                headers: safeHeaders,
                senderName: safeSenderName,
                dkim: dkimOptions
            });

            console.log(`[OutboundService] Email sent successfully via ${result.provider}. Message ID: ${result.messageId}`);
            return result;
        } catch (error: any) {
            console.error(`[OutboundService] Failed to send email to ${to}:`, error);
            throw new Error(`Email delivery failed: ${error.message}`);
        }
    }

    /**
     * Send verification email using professional template
     */
    async sendVerificationEmail(to: string, verificationUrl: string) {
        const { verificationEmailTemplate } = await import("./emailTemplates");
        const template = verificationEmailTemplate({
            verificationUrl,
            recipientEmail: to,
        });

        return this.sendEmail(
            appConfig.defaultAdminEmail,
            to,
            template.subject,
            template.text,
            template.html
        );
    }

    /**
     * Send welcome email after verification
     */
    async sendWelcomeEmail(to: string) {
        const { welcomeEmailTemplate } = await import("./emailTemplates");
        const template = welcomeEmailTemplate({
            recipientEmail: to,
        });

        return this.sendEmail(
            appConfig.defaultAdminEmail,
            to,
            template.subject,
            template.text,
            template.html
        );
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(to: string, resetUrl: string) {
        const { passwordResetEmailTemplate } = await import("./emailTemplates");
        const template = passwordResetEmailTemplate({
            resetUrl,
            recipientEmail: to,
        });

        return this.sendEmail(
            appConfig.defaultAdminEmail,
            to,
            template.subject,
            template.text,
            template.html
        );
    }

    /**
     * Send account locked email
     */
    async sendAccountLockedEmail(to: string) {
        const { accountLockedEmailTemplate } = await import("./emailTemplates");
        const template = accountLockedEmailTemplate({
            recipientEmail: to,
        });

        return this.sendEmail(
            appConfig.defaultAdminEmail,
            to,
            template.subject,
            template.text,
            template.html
        );
    }

    /**
     * Send magic login link email
     */
    async sendMagicLoginEmail(to: string, loginUrl: string) {
        const { magicLinkEmailTemplate } = await import("./emailTemplates");
        const template = magicLinkEmailTemplate({
            recipientEmail: to,
            loginUrl
        });

        return this.sendEmail(
            appConfig.defaultAdminEmail,
            to,
            template.subject,
            template.text,
            template.html
        );
    }

    /**
     * Verify connection
     */
    async verifyConnection(): Promise<boolean> {
        return this.provider.verifyConnection();
    }
}


export const outboundService = new OutboundService();
