/**
 * Email Forwarding Service
 * Handles forwarding rules and email delivery to personal addresses
 */

import { prisma } from "../lib/prisma";
import { extractOTP } from "../utils/otpExtractor";
import type { Message, Prisma } from "@prisma/client";
import { outboundService } from "./outbound";

// Generate 6-digit verification code
export function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification email to forward address
 */
export async function sendForwardVerification(
    userId: string,
    email: string
): Promise<{ success: boolean; error?: string }> {
    // Check if outbound email is configured
    if (!process.env.OUTBOUND_SMTP_HOST) {
        return { success: false, error: "SMTP chưa được cấu hình" };
    }

    try {
        // Delete existing verification for this email
        await prisma.forwardVerification.deleteMany({
            where: { userId, email }
        });

        // Create new verification
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        await prisma.forwardVerification.create({
            data: {
                userId,
                email,
                code,
                expiresAt,
            }
        });

        // Send verification email
        await outboundService.sendEmail(
            process.env.MAIL_DOMAIN ? `noreply@${process.env.MAIL_DOMAIN}` : "noreply@ephemera.click",
            email,
            "Xác minh địa chỉ email chuyển tiếp - Ephemera",
            `
Mã xác minh của bạn: ${code}

Mã này có hiệu lực trong 30 phút.

Nếu bạn không yêu cầu xác minh này, hãy bỏ qua email này.

---
Ephemera
      `,
            `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">📧 Ephemera</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
    <p style="color: #334155; font-size: 16px;">Xin chào,</p>
    
    <p style="color: #334155; font-size: 16px;">
      Đây là mã xác minh để thêm địa chỉ email này làm đích chuyển tiếp:
    </p>
    
    <div style="background: #6366f1; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 12px; letter-spacing: 8px; margin: 20px 0;">
      ${code}
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      Mã này có hiệu lực trong <strong>30 phút</strong>.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
    
    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
      Nếu bạn không yêu cầu xác minh này, hãy bỏ qua email này.
    </p>
  </div>
</body>
</html>
      `
        );

        return { success: true };
    } catch (error) {
        console.error("[EmailForwarder] Send verification error:", error);
        return { success: false, error: "Không thể gửi email xác minh" };
    }
}

/**
 * Confirm forward email verification
 */
export async function confirmForwardVerification(
    userId: string,
    email: string,
    code: string
): Promise<{ success: boolean; error?: string }> {
    const verification = await prisma.forwardVerification.findFirst({
        where: {
            userId,
            email,
            code,
            expiresAt: { gt: new Date() },
            verifiedAt: null,
        }
    });

    if (!verification) {
        return { success: false, error: "Mã xác minh không hợp lệ hoặc đã hết hạn" };
    }

    // Mark as verified
    await prisma.$transaction([
        prisma.forwardVerification.update({
            where: { id: verification.id },
            data: { verifiedAt: new Date() }
        }),
        prisma.user.update({
            where: { id: userId },
            data: {
                verifiedForwardEmails: {
                    push: email
                }
            }
        })
    ]);

    return { success: true };
}

/**
 * Get verified forward emails for user
 */
export async function getVerifiedEmails(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { verifiedForwardEmails: true }
    });
    return user?.verifiedForwardEmails || [];
}

/**
 * Remove verified email
 */
export async function removeVerifiedEmail(
    userId: string,
    email: string
): Promise<void> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { verifiedForwardEmails: true }
    });

    if (user) {
        await prisma.user.update({
            where: { id: userId },
            data: {
                verifiedForwardEmails: user.verifiedForwardEmails.filter(e => e !== email)
            }
        });

        // Also delete any forwarding rules using this email
        await prisma.forwardingRule.deleteMany({
            where: { userId, forwardTo: email }
        });
    }
}

// Forwarding Rule Conditions interface
interface ForwardConditions {
    senderDomains?: string[];
    containsOTP?: boolean;
    subjectContains?: string;
    [key: string]: string[] | boolean | string | undefined; // Index signature for Prisma JSON
}

/**
 * Create forwarding rule
 */
export async function createForwardingRule(
    userId: string,
    data: {
        name: string;
        inboxId?: string;
        conditions: ForwardConditions;
        forwardTo: string;
    }
): Promise<{ success: boolean; ruleId?: string; error?: string }> {
    // Verify the forward email is verified
    const verifiedEmails = await getVerifiedEmails(userId);
    if (!verifiedEmails.includes(data.forwardTo)) {
        return { success: false, error: "Địa chỉ email chưa được xác minh" };
    }

    // Check rule limit (e.g., 5 rules for free users)
    const existingRules = await prisma.forwardingRule.count({
        where: { userId }
    });

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true }
    });

    const maxRules = user?.tier === "PROFESSIONAL" ? 20 : user?.tier === "ENTERPRISE" ? 50 : 5;

    if (existingRules >= maxRules) {
        return { success: false, error: `Đã đạt giới hạn ${maxRules} quy tắc` };
    }

    const rule = await prisma.forwardingRule.create({
        data: {
            userId,
            inboxId: data.inboxId,
            name: data.name,
            conditions: data.conditions as Prisma.JsonObject,
            forwardTo: data.forwardTo,
        }
    });

    return { success: true, ruleId: rule.id };
}

/**
 * Get forwarding rules for user
 */
export async function getForwardingRules(userId: string) {
    return prisma.forwardingRule.findMany({
        where: { userId },
        include: {
            inbox: {
                include: { domain: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });
}

/**
 * Update forwarding rule
 */
export async function updateForwardingRule(
    userId: string,
    ruleId: string,
    data: {
        name?: string;
        conditions?: ForwardConditions;
        forwardTo?: string;
        isActive?: boolean;
    }
): Promise<{ success: boolean; error?: string }> {
    const rule = await prisma.forwardingRule.findFirst({
        where: { id: ruleId, userId }
    });

    if (!rule) {
        return { success: false, error: "Không tìm thấy quy tắc" };
    }

    // If changing forwardTo, verify it's in verified list
    if (data.forwardTo) {
        const verifiedEmails = await getVerifiedEmails(userId);
        if (!verifiedEmails.includes(data.forwardTo)) {
            return { success: false, error: "Địa chỉ email chưa được xác minh" };
        }
    }

    await prisma.forwardingRule.update({
        where: { id: ruleId },
        data: {
            name: data.name,
            conditions: data.conditions as Prisma.JsonObject | undefined,
            forwardTo: data.forwardTo,
            isActive: data.isActive,
        }
    });

    return { success: true };
}

/**
 * Delete forwarding rule
 */
export async function deleteForwardingRule(
    userId: string,
    ruleId: string
): Promise<{ success: boolean; error?: string }> {
    const rule = await prisma.forwardingRule.findFirst({
        where: { id: ruleId, userId }
    });

    if (!rule) {
        return { success: false, error: "Không tìm thấy quy tắc" };
    }

    await prisma.forwardingRule.delete({
        where: { id: ruleId }
    });

    return { success: true };
}

/**
 * Check if message matches rule conditions
 */
function matchesConditions(message: Message, conditions: ForwardConditions): boolean {
    // Check sender domains
    if (conditions.senderDomains && conditions.senderDomains.length > 0) {
        const senderDomain = message.fromAddress?.split("@")[1]?.toLowerCase();
        if (!senderDomain || !conditions.senderDomains.some(d => d.toLowerCase() === senderDomain)) {
            return false;
        }
    }

    // Check for OTP
    if (conditions.containsOTP) {
        const content = message.textBody || "";
        if (!extractOTP(content)) {
            return false;
        }
    }

    // Check subject contains
    if (conditions.subjectContains) {
        const subject = message.subject?.toLowerCase() || "";
        if (!subject.includes(conditions.subjectContains.toLowerCase())) {
            return false;
        }
    }

    return true;
}

/**
 * Forward a message based on rules
 * Called when a new message arrives
 */
export async function forwardMessageIfMatched(
    message: Message & { inbox: { id: string; ownerId: string | null } }
): Promise<void> {
    if (!message.inbox.ownerId) return;

    // Check if outbound email is configured
    if (!process.env.OUTBOUND_SMTP_HOST) return;

    // Get active rules for this user and inbox
    const rules = await prisma.forwardingRule.findMany({
        where: {
            userId: message.inbox.ownerId,
            isActive: true,
            OR: [
                { inboxId: null }, // Rules for all inboxes
                { inboxId: message.inbox.id } // Rules for this specific inbox
            ]
        }
    });

    for (const rule of rules) {
        const conditions = rule.conditions as ForwardConditions;

        if (matchesConditions(message, conditions)) {
            try {
                // Extract OTP if present
                const otpResult = extractOTP(message.textBody || "");

                // Forward the email using OutboundService
                await outboundService.sendEmail(
                    process.env.MAIL_DOMAIN ? `noreply@${process.env.MAIL_DOMAIN}` : "noreply@ephemera.click",
                    rule.forwardTo,
                    `[FWD] ${message.subject || "(Không có tiêu đề)"}`,
                    `
────────────────────────────
📩 Email được chuyển tiếp từ Ephemera
────────────────────────────
Từ: ${message.fromAddress || "Unknown"}
Đến: ${message.toAddress || ""}
Ngày: ${new Date(message.receivedAt).toLocaleString("vi-VN")}
${otpResult ? `\n🔢 Mã OTP: ${otpResult.code}\n` : ""}
────────────────────────────

${message.textBody || "(Không có nội dung)"}
          `,
                    `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
  <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0; color: #64748b; font-size: 14px;">
      📩 Email được chuyển tiếp từ <strong>Ephemera</strong>
    </p>
    <p style="margin: 5px 0 0; color: #334155;">
      <strong>Từ:</strong> ${message.fromAddress || "Unknown"}<br>
      <strong>Đến:</strong> ${message.toAddress || ""}<br>
      <strong>Ngày:</strong> ${new Date(message.receivedAt).toLocaleString("vi-VN")}
    </p>
    ${otpResult ? `
    <div style="background: #22c55e; color: white; padding: 10px 15px; border-radius: 6px; margin-top: 10px; display: inline-block;">
      🔢 Mã OTP: <strong style="font-size: 18px; letter-spacing: 2px;">${otpResult.code}</strong>
    </div>
    ` : ""}
  </div>
  
  <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
    ${message.htmlBody || `<pre style="white-space: pre-wrap;">${message.textBody || "(Không có nội dung)"}</pre>`}
  </div>
</body>
</html>
          `,
                    undefined,
                    {
                        senderName: "Ephemera Forward",
                        replyTo: message.fromAddress || undefined,
                        headers: {
                            "X-Original-From": message.fromAddress || "",
                            "X-Original-To": message.toAddress || "",
                        }
                    }
                );

                // Update forward count
                await prisma.forwardingRule.update({
                    where: { id: rule.id },
                    data: {
                        forwardCount: { increment: 1 },
                        lastForwardAt: new Date()
                    }
                });

                console.log(`[EmailForwarder] Forwarded message ${message.id} to ${rule.forwardTo}`);
            } catch (error) {
                console.error(`[EmailForwarder] Failed to forward message ${message.id}:`, error);
            }
        }
    }
}
