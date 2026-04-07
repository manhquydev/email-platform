/**
 * Email Destination Handler
 * Forwards email to external email address via configured outbound provider
 */

import { extractOTP } from "../../../utils/otpExtractor";
import type { Message, ForwardingRule } from "@prisma/client";

interface SendResult {
  success: boolean;
  error?: string;
}

/**
 * Forward message to email destination
 */
export async function forwardToEmail(
  message: Message,
  rule: ForwardingRule
): Promise<SendResult> {
  if (!rule.forwardTo) {
    return { success: false, error: "No email destination configured" };
  }

  const providerType = (process.env.OUTBOUND_PROVIDER || "smtp").toLowerCase();
  if (providerType === "smtp" && !process.env.OUTBOUND_SMTP_HOST) {
    return { success: false, error: "SMTP not configured" };
  }

  try {
    // Dynamic import to avoid circular dependencies
    const { outboundService } = await import("../../outbound");
    const otpResult = extractOTP(message.textBody || "");

    await outboundService.sendEmail(
      process.env.MAIL_DOMAIN ? `noreply@${process.env.MAIL_DOMAIN}` : "noreply@ephemera.click",
      rule.forwardTo,
      `[FWD] ${message.subject || "(No subject)"}`,
      buildTextBody(message, otpResult),
      buildHtmlBody(message, otpResult),
      undefined,
      {
        senderName: "Ephemera Forward",
        replyTo: message.fromAddress || undefined,
        headers: {
          "X-Original-From": message.fromAddress || "",
          "X-Original-To": message.toAddress || "",
          "X-Forwarding-Rule": rule.id,
        }
      }
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function buildTextBody(message: Message, otp: { code: string } | null): string {
  return `
────────────────────────────
📩 Forwarded from Ephemera
────────────────────────────
From: ${message.fromAddress || "Unknown"}
To: ${message.toAddress || ""}
Date: ${new Date(message.receivedAt).toISOString()}
${otp ? `\n🔢 OTP Code: ${otp.code}\n` : ""}
────────────────────────────

${message.textBody || "(No content)"}
  `.trim();
}

function buildHtmlBody(message: Message, otp: { code: string } | null): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
  <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0; color: #64748b; font-size: 14px;">
      📩 Forwarded from <strong>Ephemera</strong>
    </p>
    <p style="margin: 5px 0 0; color: #334155;">
      <strong>From:</strong> ${message.fromAddress || "Unknown"}<br>
      <strong>To:</strong> ${message.toAddress || ""}<br>
      <strong>Date:</strong> ${new Date(message.receivedAt).toLocaleString()}
    </p>
    ${otp ? `
    <div style="background: #22c55e; color: white; padding: 10px 15px; border-radius: 6px; margin-top: 10px; display: inline-block;">
      🔢 OTP: <strong style="font-size: 18px; letter-spacing: 2px;">${otp.code}</strong>
    </div>
    ` : ""}
  </div>
  <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
    ${message.htmlBody || `<pre style="white-space: pre-wrap;">${message.textBody || "(No content)"}</pre>`}
  </div>
</body>
</html>
  `.trim();
}
