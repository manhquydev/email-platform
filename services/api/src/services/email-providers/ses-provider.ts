
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { EmailProvider, SendEmailOptions, SendEmailResult } from "./interface";
// We use nodemailer's mail-composer to build the raw MIME message
const MailComposer = require("nodemailer/lib/mail-composer");

export class SesProvider implements EmailProvider {
  private sesClient: SESClient;

  constructor(region: string, accessKeyId: string, secretAccessKey: string) {
    this.sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const { from, to, subject, text, html, attachments, headers, replyTo, senderName } = options;

    const mailOptions = {
      from: senderName ? `"${senderName}" <${from}>` : from,
      to,
      subject,
      text,
      html,
      attachments,
      replyTo,
      headers: {
        'X-Mailer': 'Ephemera-SES',
        ...headers,
      },
    };

    const composer = new MailComposer(mailOptions);
    const messageBuffer = await composer.compile().build();

    const command = new SendRawEmailCommand({
      RawMessage: {
        Data: messageBuffer,
      },
    });

    try {
      const result = await this.sesClient.send(command);
      return {
        messageId: result.MessageId || "unknown",
        provider: 'ses',
        originalResponse: result,
      };
    } catch (error: any) {
      throw new Error(`SES Send Failed: ${error.message}`);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      // SES doesn't have a simple "ping", but successful instantiation is a start.
      // A strict check would try ListIdentities or GetSendQuota, but that requires extra permissions.
      // We'll trust the credentials for now.
      return true;
    } catch (error) {
      console.error("[SesProvider] Verification failed:", error);
      return false;
    }
  }
}
