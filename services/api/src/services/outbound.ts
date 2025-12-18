import nodemailer from "nodemailer";
import { appConfig } from "../config";

export interface OutboundProvider {
    type: 'ses' | 'smtp' | 'mailgun' | 'sendgrid';
    config: any;
}

export class OutboundService {
    private transporter: nodemailer.Transporter;
    private provider: OutboundProvider;

    constructor() {
        this.provider = this.detectProvider();
        this.transporter = this.createTransporter();
    }

    private detectProvider(): OutboundProvider {
        const providerType = process.env.OUTBOUND_PROVIDER?.toLowerCase() || 'smtp';

        switch (providerType) {
            case 'ses':
                return {
                    type: 'ses',
                    config: {
                        region: process.env.AWS_SES_REGION || 'us-east-1',
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                        sendingRate: process.env.AWS_SES_SENDING_RATE || '10',
                    }
                };

            case 'mailgun':
                return {
                    type: 'mailgun',
                    config: {
                        apiKey: process.env.MAILGUN_API_KEY,
                        domain: process.env.MAILGUN_DOMAIN,
                    }
                };

            case 'sendgrid':
                return {
                    type: 'sendgrid',
                    config: {
                        apiKey: process.env.SENDGRID_API_KEY,
                    }
                };

            default:
                return {
                    type: 'smtp',
                    config: {
                        host: process.env.OUTBOUND_SMTP_HOST,
                        port: Number(process.env.OUTBOUND_SMTP_PORT) || 587,
                        user: process.env.OUTBOUND_SMTP_USER,
                        pass: process.env.OUTBOUND_SMTP_PASS,
                        secure: process.env.OUTBOUND_SMTP_SECURE === "true",
                    }
                };
        }
    }

    private createTransporter(): nodemailer.Transporter {
        switch (this.provider.type) {
            case 'ses':
                // AWS SES requires the aws-ses package
                try {
                    const aws = require('aws-sdk');
                    const ses = new aws.SES({
                        region: this.provider.config.region,
                        accessKeyId: this.provider.config.accessKeyId,
                        secretAccessKey: this.provider.config.secretAccessKey,
                    });

                    // Create SES transporter
                    const { default: sesTransport } = require('nodemailer-ses-transport');
                    return nodemailer.createTransport(sesTransport({
                        ses,
                        aws,
                        sendingRate: Number(this.provider.config.sendingRate),
                    }));
                } catch (error) {
                    console.error('AWS SES not configured, falling back to SMTP:', error);
                    // Fall back to SMTP configuration
                    return this.createSMTPTransporter();
                }

            case 'mailgun':
                // Use Mailgun's SMTP credentials
                return nodemailer.createTransport({
                    host: 'smtp.mailgun.org',
                    port: 587,
                    secure: false,
                    auth: {
                        user: `postmaster@${this.provider.config.domain}`,
                        pass: this.provider.config.apiKey,
                    },
                });

            case 'sendgrid':
                // Use SendGrid's SMTP credentials
                return nodemailer.createTransport({
                    host: 'smtp.sendgrid.net',
                    port: 587,
                    secure: false,
                    auth: {
                        user: 'apikey',
                        pass: this.provider.config.apiKey,
                    },
                });

            default:
                return this.createSMTPTransporter();
        }
    }

    private createSMTPTransporter(): nodemailer.Transporter {
        const config = this.provider.config;

        const transportConfig: nodemailer.TransportOptions = {
            host: config.host,
            port: config.port,
            secure: config.secure,
        } as any;

        if (config.user && config.pass) {
            (transportConfig as any).auth = {
                user: config.user,
                pass: config.pass,
            };
        }

        return nodemailer.createTransport(transportConfig);
    }

    async sendEmail(
        from: string,
        to: string,
        subject: string,
        text?: string,
        html?: string,
        attachments?: any[]
    ) {
        if (!process.env.OUTBOUND_SMTP_HOST) {
            throw new Error("Outbound email is not configured (OUTBOUND_SMTP_HOST missing)");
        }

        // Get mail configuration from environment
        const mailFromName = process.env.MAIL_FROM_NAME || "TempMail Pro";
        const mailFromAddress = process.env.MAIL_FROM_ADDRESS || from;
        const mailDomain = process.env.MAIL_DOMAIN || "localhost";

        // Generate proper message ID
        const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${mailDomain}>`;

        const info = await this.transporter.sendMail({
            from: `"${mailFromName}" <${mailFromAddress}>`,
            to,
            subject,
            text,
            html,
            attachments,
            messageId,
            headers: {
                'X-Mailer': 'TempMail Pro',
                'X-Priority': '3',
                'List-Unsubscribe': `<mailto:unsubscribe@${mailDomain}>`,
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
