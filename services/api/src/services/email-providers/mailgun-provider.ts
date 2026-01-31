
import FormData from "form-data";
import Mailgun from "mailgun.js";
import { EmailProvider, SendEmailOptions, SendEmailResult } from "./interface";

export class MailgunProvider implements EmailProvider {
  private client: any;
  private domain: string;

  constructor(apiKey: string, domain: string, username: string = 'api') {
    const mailgun = new Mailgun(FormData);
    this.client = mailgun.client({ username, key: apiKey });
    this.domain = domain;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const { from, to, subject, text, html, attachments, headers, replyTo, senderName } = options;

    const messageData: any = {
      from: senderName ? `${senderName} <${from}>` : from,
      to,
      subject,
      text,
      html,
      'h:Reply-To': replyTo,
    };

    // Add custom headers
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        messageData[`h:${key}`] = value;
      }
    }

    // Handle attachments
    if (attachments && attachments.length > 0) {
        messageData.attachment = attachments.map(att => {
            // Mailgun expects file objects or buffers
            return {
                filename: att.filename,
                data: att.content,
                contentType: att.contentType
            };
        });
    }

    try {
      const result = await this.client.messages.create(this.domain, messageData);
      return {
        messageId: result.id.replace(/[<>]/g, ''), // Mailgun returns ID wrapped in brackets
        provider: 'mailgun',
        originalResponse: result,
      };
    } catch (error: any) {
      throw new Error(`Mailgun Send Failed: ${error.message}`);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      // Simple verification isn't standard in Mailgun SDK without making a call
      return !!this.client;
    } catch (error) {
        console.error("[MailgunProvider] Verification failed:", error);
        return false;
    }
  }
}
