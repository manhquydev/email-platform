/**
 * Gmail API Email Provider
 * Extracted from outbound.ts for modularity (CLAUDE.md: max 200 lines per file)
 */
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface EmailOptions {
  replyTo?: string;
  headers?: Record<string, string>;
  senderName?: string;
}

/**
 * Send email via Gmail API (OAuth2)
 * Used as fallback when SMTP is unavailable or explicitly configured
 */
export async function sendEmailViaGmailAPI(
  oauth2Client: OAuth2Client,
  from: string,
  to: string,
  subject: string,
  text?: string,
  html?: string,
  attachments?: any[],
  options?: EmailOptions
): Promise<any> {
  console.log(`[GmailProvider] Sending via Gmail API to ${to}`);

  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create RFC 2822 message using nodemailer's mail-composer
    const MailComposer = require('nodemailer/lib/mail-composer');
    const mailFromAddress = process.env.MAIL_FROM_ADDRESS || from;
    const mailFromName = options?.senderName || process.env.MAIL_FROM_NAME || "Ephemera";

    const composer = new MailComposer({
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
    console.error("[GmailProvider] Gmail API failed:", error);
    throw error;
  }
}

/**
 * Verify Gmail API connection
 */
export async function verifyGmailConnection(oauth2Client: OAuth2Client): Promise<boolean> {
  try {
    await oauth2Client.getAccessToken();
    console.log("[GmailProvider] Google API connection verified successfully");
    return true;
  } catch (error) {
    console.error("[GmailProvider] Google API verification failed:", error);
    return false;
  }
}
