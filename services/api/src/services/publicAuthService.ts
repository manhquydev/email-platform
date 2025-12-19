import { PrismaClient, User, UserQuota, ReferralCode } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { sendEmail } from './emailService';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;

const TIER_LIMITS = {
  free: {
    maxDomains: 1,
    maxInboxes: 10,
    maxEmailsPerMonth: 100,
    emailRetentionHours: 24
  },
  premium: {
    maxDomains: 10,
    maxInboxes: 100,
    maxEmailsPerMonth: 10000,
    emailRetentionHours: 168 // 1 week
  },
  business: {
    maxDomains: 100,
    maxInboxes: 1000,
    maxEmailsPerMonth: 100000,
    emailRetentionHours: 720 // 30 days
  }
};

export class PublicAuthService {
  // Public signup without authentication requirement
  async signup(data: {
    email: string;
    password: string;
    source?: string;
    referralCode?: string;
  }) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('USER_ALREADY_EXISTS');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Handle referral code
    let referrerId: string | null = null;
    if (data.referralCode) {
      const referral = await prisma.referralCode.findUnique({
        where: { code: data.referralCode, active: true }
      });

      if (referral) {
        referrerId = referral.referrerId;
        await prisma.referralCode.update({
          where: { id: referral.id },
          data: { referralCount: { increment: 1 } }
        });
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: passwordHash,
        emailVerified: new Date(), // Temporarily set as verified, will send verification email
        verificationToken,
        verificationTokenExpiresAt,
        tier: 'free',
        source: data.source || 'direct'
      },
      include: {
        userQuota: true
      }
    });

    // Create user quota
    const quota = await prisma.userQuota.create({
      data: {
        userId: user.id,
        ...TIER_LIMITS.free
      }
    });

    // Send verification email
    await sendEmail({
      to: user.email,
      subject: 'Verify your TempMail Pro account',
      template: 'email-verification',
      data: {
        verificationLink: `${process.env.WEB_URL}/verify?token=${verificationToken}`,
        email: user.email
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_SIGNUP',
        meta: {
          source: data.source,
          referrerId,
          tier: 'free'
        }
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tier: user.tier,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        emailVerified: user.emailVerified,
        quota
      },
      token
    };
  }

  // Public login
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { userQuota: true }
    });

    if (!user || !user.password) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Check if user is disabled
    if (user.isDisabled) {
      throw new Error('ACCOUNT_DISABLED');
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        meta: { source: 'public' }
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tier: user.tier,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        emailVerified: user.emailVerified,
        quota: user.userQuota
      },
      token
    };
  }

  // Email verification
  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiresAt: { gt: new Date() }
      }
    });

    if (!user) {
      throw new Error('INVALID_VERIFICATION_TOKEN');
    }

    // Mark email as verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpiresAt: null
      },
      include: { userQuota: true }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        meta: { source: 'public' }
      }
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        tier: updatedUser.tier,
        emailVerified: updatedUser.emailVerified,
        quota: updatedUser.userQuota
      }
    };
  }

  // Request password reset
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists
      return { success: true };
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpiresAt: resetExpiresAt
      }
    });

    // Send reset email
    await sendEmail({
      to: user.email,
      subject: 'Reset your TempMail Pro password',
      template: 'password-reset',
      data: {
        resetLink: `${process.env.WEB_URL}/reset-password?token=${resetToken}`,
        email: user.email
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        meta: { source: 'public' }
      }
    });

    return { success: true };
  }

  // Reset password
  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetExpiresAt: { gt: new Date() }
      }
    });

    if (!user) {
      throw new Error('INVALID_RESET_TOKEN');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        resetToken: null,
        resetExpiresAt: null
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        meta: { source: 'public' }
      }
    });

    return {
      success: true,
      message: 'Password reset successfully'
    };
  }

  // Generate referral code for user
  async generateReferralCode(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Check if user already has a referral code
    const existingCode = await prisma.referralCode.findFirst({
      where: { referrerId: userId }
    });

    if (existingCode) {
      return { code: existingCode.code };
    }

    // Generate unique referral code
    let code: string;
    let attempts = 0;
    do {
      code = this.generateReferralCodeString();
      attempts++;
      if (attempts > 10) {
        throw new Error('UNABLE_TO_GENERATE_CODE');
      }
    } while (await prisma.referralCode.findUnique({ where: { code } }));

    // Create referral code
    const referralCode = await prisma.referralCode.create({
      data: {
        code,
        referrerId: userId
      }
    });

    return { code: referralCode.code };
  }

  private generateReferralCodeString(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Upgrade user tier
  async upgradeTier(userId: string, newTier: 'premium' | 'business') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userQuota: true }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Update user tier
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { tier: newTier }
    });

    // Update user quota
    if (user.userQuota) {
      await prisma.userQuota.update({
        where: { userId: userId },
        data: TIER_LIMITS[newTier]
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'TIER_UPGRADED',
        meta: {
          oldTier: user.tier,
          newTier,
          source: 'public'
        }
      }
    });

    return {
      success: true,
      tier: newTier,
      limits: TIER_LIMITS[newTier]
    };
  }
}