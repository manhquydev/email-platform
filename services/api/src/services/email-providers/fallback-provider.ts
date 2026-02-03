/**
 * Fallback Provider
 * Dual-provider system: tries Brevo API first, falls back to Postfix on failure
 * Handles rate limits, timeouts, and provider failures gracefully
 */

import { EmailProvider, SendEmailOptions, SendEmailResult } from "./interface";
import { BrevoApiProvider } from "./brevo-api-provider";
import { PostfixProvider } from "./postfix-provider";

interface ProviderEntry {
  provider: EmailProvider;
  name: string;
}

export class FallbackProvider implements EmailProvider {
  private providers: ProviderEntry[];

  constructor() {
    this.providers = [
      { provider: new BrevoApiProvider(), name: "brevo" },
      { provider: new PostfixProvider(), name: "postfix" },
    ];
    console.log("[FallbackProvider] Initialized with providers:", this.providers.map((p) => p.name).join(" -> "));
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
