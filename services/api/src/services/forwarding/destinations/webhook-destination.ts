/**
 * Webhook Destination Handler
 * Forwards email data to custom webhook endpoint
 */

import crypto from "crypto";
import type { Message, ForwardingRule } from "@prisma/client";
import { extractOTP } from "../../../utils/otpExtractor";

interface SendResult {
  success: boolean;
  error?: string;
}

type MessageWithAttachments = Message & {
  attachments?: { id: string; filename: string }[];
};

/**
 * Forward message to custom webhook
 */
export async function forwardToWebhook(
  message: MessageWithAttachments,
  rule: ForwardingRule
): Promise<SendResult> {
  const webhookUrl = (rule as any).webhookUrl;
  const webhookSecret = (rule as any).webhookSecret;

  if (!webhookUrl) {
    return { success: false, error: "No webhook URL configured" };
  }

  try {
    const otpResult = extractOTP(message.textBody || "");
    const payload = buildWebhookPayload(message, rule, otpResult);
    const payloadStr = JSON.stringify(payload);

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Ephemera-Event": "email.forwarded",
      "X-Ephemera-Delivery": crypto.randomUUID(),
    };

    // Add signature if secret exists
    if (webhookSecret) {
      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payloadStr)
        .digest("hex");
      headers["X-Ephemera-Signature"] = `sha256=${signature}`;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: payloadStr,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function buildWebhookPayload(
  message: MessageWithAttachments,
  rule: ForwardingRule,
  otp: { code: string; confidence: string } | null
) {
  return {
    event: "email.forwarded",
    timestamp: new Date().toISOString(),
    rule: {
      id: rule.id,
      name: rule.name,
    },
    message: {
      id: message.id,
      messageId: message.messageId,
      from: message.fromAddress,
      to: message.toAddress,
      subject: message.subject,
      receivedAt: message.receivedAt,
      textBody: message.textBody,
      htmlBody: message.htmlBody,
      spamScore: message.spamScore,
      attachments: message.attachments?.map(a => ({
        id: a.id,
        filename: a.filename,
      })) || [],
    },
    extractedOtp: otp,
  };
}
