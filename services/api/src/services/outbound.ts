import nodemailer from "nodemailer";
import { appConfig } from "../config";

export class OutboundService {
    private transporter: nodemailer.Transporter;

    constructor() {
        const smtpHost = process.env.OUTBOUND_SMTP_HOST;
        const smtpPort = Number(process.env.OUTBOUND_SMTP_PORT) || 587;
        const smtpUser = process.env.OUTBOUND_SMTP_USER;
        const smtpPass = process.env.OUTBOUND_SMTP_PASS;
        const smtpSecure = process.env.OUTBOUND_SMTP_SECURE === "true";

        // Configure transporter - support both authenticated and local SMTP
        const transportConfig: nodemailer.TransportOptions = {
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
        } as any;

        // Only add auth if credentials are provided
        if (smtpUser && smtpPass) {
            (transportConfig as any).auth = {
                user: smtpUser,
                pass: smtpPass,
            };
        }

        this.transporter = nodemailer.createTransport(transportConfig);
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
        if (!process.env.OUTBOUND_SMTP_HOST) {
            throw new Error("Outbound email is not configured (OUTBOUND_SMTP_HOST missing)");
        }

        // Get mail configuration from environment
        const mailFromAddress = process.env.MAIL_FROM_ADDRESS || from;
        const mailDomain = process.env.MAIL_DOMAIN || "localhost";

        // Allow overriding sender name
        const mailFromName = options?.senderName || process.env.MAIL_FROM_NAME || "Ephemera";

        // Generate proper message ID
        const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${mailDomain}>`;

        const info = await this.transporter.sendMail({
            from: `"${mailFromName}" <${mailFromAddress}>`,
            to,
            replyTo: options?.replyTo,
            subject,
            text,
            html,
            attachments,
            messageId,
            headers: {
                'X-Mailer': 'Ephemera',
                'X-Priority': '3',
                'List-Unsubscribe': `<mailto:unsubscribe@${mailDomain}>`,
                ...options?.headers // Merge custom headers
            },
        });

        return info;
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
     * Verify SMTP connection is working
     */
    async verifyConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            return true;
        } catch (error) {
            console.error("SMTP connection verification failed:", error);
            return false;
        }
    }
}

export const outboundService = new OutboundService();
