import nodemailer from "nodemailer";
import { appConfig } from "../config";

export class OutboundService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.OUTBOUND_SMTP_HOST,
            port: Number(process.env.OUTBOUND_SMTP_PORT) || 587,
            secure: process.env.OUTBOUND_SMTP_SECURE === "true", // true for 465, false for other ports
            auth: {
                user: process.env.OUTBOUND_SMTP_USER,
                pass: process.env.OUTBOUND_SMTP_PASS,
            },
        });
    }

    async sendEmail(from: string, to: string, subject: string, text?: string, html?: string, attachments?: any[]) {
        if (!process.env.OUTBOUND_SMTP_HOST) {
            throw new Error("Outbound email is not configured (OUTBOUND_SMTP_HOST missing)");
        }

        const info = await this.transporter.sendMail({
            from, // This must be a verified sender in the Relay service (e.g. SES)
            to,
            subject,
            text,
            html,
            attachments,
        });

        return info;
    }
}

export const outboundService = new OutboundService();
