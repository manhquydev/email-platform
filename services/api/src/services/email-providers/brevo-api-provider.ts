/**
 * Brevo HTTP API Provider
 * Sends emails via Brevo's REST API (bypasses SMTP port restrictions)
 * Endpoint: POST https://api.brevo.com/v3/smtp/email
 */

import { EmailProvider, SendEmailOptions, SendEmailResult } from "./interface";

interface BrevoEmailPayload {
  sender: { email: string; name?: string };
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  replyTo?: { email: string };
  headers?: Record<string, string>;
  attachment?: {
    name: string;
    content: string; // base64
    type?: string;
  }[];
}

interface BrevoApiResponse {
  messageId?: string;
  code?: string;
  message?: string;
}

export class BrevoApiProvider implements EmailProvider {
  private apiKey: string;
  private apiUrl = "https://api.brevo.com/v3/smtp/email";
  private maxRetries = 3;
  private timeout = 30000; // 30 seconds

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BREVO_API_KEY || "";
    if (!this.apiKey) {
      console.warn("[BrevoApiProvider] No API key configured");
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const { from, to, subject, text, html, attachments, replyTo, senderName, headers } = options;

    // Build Brevo API payload
    const payload: BrevoEmailPayload = {
      sender: {
        email: from,
        name: senderName,
      },
      to: to.split(",").map((email) => ({ email: email.trim() })),
      subject,
    };

    if (html) payload.htmlContent = html;
    if (text) payload.textContent = text;
    if (replyTo) payload.replyTo = { email: replyTo };
    if (headers) payload.headers = headers;

    // Convert attachments to base64
    if (attachments && attachments.length > 0) {
      payload.attachment = attachments.map((att) => ({
        name: att.filename,
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
          messageId: response.messageId || `brevo-${Date.now()}`,
          provider: "brevo",
          originalResponse: response,
        };
      } catch (error: any) {
        lastError = error;
        console.warn(`[BrevoApiProvider] Attempt ${attempt}/${this.maxRetries} failed: ${error.message}`);

        // Don't retry on client errors (4xx except 429)
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          break;
        }

        // Exponential backoff for retryable errors
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error("Brevo API: All retry attempts failed");
  }

  private async makeRequest(payload: BrevoEmailPayload): Promise<BrevoApiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await response.json()) as BrevoApiResponse;

      if (!response.ok) {
        const error = new Error(`Brevo API error: ${data.message || response.statusText}`) as any;
        error.statusCode = response.status;
        error.response = data;
        throw error;
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Brevo API request timed out");
      }
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async verifyConnection(): Promise<boolean> {
    // Verify by checking account info endpoint
    try {
      const response = await fetch("https://api.brevo.com/v3/account", {
        headers: {
          "api-key": this.apiKey,
          Accept: "application/json",
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
