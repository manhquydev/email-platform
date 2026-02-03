/**
 * SendGrid HTTP API Provider
 * Sends emails via SendGrid's REST API (uses HTTPS, bypasses SMTP port blocks)
 * Endpoint: POST https://api.sendgrid.com/v3/mail/send
 * Free tier: 100 emails/day
 */

import { EmailProvider, SendEmailOptions, SendEmailResult } from "./interface";

interface SendGridEmailPayload {
  personalizations: { to: { email: string }[] }[];
  from: { email: string; name?: string };
  subject: string;
  content: { type: string; value: string }[];
  reply_to?: { email: string };
  headers?: Record<string, string>;
  attachments?: { content: string; filename: string; type?: string }[];
}

export class SendGridProvider implements EmailProvider {
  private apiKey: string;
  private apiUrl = "https://api.sendgrid.com/v3/mail/send";
  private maxRetries = 3;
  private timeout = 30000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SENDGRID_API_KEY || "";
    if (!this.apiKey) {
      console.warn("[SendGridProvider] No API key configured");
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const { from, to, subject, text, html, attachments, replyTo, senderName, headers } = options;

    // Build SendGrid API payload
    const content: { type: string; value: string }[] = [];
    if (text) content.push({ type: "text/plain", value: text });
    if (html) content.push({ type: "text/html", value: html });

    const payload: SendGridEmailPayload = {
      personalizations: [{ to: to.split(",").map((email) => ({ email: email.trim() })) }],
      from: { email: from, name: senderName },
      subject,
      content,
    };

    if (replyTo) payload.reply_to = { email: replyTo };
    if (headers) payload.headers = headers;

    // Convert attachments to base64
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map((att) => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content)
          ? att.content.toString("base64")
          : Buffer.from(att.content).toString("base64"),
        type: att.contentType,
      }));
    }

    // Send with retry logic
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(payload);
        return {
          messageId: response.messageId || `sendgrid-${Date.now()}`,
          provider: "sendgrid",
          originalResponse: response,
        };
      } catch (error: any) {
        lastError = error;
        console.warn(`[SendGridProvider] Attempt ${attempt}/${this.maxRetries} failed: ${error.message}`);

        // Don't retry on client errors (4xx except 429)
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          break;
        }

        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error("SendGrid API: All retry attempts failed");
  }

  private async makeRequest(payload: SendGridEmailPayload): Promise<{ messageId?: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // SendGrid returns 202 on success with no body
      if (response.status === 202) {
        const messageId = response.headers.get("x-message-id") || `sg-${Date.now()}`;
        return { messageId };
      }

      const data = await response.json().catch(() => ({}));
      const error = new Error(`SendGrid API error: ${data.errors?.[0]?.message || response.statusText}`) as any;
      error.statusCode = response.status;
      error.response = data;
      throw error;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("SendGrid API request timed out");
      }
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async verifyConnection(): Promise<boolean> {
    // Verify by checking API key validity (no direct endpoint, just check format)
    return this.apiKey.startsWith("SG.");
  }
}
