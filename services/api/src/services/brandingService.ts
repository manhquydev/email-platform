import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { recordAudit } from '../utils/audit';

const prisma = new PrismaClient();

export interface BrandingConfig {
  logo?: {
    url: string;
    width?: number;
    height?: number;
  };
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
    accent?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
    customCss?: string;
  };
  emailTemplates?: {
    header?: string;
    footer?: string;
    banner?: string;
  };
  customDomain?: {
    enabled: boolean;
    domain?: string;
    verified: boolean;
    verificationToken?: string;
  };
  whiteLabel?: {
    enabled: boolean;
    hideBranding: boolean;
    customFooter?: string;
    customTerms?: string;
    customPrivacy?: string;
  };
}

export class BrandingService {
  /**
   * Get organization branding configuration
   */
  async getBranding(organizationId: string): Promise<BrandingConfig> {
    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { customTheme: true }
    });

    const defaultConfig: BrandingConfig = {
      colors: {
        primary: '#0066cc',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
        accent: '#17a2b8'
      },
      fonts: {
        heading: 'Inter, sans-serif',
        body: 'Inter, sans-serif'
      },
      customDomain: {
        enabled: false,
        verified: false
      },
      whiteLabel: {
        enabled: false,
        hideBranding: false
      }
    };

    return settings?.customTheme as BrandingConfig || defaultConfig;
  }

  /**
   * Update organization branding
   */
  async updateBranding(
    organizationId: string,
    userId: string,
    config: Partial<BrandingConfig>
  ): Promise<BrandingConfig> {
    // Validate hex colors
    if (config.colors) {
      for (const [key, value] of Object.entries(config.colors)) {
        if (value && !this.isValidHexColor(value)) {
          throw new Error(`Invalid hex color for ${key}: ${value}`);
        }
      }
    }

    // Get current config
    const currentConfig = await this.getBranding(organizationId);

    // Merge with new config
    const newConfig = {
      ...currentConfig,
      ...config,
      colors: { ...currentConfig.colors, ...config.colors },
      fonts: { ...currentConfig.fonts, ...config.fonts },
      customDomain: { ...currentConfig.customDomain, ...config.customDomain },
      whiteLabel: { ...currentConfig.whiteLabel, ...config.whiteLabel }
    };

    // Update in database
    await prisma.organizationSettings.update({
      where: { organizationId },
      data: {
        customTheme: newConfig as any,
        updatedAt: new Date()
      }
    });

    await recordAudit(userId, 'BRANDING_UPDATED', {
      organizationId,
      changes: Object.keys(config)
    });

    return newConfig;
  }

  /**
   * Upload logo for organization
   */
  async uploadLogo(
    organizationId: string,
    userId: string,
    file: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ url: string; width: number; height: number }> {
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(mimeType)) {
      throw new Error('Logo must be a JPG, PNG, or SVG file');
    }

    // Validate file size (max 2MB)
    if (file.length > 2 * 1024 * 1024) {
      throw new Error('Logo file size must be less than 2MB');
    }

    // In production, upload to S3 or similar
    // For now, store a placeholder URL
    const logoId = randomBytes(16).toString('hex');
    const extension = mimeType.split('/')[1];
    const url = `https://cdn.tempmail.pro/logos/${logoId}.${extension}`;

    // Get image dimensions (simplified)
    const dimensions = await this.getImageDimensions(file);

    // Update branding config
    await this.updateBranding(organizationId, userId, {
      logo: {
        url,
        width: dimensions.width,
        height: dimensions.height
      }
    });

    await recordAudit(userId, 'LOGO_UPLOADED', {
      organizationId,
      filename,
      mimeType,
      size: file.length
    });

    return { url, ...dimensions };
  }

  /**
   * Setup custom domain
   */
  async setupCustomDomain(
    organizationId: string,
    userId: string,
    domain: string
  ): Promise<{ verificationToken: string; dnsRecords: any[] }> {
    // Validate domain format
    if (!this.isValidDomain(domain)) {
      throw new Error('Invalid domain format');
    }

    const verificationToken = randomBytes(32).toString('hex');

    // Generate DNS records
    const dnsRecords = [
      {
        type: 'CNAME',
        name: domain,
        value: 'tempmail.pro',
        ttl: 3600
      },
      {
        type: 'TXT',
        name: `_tempmail-verify.${domain}`,
        value: verificationToken,
        ttl: 3600
      }
    ];

    // Update branding config
    await this.updateBranding(organizationId, userId, {
      customDomain: {
        enabled: true,
        domain,
        verified: false,
        verificationToken
      }
    });

    await recordAudit(userId, 'CUSTOM_DOMAIN_SETUP', {
      organizationId,
      domain,
      verificationToken
    });

    return { verificationToken, dnsRecords };
  }

  /**
   * Verify custom domain ownership
   */
  async verifyCustomDomain(
    organizationId: string,
    userId: string
  ): Promise<{ verified: boolean }> {
    const config = await this.getBranding(organizationId);

    if (!config.customDomain?.enabled || !config.customDomain.domain) {
      throw new Error('Custom domain not configured');
    }

    // In production, perform actual DNS verification
    // For now, simulate verification
    const verified = true; // Would be actual DNS check

    if (verified) {
      await this.updateBranding(organizationId, userId, {
        customDomain: {
          ...config.customDomain,
          verified: true,
          verificationToken: undefined
        }
      });

      await recordAudit(userId, 'CUSTOM_DOMAIN_VERIFIED', {
        organizationId,
        domain: config.customDomain.domain
      });
    }

    return { verified };
  }

  /**
   * Generate CSS for branding
   */
  async generateBrandingCSS(organizationId: string): Promise<string> {
    const config = await this.getBranding(organizationId);

    const cssVariables = `
:root {
  --brand-primary: ${config.colors?.primary || '#0066cc'};
  --brand-secondary: ${config.colors?.secondary || '#6c757d'};
  --brand-background: ${config.colors?.background || '#ffffff'};
  --brand-text: ${config.colors?.text || '#212529'};
  --brand-accent: ${config.colors?.accent || '#17a2b8'};
  --brand-font-heading: ${config.fonts?.heading || 'Inter, sans-serif'};
  --brand-font-body: ${config.fonts?.body || 'Inter, sans-serif'};
}`;

    const customCSS = config.fonts?.customCss || '';

    return `${cssVariables}\n\n${customCSS}`;
  }

  /**
   * Get branded email template
   */
  async getEmailTemplate(
    organizationId: string,
    templateType: 'welcome' | 'reset_password' | 'verification'
  ): Promise<string> {
    const config = await this.getBranding(organizationId);
    const css = await this.generateBrandingCSS(organizationId);

    // Base template
    const baseTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>${css}</style>
</head>
<body style="font-family: var(--brand-font-body); background: var(--brand-background); color: var(--brand-text); margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: var(--brand-background); border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    ${config.emailTemplates?.header ? config.emailTemplates.header : this.getDefaultHeader(config)}
    <div style="padding: 30px;">
      {{content}}
    </div>
    ${config.emailTemplates?.footer ? config.emailTemplates.footer : this.getDefaultFooter(config)}
  </div>
</body>
</html>`;

    // Template-specific content
    const templates = {
      welcome: `
        <h1 style="font-family: var(--brand-font-heading); color: var(--brand-primary); margin-bottom: 20px;">Welcome to TempMail Pro!</h1>
        <p>Thank you for joining our service. Your account is ready to use.</p>
        <p><a href="{{loginUrl}}" style="background: var(--brand-primary); color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Login to Your Account</a></p>
      `,
      reset_password: `
        <h1 style="font-family: var(--brand-font-heading); color: var(--brand-primary); margin-bottom: 20px;">Reset Your Password</h1>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <p><a href="{{resetUrl}}" style="background: var(--brand-primary); color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
        <p style="margin-top: 30px; font-size: 14px; opacity: 0.7;">If you didn't request this password reset, you can safely ignore this email.</p>
      `,
      verification: `
        <h1 style="font-family: var(--brand-font-heading); color: var(--brand-primary); margin-bottom: 20px;">Verify Your Email Address</h1>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="{{verificationUrl}}" style="background: var(--brand-primary); color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a></p>
        <p style="margin-top: 30px; font-size: 14px; opacity: 0.7;">This link will expire in 24 hours.</p>
      `
    };

    return baseTemplate.replace('{{content}}', templates[templateType]);
  }

  /**
   * Get default header HTML
   */
  private getDefaultHeader(config: BrandingConfig): string {
    if (config.logo?.url) {
      return `
        <div style="background: var(--brand-background); padding: 20px 30px; border-bottom: 1px solid #eee; text-align: center;">
          <img src="${config.logo.url}" alt="Logo" style="max-width: 200px; max-height: 60px;" />
        </div>`;
    }

    return `
      <div style="background: var(--brand-primary); padding: 20px 30px; text-align: center;">
        <h1 style="font-family: var(--brand-font-heading); color: white; margin: 0; font-size: 24px;">TempMail Pro</h1>
      </div>`;
  }

  /**
   * Get default footer HTML
   */
  private getDefaultFooter(config: BrandingConfig): string {
    if (config.whiteLabel?.hideBranding) {
      return `
        <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 14px;">
          ${config.whiteLabel?.customFooter || '<p>© 2024 All rights reserved.</p>'}
        </div>`;
    }

    return `
      <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 14px;">
        <p>Powered by <a href="https://tempmail.pro" style="color: var(--brand-primary);">TempMail Pro</a></p>
        <p>
          <a href="https://tempmail.pro/terms" style="color: var(--brand-text); text-decoration: none;">Terms</a> |
          <a href="https://tempmail.pro/privacy" style="color: var(--brand-text); text-decoration: none;">Privacy</a>
        </p>
      </div>`;
  }

  /**
   * Validate hex color
   */
  private isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  /**
   * Validate domain format
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  }

  /**
   * Get image dimensions (simplified)
   */
  private async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    // In production, use a proper image processing library
    // For now, return default dimensions
    return { width: 200, height: 60 };
  }
}

export const brandingService = new BrandingService();