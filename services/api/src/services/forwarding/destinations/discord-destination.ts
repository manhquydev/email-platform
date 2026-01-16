/**
 * Discord Destination Handler
 * Forwards email content to Discord webhook
 */

import type { Message, ForwardingRule } from "@prisma/client";
import { extractOTP } from "../../../utils/otpExtractor";

interface SendResult {
  success: boolean;
  error?: string;
}

/**
 * Forward message to Discord webhook
 */
export async function forwardToDiscord(
  message: Message,
  rule: ForwardingRule
): Promise<SendResult> {
  const webhookUrl = (rule as any).discordWebhookUrl;

  if (!webhookUrl) {
    return { success: false, error: "No Discord webhook URL configured" };
  }

  // Validate Discord webhook URL format
  if (!webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return { success: false, error: "Invalid Discord webhook URL" };
  }

  try {
    const otpResult = extractOTP(message.textBody || "");
    const embed = buildDiscordEmbed(message, otpResult);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Ephemera Mail",
        avatar_url: "https://ephemera.click/logo.png",
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Discord API error: ${error}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function buildDiscordEmbed(message: Message, otp: { code: string } | null) {
  const fields = [
    { name: "From", value: message.fromAddress || "Unknown", inline: true },
    { name: "To", value: message.toAddress || "", inline: true },
  ];

  if (otp) {
    fields.push({ name: "🔢 OTP Code", value: `\`${otp.code}\``, inline: false });
  }

  // Preview (first 1000 chars for Discord limit)
  const preview = (message.textBody || "").slice(0, 1000);
  if (preview) {
    fields.push({ name: "Preview", value: preview, inline: false });
  }

  return {
    title: `📩 ${message.subject || "(No subject)"}`,
    color: 0x6366f1, // Indigo
    fields,
    timestamp: new Date(message.receivedAt).toISOString(),
    footer: { text: "Ephemera Email Forward" },
  };
}
