/**
 * Postfix Provider
 * Sends emails via internal Postfix container (port 25, no auth)
 * Used as fallback when Brevo API fails or rate-limited
 */

import nodemailer from "nodemailer";
import { EmailProvider, SendEmailOptions, SendEmailResult } from "./interface";

export class PostfixProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;
  private host: string;
  private port: number;

  constructor(host?: string, port?: number) {
    this.host = host || process.env.POSTFIX_HOST || "postfix";
    this.port = port || Number(process.env.POSTFIX_PORT) || 25;

    this.transporter = nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: false, // Postfix container uses plain SMTP
      tls: {
        rejectUnauthorized: false, // Internal container, self-signed OK
      },
    } as nodemailer.TransportOptions);
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const { from, to, subject, text, html, attachments, headers, replyTo, senderName, dkim } = options;

    const mailOptions: nodemailer.SendMailOptions = {
      from: senderName ? `"${senderName}" <${from}>` : from,
      to,
      subject,
      text,
      html,
      attachments,
      replyTo,
      headers: {
        "X-Mailer": "Ephemera-Postfix",
        ...headers,
      },
    };

    // Apply DKIM if provided
    if (dkim) {
      mailOptions.dkim = {
        domainName: dkim.domainName,
        keySelector: dkim.keySelector,
        privateKey: dkim.privateKey,
      };
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return {
        messageId: info.messageId,
        provider: "postfix",
        originalResponse: info,
      };
    } catch (error: any) {
      throw new Error(`Postfix Send Failed: ${error.message}`);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("[PostfixProvider] Connection verification failed:", error);
      return false;
    }
  }
}
