
import { EmailProvider } from "./interface";
import { BrevoApiProvider } from "./brevo-api-provider";
import { FallbackProvider } from "./fallback-provider";
import { GoogleProvider } from "./google-provider";
import { MailgunProvider } from "./mailgun-provider";
import { PostfixProvider } from "./postfix-provider";
import { SesProvider } from "./ses-provider";
import { SmtpProvider } from "./smtp-provider";

export class EmailProviderFactory {
  static getProvider(): EmailProvider {
    const providerType = process.env.OUTBOUND_PROVIDER || "smtp";

    switch (providerType.toLowerCase()) {
      case "brevo":
        if (!process.env.BREVO_API_KEY) {
          throw new Error("BREVO_API_KEY not configured");
        }
        return new BrevoApiProvider(process.env.BREVO_API_KEY);

      case "postfix":
        return new PostfixProvider();

      case "fallback":
        // Dual provider: Brevo API (primary) -> Postfix (fallback)
        return new FallbackProvider();

      case "google":
        return new GoogleProvider();

      case "ses":
        if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
          throw new Error("AWS SES credentials missing");
        }
        return new SesProvider(
          process.env.AWS_REGION,
          process.env.AWS_ACCESS_KEY_ID,
          process.env.AWS_SECRET_ACCESS_KEY
        );

      case "mailgun":
        if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
          throw new Error("Mailgun credentials missing");
        }
        return new MailgunProvider(
          process.env.MAILGUN_API_KEY,
          process.env.MAILGUN_DOMAIN
        );

      case "smtp":
      default:
        const host = process.env.OUTBOUND_SMTP_HOST;
        const port = Number(process.env.OUTBOUND_SMTP_PORT) || 587;

        if (!host) {
            // Fallback for development if no SMTP configured?
            // Or throw error. For now, we assume if provider is SMTP, host is required.
            if (process.env.NODE_ENV === 'production') {
                 throw new Error("SMTP Host not configured");
            }
            console.warn("[EmailProviderFactory] No SMTP Host configured, using stub/dev mode (or will fail)");
        }

        return new SmtpProvider(
          host || "localhost",
          port,
          process.env.OUTBOUND_SMTP_USER,
          process.env.OUTBOUND_SMTP_PASS,
          process.env.OUTBOUND_SMTP_SECURE === "true"
        );
    }
  }
}
