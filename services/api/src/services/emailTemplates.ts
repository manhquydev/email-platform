/**
 * Email Templates Service
 * Professional HTML email templates for Ephemera
 */

import { appConfig } from "../config";

interface TemplateParams {
  recipientEmail?: string;
  verificationUrl?: string;
  platformName?: string;
  supportEmail?: string;
  currentYear?: number;
}

const getBaseStyles = () => `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f4f4f5;
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .email-container {
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    .email-header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      padding: 32px;
      text-align: center;
    }
    
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      text-decoration: none;
    }
    
    .logo-icon {
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .email-body {
      padding: 40px 32px;
    }
    
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 16px;
    }
    
    .message {
      font-size: 16px;
      color: #4a4a4a;
      margin-bottom: 24px;
    }
    
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: 10px;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
    }
    
    .alternative-link {
      margin-top: 24px;
      padding: 16px;
      background: #f4f4f5;
      border-radius: 8px;
      font-size: 13px;
      color: #6b7280;
      word-break: break-all;
    }
    
    .alternative-link strong {
      display: block;
      margin-bottom: 8px;
      color: #4a4a4a;
    }
    
    .info-box {
      margin-top: 24px;
      padding: 16px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 0 8px 8px 0;
      font-size: 14px;
      color: #92400e;
    }
    
    .email-footer {
      padding: 24px 32px;
      background: #f9fafb;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer-text {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    .footer-links {
      margin-top: 16px;
    }
    
    .footer-links a {
      color: #6366f1;
      text-decoration: none;
      margin: 0 8px;
      font-size: 13px;
    }
    
    .footer-links a:hover {
      text-decoration: underline;
    }
    
    .social-links {
      margin-top: 16px;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      color: #9ca3af;
    }
    
    @media only screen and (max-width: 480px) {
      .email-wrapper {
        padding: 20px 10px;
      }
      
      .email-body {
        padding: 24px 20px;
      }
      
      .greeting {
        font-size: 18px;
      }
      
      .message {
        font-size: 15px;
      }
      
      .cta-button {
        display: block;
        padding: 16px 24px;
      }
    }
  </style>
`;

const getHeader = (platformName: string) => `
  <div class="email-header">
    <a href="${appConfig.webUrl}" class="logo">
      <div class="logo-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
      </div>
      <span>${platformName}</span>
    </a>
  </div>
`;

const getFooter = (params: TemplateParams) => `
  <div class="email-footer">
    <p class="footer-text">
      Email này được gửi tự động từ ${params.platformName}.<br>
      Vui lòng không trả lời email này.
    </p>
    <p class="footer-text">
      © ${params.currentYear} ${params.platformName}. All rights reserved.
    </p>
    <div class="footer-links">
      <a href="${appConfig.webUrl}">Trang chủ</a>
      <a href="${appConfig.webUrl}/privacy">Chính sách bảo mật</a>
      <a href="mailto:${params.supportEmail}">Liên hệ</a>
    </div>
  </div>
`;

/**
 * Generate verification email HTML
 */
export function verificationEmailTemplate(params: {
  verificationUrl: string;
  recipientEmail: string;
}): { html: string; text: string; subject: string } {
  const templateParams: TemplateParams = {
    recipientEmail: params.recipientEmail,
    verificationUrl: params.verificationUrl,
    platformName: process.env.MAIL_FROM_NAME || "Ephemera",
    supportEmail: process.env.MAIL_FROM_ADDRESS || appConfig.defaultAdminEmail,
    currentYear: new Date().getFullYear(),
  };

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Xác thực tài khoản - ${templateParams.platformName}</title>
  ${getBaseStyles()}
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      ${getHeader(templateParams.platformName!)}
      
      <div class="email-body">
        <h1 class="greeting">Xin chào! 👋</h1>
        
        <p class="message">
          Cảm ơn bạn đã đăng ký tài khoản tại <strong>${templateParams.platformName}</strong>. 
          Để hoàn tất quá trình đăng ký và bắt đầu sử dụng dịch vụ, vui lòng xác thực địa chỉ email của bạn.
        </p>
        
        <div class="cta-container">
          <a href="${params.verificationUrl}" class="cta-button">
            ✓ Xác thực email ngay
          </a>
        </div>
        
        <div class="alternative-link">
          <strong>Nút không hoạt động?</strong>
          Sao chép và dán liên kết sau vào trình duyệt:<br>
          <a href="${params.verificationUrl}" style="color: #6366f1;">${params.verificationUrl}</a>
        </div>
        
        <div class="info-box">
          <strong>⏰ Lưu ý:</strong> Liên kết này chỉ có hiệu lực trong vòng <strong>24 giờ</strong>. 
          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
        </div>
      </div>
      
      ${getFooter(templateParams)}
    </div>
  </div>
</body>
</html>
`;

  const text = `
Xác thực tài khoản ${templateParams.platformName}

Xin chào!

Cảm ơn bạn đã đăng ký tài khoản tại ${templateParams.platformName}.
Để hoàn tất quá trình đăng ký, vui lòng xác thực email bằng cách truy cập liên kết sau:

${params.verificationUrl}

Liên kết này chỉ có hiệu lực trong vòng 24 giờ.
Nếu bạn không yêu cầu đăng ký tài khoản này, vui lòng bỏ qua email này.

---
${templateParams.platformName}
Email: ${templateParams.supportEmail}
Website: ${appConfig.webUrl}
`;

  return {
    html,
    text,
    subject: `✉️ Xác thực email - ${templateParams.platformName}`,
  };
}

/**
 * Generate welcome email after verification
 */
export function welcomeEmailTemplate(params: {
  recipientEmail: string;
}): { html: string; text: string; subject: string } {
  const templateParams: TemplateParams = {
    recipientEmail: params.recipientEmail,
    platformName: process.env.MAIL_FROM_NAME || "Ephemera",
    supportEmail: process.env.MAIL_FROM_ADDRESS || appConfig.defaultAdminEmail,
    currentYear: new Date().getFullYear(),
  };

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Chào mừng đến ${templateParams.platformName}!</title>
  ${getBaseStyles()}
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      ${getHeader(templateParams.platformName!)}
      
      <div class="email-body">
        <h1 class="greeting">Chào mừng bạn! 🎉</h1>
        
        <p class="message">
          Tài khoản của bạn đã được xác thực thành công. Chào mừng bạn đến với 
          <strong>${templateParams.platformName}</strong> - nền tảng quản lý email chuyên nghiệp.
        </p>
        
        <p class="message">
          Với ${templateParams.platformName}, bạn có thể:
        </p>
        
        <ul style="color: #4a4a4a; margin-bottom: 24px; padding-left: 20px;">
          <li style="margin-bottom: 8px;">📧 Tạo và quản lý nhiều địa chỉ email tạm thời</li>
          <li style="margin-bottom: 8px;">🔒 Bảo vệ email chính của bạn khỏi spam</li>
          <li style="margin-bottom: 8px;">⚡ Nhận email ngay lập tức trong thời gian thực</li>
          <li style="margin-bottom: 8px;">📎 Xem và tải xuống file đính kèm dễ dàng</li>
        </ul>
        
        <div class="cta-container">
          <a href="${appConfig.webUrl}/app" class="cta-button">
            🚀 Bắt đầu sử dụng ngay
          </a>
        </div>
      </div>
      
      ${getFooter(templateParams)}
    </div>
  </div>
</body>
</html>
`;

  const text = `
Chào mừng đến ${templateParams.platformName}!

Xin chào!

Tài khoản của bạn đã được xác thực thành công. Chào mừng bạn đến với ${templateParams.platformName}!

Với ${templateParams.platformName}, bạn có thể:
- Tạo và quản lý nhiều địa chỉ email tạm thời
- Bảo vệ email chính của bạn khỏi spam  
- Nhận email ngay lập tức trong thời gian thực
- Xem và tải xuống file đính kèm dễ dàng

Truy cập ngay: ${appConfig.webUrl}/app

---
${templateParams.platformName}
Email: ${templateParams.supportEmail}
Website: ${appConfig.webUrl}
`;

  return {
    html,
    text,
    subject: `🎉 Chào mừng đến ${templateParams.platformName}!`,
  };
}

/**
 * Generate password reset email
 */
export function passwordResetEmailTemplate(params: {
  resetUrl: string;
  recipientEmail: string;
}): { html: string; text: string; subject: string } {
  const templateParams: TemplateParams = {
    recipientEmail: params.recipientEmail,
    platformName: process.env.MAIL_FROM_NAME || "TempMail Pro",
    supportEmail: process.env.MAIL_FROM_ADDRESS || appConfig.defaultAdminEmail,
    currentYear: new Date().getFullYear(),
  };

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Đặt lại mật khẩu - ${templateParams.platformName}</title>
  ${getBaseStyles()}
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      ${getHeader(templateParams.platformName!)}
      
      <div class="email-body">
        <h1 class="greeting">Đặt lại mật khẩu 🔐</h1>
        
        <p class="message">
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản 
          <strong>${params.recipientEmail}</strong> tại ${templateParams.platformName}.
        </p>
        
        <div class="cta-container">
          <a href="${params.resetUrl}" class="cta-button">
            🔑 Đặt lại mật khẩu
          </a>
        </div>
        
        <div class="alternative-link">
          <strong>Nút không hoạt động?</strong>
          Sao chép và dán liên kết sau vào trình duyệt:<br>
          <a href="${params.resetUrl}" style="color: #6366f1;">${params.resetUrl}</a>
        </div>
        
        <div class="info-box">
          <strong>⚠️ Không phải bạn?</strong> Nếu bạn không yêu cầu đặt lại mật khẩu, 
          vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.
        </div>
      </div>
      
      ${getFooter(templateParams)}
    </div>
  </div>
</body>
</html>
`;

  const text = `
Đặt lại mật khẩu ${templateParams.platformName}

Xin chào!

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản ${params.recipientEmail}.

Để đặt lại mật khẩu, vui lòng truy cập liên kết sau:
${params.resetUrl}

Liên kết này chỉ có hiệu lực trong vòng 1 giờ.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

---
${templateParams.platformName}
Email: ${templateParams.supportEmail}
Website: ${appConfig.webUrl}
`;

  return {
    html,
    text,
    subject: `🔐 Đặt lại mật khẩu - ${templateParams.platformName}`,
  };
}
