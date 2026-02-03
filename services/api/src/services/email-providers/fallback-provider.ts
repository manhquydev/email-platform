/**
 * Fallback Provider
 * Multi-provider system with sequential fallback for HTTP API providers
 * Chain: Mailgun -> SendGrid -> Brevo (all use HTTPS, bypass SMTP port blocks)
 */

import { EmailProvider, SendEmailOptions, SendEmailResult } from "./interface";
import { MailgunProvider } from "./mailgun-provider";
import { SendGridProvider } from "./sendgrid-provider";
import { BrevoApiProvider } from "./brevo-api-provider";

interface ProviderEntry {
  provider: EmailProvider;
  name: string;
  enabled: boolean;
}

export class FallbackProvider implements EmailProvider {
  private providers: ProviderEntry[];

  constructor() {
    // Only include providers with configured API keys
    this.providers = [];

    // Mailgun (priority 1)
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      this.providers.push({
        provider: new MailgunProvider(process.env.MAILGUN_API_KEY, process.env.MAILGUN_DOMAIN),
        name: "mailgun",
        enabled: true,
      });
    }

    // SendGrid (priority 2)
    if (process.env.SENDGRID_API_KEY) {
      this.providers.push({
        provider: new SendGridProvider(process.env.SENDGRID_API_KEY),
        name: "sendgrid",
        enabled: true,
      });
    }

    // Brevo (priority 3)
    if (process.env.BREVO_API_KEY) {
      this.providers.push({
        provider: new BrevoApiProvider(process.env.BREVO_API_KEY),
        name: "brevo",
        enabled: true,
      });
    }

    if (this.providers.length === 0) {
      console.warn("[FallbackProvider] No email providers configured!");
    } else {
      console.log("[FallbackProvider] Initialized with providers:", this.providers.map((p) => p.name).join(" -> "));
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const errors: string[] = [];

    for (const { provider, name } of this.providers) {
      try {
        console.log(`[FallbackProvider] Trying provider: ${name}`);
        const result = await provider.sendEmail(options);
        console.log(`[FallbackProvider] Success via ${name}, messageId: ${result.messageId}`);
        return result;
      } catch (error: any) {
        const errorMsg = `${name}: ${error.message}`;
        errors.push(errorMsg);
        console.warn(`[FallbackProvider] ${name} failed: ${error.message}`);
        // Continue to next provider
      }
    }

    // All providers failed
    throw new Error(`All email providers failed: ${errors.join("; ")}`);
  }

  async verifyConnection(): Promise<boolean> {
    // Return true if any provider can connect
    for (const { provider, name } of this.providers) {
      try {
        const ok = await provider.verifyConnection();
        if (ok) {
          console.log(`[FallbackProvider] Provider ${name} connection verified`);
          return true;
        }
      } catch {
        // Continue to next
      }
    }
    return false;
  }
}
