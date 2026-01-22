/**
 * Support Ticket Email Templates
 * Notification emails for support ticket system
 */

import { appConfig } from "../config";

const getBaseStyles = () => `
  <style>
    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #1a1a1a; background: #f4f4f5; }
    .email-wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .email-container { background: #fff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .email-header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; color: #fff; }
    .email-body { padding: 40px 32px; }
    .greeting { font-size: 20px; font-weight: 600; margin-bottom: 16px; }
    .message { font-size: 16px; color: #4a4a4a; margin-bottom: 24px; }
    .info-box { background: #eff6ff; border-left: 4px solid #6366f1; padding: 16px; margin: 24px 0; border-radius: 8px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff !important; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; }
    .footer { padding: 24px 32px; background: #f9fafb; text-align: center; font-size: 14px; color: #6b7280; }
  </style>
`;

interface SupportEmailParams {
  recipientEmail: string;
  platformName?: string;
  supportEmail?: string;
}

/**
 * Generate support ticket created notification email
 */
export function ticketCreatedEmailTemplate(params: {
  recipientEmail: string;
  ticketId: string;
  subject: string;
  category: string;
}): { html: string; text: string; subject: string } {
  const platformName = process.env.MAIL_FROM_NAME || "Ephemera";
  const supportEmail = process.env.MAIL_FROM_ADDRESS || appConfig.defaultAdminEmail;

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket đã được tạo - ${platformName}</title>
  ${getBaseStyles()}
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h2 style="margin:0;font-size:24px;">🎫 ${platformName}</h2>
      </div>
      <div class="email-body">
        <h1 class="greeting">Yêu cầu hỗ trợ đã được tiếp nhận</h1>
        <p class="message">Xin chào <strong>${params.recipientEmail}</strong>,</p>
        <p class="message">Chúng tôi đã nhận được yêu cầu hỗ trợ của bạn và sẽ phản hồi trong thời gian sớm nhất.</p>
        <div class="info-box">
          <strong>Chi tiết ticket:</strong><br>
          📋 Mã ticket: <code>${params.ticketId.slice(0, 8)}</code><br>
          📝 Tiêu đề: ${params.subject}<br>
          🏷️ Danh mục: ${params.category}
        </div>
        <div style="text-align:center;margin:32px 0;">
          <a href="${appConfig.webUrl}/support/tickets/${params.ticketId}" class="cta-button">📬 Xem ticket</a>
        </div>
        <p class="message" style="font-size:14px;color:#6b7280;">Bạn sẽ nhận được thông báo khi có phản hồi từ đội ngũ hỗ trợ.</p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} ${platformName} | ${supportEmail}</div>
    </div>
  </div>
</body>
</html>
`;

  const text = `Yêu cầu hỗ trợ đã được tiếp nhận - ${platformName}

Xin chào ${params.recipientEmail},

Chúng tôi đã nhận được yêu cầu hỗ trợ của bạn.

Chi tiết ticket:
- Mã ticket: ${params.ticketId.slice(0, 8)}
- Tiêu đề: ${params.subject}
- Danh mục: ${params.category}

Xem ticket tại: ${appConfig.webUrl}/support/tickets/${params.ticketId}

---
${platformName} | ${supportEmail}`;

  return {
    html,
    text,
    subject: `🎫 Ticket #${params.ticketId.slice(0, 8)} đã được tạo - ${platformName}`,
  };
}

/**
 * Generate support ticket reply notification email
 */
export function ticketReplyEmailTemplate(params: {
  recipientEmail: string;
  ticketId: string;
  ticketSubject: string;
  replierName: string;
  replyContent: string;
}): { html: string; text: string; subject: string } {
  const platformName = process.env.MAIL_FROM_NAME || "Ephemera";
  const supportEmail = process.env.MAIL_FROM_ADDRESS || appConfig.defaultAdminEmail;

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phản hồi ticket - ${platformName}</title>
  ${getBaseStyles()}
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h2 style="margin:0;font-size:24px;">💬 ${platformName}</h2>
      </div>
      <div class="email-body">
        <h1 class="greeting">Có phản hồi mới cho ticket của bạn</h1>
        <p class="message">Xin chào <strong>${params.recipientEmail}</strong>,</p>
        <p class="message"><strong>${params.replierName}</strong> đã phản hồi ticket "<em>${params.ticketSubject}</em>":</p>
        <div class="info-box" style="background:#f3f4f6;">
          ${params.replyContent.replace(/\n/g, '<br>')}
        </div>
        <div style="text-align:center;margin:32px 0;">
          <a href="${appConfig.webUrl}/support/tickets/${params.ticketId}" class="cta-button">💬 Xem và trả lời</a>
        </div>
      </div>
      <div class="footer">© ${new Date().getFullYear()} ${platformName} | ${supportEmail}</div>
    </div>
  </div>
</body>
</html>
`;

  const text = `Phản hồi ticket - ${platformName}

Xin chào ${params.recipientEmail},

${params.replierName} đã phản hồi ticket "${params.ticketSubject}":

---
${params.replyContent}
---

Xem và trả lời tại: ${appConfig.webUrl}/support/tickets/${params.ticketId}

---
${platformName} | ${supportEmail}`;

  return {
    html,
    text,
    subject: `💬 Phản hồi ticket: ${params.ticketSubject} - ${platformName}`,
  };
}
