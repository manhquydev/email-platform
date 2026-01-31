
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { EmailProvider, SendEmailOptions, SendEmailResult } from "./interface";
import { appConfig } from "../../config";

export class GoogleProvider implements EmailProvider {
  private oauth2Client: OAuth2Client;

  constructor() {
    if (!appConfig.googleClientId || !appConfig.googleClientSecret || !appConfig.googleRefreshToken) {
      throw new Error("Google OAuth2 credentials missing");
    }

    this.oauth2Client = new OAuth2Client(
        appConfig.googleClientId,
        appConfig.googleClientSecret
    );
    this.oauth2Client.setCredentials({
        refresh_token: appConfig.googleRefreshToken
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const { from, to, subject, text, html, attachments, headers, replyTo, senderName } = options;

    console.log(`[GoogleProvider] Sending via Gmail API to ${to}`);

    try {
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

        // Create RFC 2822 message using nodemailer's mail-composer
        const mail = require('nodemailer/lib/mail-composer');

        const composer = new mail({
            from: senderName ? `"${senderName}" <${from}>` : from,
            to,
            replyTo,
            subject,
            text,
            html,
            attachments,
            headers: {
                ...headers,
                // Google API doesn't need X-Mailer usually, but we can add it
                'X-Mailer': 'Ephemera-Google'
            }
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

        return {
            messageId: res.data.id || "unknown",
            provider: 'google',
            originalResponse: res.data
        };
    } catch (error: any) {
        console.error("[GoogleProvider] Gmail API failed:", error);
        throw new Error(`Google API Send Failed: ${error.message}`);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
        await this.oauth2Client.getAccessToken();
        console.log("[GoogleProvider] Connection verified successfully");
        return true;
    } catch (error) {
        console.error("[GoogleProvider] Verification failed:", error);
        return false;
    }
  }
}
