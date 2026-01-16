/**
 * Telegram Destination Handler
 * Forwards email content to Telegram chat
 */

import type { Message, ForwardingRule } from "@prisma/client";
import { extractOTP } from "../../../utils/otpExtractor";

interface SendResult {
  success: boolean;
  error?: string;
}

/**
 * Forward message to Telegram
 */
export async function forwardToTelegram(
  message: Message,
  rule: ForwardingRule
): Promise<SendResult> {
  const chatId = (rule as any).telegramChatId;

  if (!chatId) {
    return { success: false, error: "No Telegram chat ID configured" };
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { success: false, error: "Telegram bot not configured" };
  }

  try {
    const otpResult = extractOTP(message.textBody || "");
    const text = buildTelegramMessage(message, otpResult);

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Telegram API error: ${error}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function buildTelegramMessage(message: Message, otp: { code: string } | null): string {
  const lines = [
    `📩 <b>New Email Forwarded</b>`,
    ``,
    `<b>From:</b> ${escapeHtml(message.fromAddress || "Unknown")}`,
    `<b>Subject:</b> ${escapeHtml(message.subject || "(No subject)")}`,
  ];

  if (otp) {
    lines.push(``, `🔢 <b>OTP Code:</b> <code>${otp.code}</code>`);
  }

  // Preview (first 500 chars)
  const preview = (message.textBody || "").slice(0, 500);
  if (preview) {
    lines.push(``, `<b>Preview:</b>`, escapeHtml(preview));
    if ((message.textBody?.length || 0) > 500) {
      lines.push(`...`);
    }
  }

  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
