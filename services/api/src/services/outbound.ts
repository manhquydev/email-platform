import nodemailer from "nodemailer";
import { appConfig } from "../config";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export class OutboundService {
    private transporter: nodemailer.Transporter;
    private oauth2Client?: OAuth2Client;

    constructor() {
        const smtpHost = process.env.OUTBOUND_SMTP_HOST;
        const smtpPort = Number(process.env.OUTBOUND_SMTP_PORT) || 587;
        const smtpUser = process.env.OUTBOUND_SMTP_USER;
        const smtpPass = process.env.OUTBOUND_SMTP_PASS;
        const smtpSecure = process.env.OUTBOUND_SMTP_SECURE === "true";

        // Initialize OAuth2 Client if configured (for Gmail API fallback)
        if (appConfig.googleClientId && appConfig.googleClientSecret && appConfig.googleRefreshToken) {
            this.oauth2Client = new OAuth2Client(
                appConfig.googleClientId,
                appConfig.googleClientSecret
            );
            this.oauth2Client.setCredentials({
                refresh_token: appConfig.googleRefreshToken
            });
            console.log("[OutboundService] Google OAuth2 client initialized for Gmail API");
        }

        // Configure transporter - support both authenticated and local SMTP
        const transportConfig: nodemailer.TransportOptions = {
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure || smtpPort === 465, // Auto-enable SSL for port 465
        } as any;

        // Only add auth if credentials are provided
        if (smtpUser && smtpPass) {
            (transportConfig as any).auth = {
                user: smtpUser,
                pass: smtpPass,
            };
        }

        console.log(`[OutboundService] Initializing with host: ${smtpHost}, port: ${smtpPort}, secure: ${smtpSecure || smtpPort === 465}`);
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
        // Fallback to Google API if configured and SMTP is suspected to be blocked
        if (this.oauth2Client && (process.env.OUTBOUND_PROVIDER === "google" || !process.env.OUTBOUND_SMTP_HOST)) {
            return this.sendEmailViaGoogleAPI(from, to, subject, text, html, attachments, options);
        }

        if (!process.env.OUTBOUND_SMTP_HOST) {
            throw new Error("Outbound email is not configured (OUTBOUND_SMTP_HOST missing). Please check your .env file.");
        }

        // Get mail configuration from environment
        const mailFromAddress = process.env.MAIL_FROM_ADDRESS || from;
        const mailDomain = process.env.MAIL_DOMAIN || "localhost";

        // Allow overriding sender name
        const mailFromName = options?.senderName || process.env.MAIL_FROM_NAME || "Ephemera";

        // Generate proper message ID
        const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${mailDomain}>`;

        try {
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
        } catch (error) {
            console.error(`[OutboundService] Failed to send email to ${to}:`, error);

            // Auto-fallback to Google API on ETIMEDOUT if available
            if (this.oauth2Client && (error as any).code === 'ETIMEDOUT') {
                console.warn("[OutboundService] SMTP timeout detected, falling back to Gmail API...");
                return this.sendEmailViaGoogleAPI(from, to, subject, text, html, attachments, options);
            }

            throw new Error(`Email delivery failed: ${(error as Error).message}. Check your SMTP settings and network connectivity.`);
        }
    }

    private async sendEmailViaGoogleAPI(
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
        if (!this.oauth2Client) throw new Error("Google API not configured");

        console.log(`[OutboundService] Sending via Gmail API to ${to}`);

        try {
            const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

            // Create RFC 2822 message
            const mail = require('nodemailer/lib/mail-composer');
            const mailFromAddress = process.env.MAIL_FROM_ADDRESS || from;
            const mailFromName = options?.senderName || process.env.MAIL_FROM_NAME || "Ephemera";

            const composer = new mail({
                from: `"${mailFromName}" <${mailFromAddress}>`,
                to,
                replyTo: options?.replyTo,
                subject,
                text,
                html,
                attachments,
                headers: options?.headers
            });

            const buffer = await composer.build();
            const base64SafeString = buffer
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const res = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: base64SafeString
                }
            } as any);

            return res.data;
        } catch (error) {
            console.error("[OutboundService] Gmail API failed:", error);
            throw error;
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
     * Verify SMTP connection is working
     */
    async verifyConnection(): Promise<boolean> {
        // If Google API is configured, verify that instead
        if (this.oauth2Client) {
            try {
                await this.oauth2Client.getAccessToken();
                console.log("[OutboundService] Google API connection verified successfully");
                return true;
            } catch (error) {
                console.error("[OutboundService] Google API verification failed:", error);
                return false;
            }
        }

        if (!process.env.OUTBOUND_SMTP_HOST) {
            console.warn("[OutboundService] Outbound verification skipped: Neither SMTP nor Google API configured");
            return false;
        }

        try {
            await this.transporter.verify();
            console.log("[OutboundService] SMTP connection verified successfully");
            return true;
        } catch (error) {
            console.error("[OutboundService] SMTP connection verification failed:", error);
            return false;
        }
    }
}


export const outboundService = new OutboundService();
