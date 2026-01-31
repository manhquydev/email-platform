
import nodemailer from "nodemailer";
import { EmailProvider, SendEmailOptions, SendEmailResult } from "./interface";

export class SmtpProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor(
    host: string,
    port: number,
    user?: string,
    pass?: string,
    secure?: boolean
  ) {
    const transportConfig: nodemailer.TransportOptions = {
      host,
      port,
      secure: secure || port === 465,
    } as any;

    if (user && pass) {
      (transportConfig as any).auth = {
        user,
        pass,
      };
    }

    this.transporter = nodemailer.createTransport(transportConfig);
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
        'X-Mailer': 'Ephemera',
        ...headers,
      },
    };

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
        provider: 'smtp',
        originalResponse: info,
      };
    } catch (error: any) {
      throw new Error(`SMTP Send Failed: ${error.message}`);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("[SmtpProvider] Connection verification failed:", error);
      return false;
    }
  }
}
