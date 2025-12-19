import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined,
  // For development, ignore TLS errors
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  }
});

interface EmailTemplate {
  to: string;
  subject: string;
  template: string;
  data?: Record<string, any>;
}

export async function sendEmail({ to, subject, template, data }: EmailTemplate) {
  const htmlContent = renderTemplate(template, data);
  const textContent = renderTextTemplate(template, data);

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@manhquy.click',
    to,
    subject,
    html: htmlContent,
    text: textContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

function renderTemplate(template: string, data?: Record<string, any>): string {
  const templates: Record<string, (data?: any) => string> = {
    'email-verification': (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to TempMail Pro</h1>
            </div>
            <div class="content">
              <h2>Verify your email address</h2>
              <p>Hi ${data?.email},</p>
              <p>Thanks for signing up for TempMail Pro! Please click the button below to verify your email address:</p>
              <p style="text-align: center;">
                <a href="${data?.verificationLink}" class="button">Verify Email</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${data?.verificationLink}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br>The TempMail Pro Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    'password-reset': (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hi ${data?.email},</p>
              <p>We received a request to reset your TempMail Pro password. Click the button below to reset it:</p>
              <p style="text-align: center;">
                <a href="${data?.resetLink}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${data?.resetLink}</p>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br>The TempMail Pro Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    'welcome-free': (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .feature { margin: 15px 0; padding: 15px; background: white; border-radius: 6px; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to TempMail Pro!</h1>
            </div>
            <div class="content">
              <h2>Your free account is ready</h2>
              <p>Hi ${data?.name || data?.email},</p>
              <p>Welcome to TempMail Pro! Your free account includes:</p>

              <div class="feature">
                <h3>🔒 Privacy & Security</h3>
                <p>Keep your real email address private when signing up for services</p>
              </div>

              <div class="feature">
                <h3>⚡ Instant Delivery</h3>
                <p>Receive emails instantly in your temporary inbox</p>
              </div>

              <div class="feature">
                <h3>📱 Mobile Friendly</h3>
                <p>Access your temporary emails from any device</p>
              </div>

              <div class="feature">
                <h3>📊 Usage Tracking</h3>
                <p>Monitor your email usage with our free tier limits</p>
              </div>

              <p>Your free tier includes:</p>
              <ul>
                <li>1 custom domain</li>
                <li>10 temporary inboxes</li>
                <li>100 emails per month</li>
                <li>24-hour email retention</li>
              </ul>

              <p style="text-align: center;">
                <a href="${process.env.WEB_URL}/dashboard" class="button">Go to Dashboard</a>
              </p>

              <p>Need more features? <a href="${process.env.WEB_URL}/pricing">Upgrade to Premium</a> for unlimited emails, longer retention, and advanced features!</p>
            </div>
            <div class="footer">
              <p>Best regards,<br>The TempMail Pro Team</p>
            </div>
          </div>
        </body>
      </html>
    `
  };

  return templates[template]?.(data) || '';
}

function renderTextTemplate(template: string, data?: Record<string, any>): string {
  const templates: Record<string, (data?: any) => string> = {
    'email-verification': (data) => `
Welcome to TempMail Pro!

Please verify your email address by clicking this link:
${data?.verificationLink}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

Best regards,
The TempMail Pro Team
    `,
    'password-reset': (data) => `
Password Reset Request

Hi ${data?.email},

We received a request to reset your TempMail Pro password. Click this link to reset it:
${data?.resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
The TempMail Pro Team
    `,
    'welcome-free': (data) => `
Welcome to TempMail Pro!

Hi ${data?.name || data?.email},

Welcome to TempMail Pro! Your free account includes:
- 1 custom domain
- 10 temporary inboxes
- 100 emails per month
- 24-hour email retention

Access your dashboard: ${process.env.WEB_URL}/dashboard

Need more features? Upgrade to Premium for unlimited emails, longer retention, and advanced features!

Best regards,
The TempMail Pro Team
    `
  };

  return templates[template]?.(data) || '';
}