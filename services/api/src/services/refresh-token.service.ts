/**
 * Refresh Token Service
 * Implements secure refresh token rotation with reuse detection
 * Phase 2: JWT & Token Security
 */
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { tokenRevocationService } from "./token-revocation.service";

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class RefreshTokenService {
  /**
   * Create a new refresh token for a user
   * @param userId - User ID
   * @param userAgent - Browser/device info
   * @param ipAddress - Client IP
   * @returns The raw token (only returned once) and token record
   */
  static async createToken(
    userId: string,
    expiresInDays: number = 7,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ token: string; familyId: string }> {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        familyId,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return { token, familyId };
  }

  /**
   * Rotate a refresh token - invalidate old, create new
   * Implements reuse detection: if token already used, revoke entire family
   * @param oldToken - The current refresh token
   * @param userAgent - Browser/device info
   * @param ipAddress - Client IP
   * @returns New token or null if invalid/revoked
   */
  static async rotateToken(
    oldToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ token: string; userId: string; familyId: string; expiresInDays: number } | null> {
    const oldTokenHash = crypto.createHash("sha256").update(oldToken).digest("hex");

    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: oldTokenHash },
      include: { user: true },
    });

    if (!existingToken) {
      console.warn("[RefreshToken] Token not found");
      return null;
    }

    // Check if token is expired
    if (existingToken.expiresAt < new Date()) {
      console.warn("[RefreshToken] Token expired");
      return null;
    }

    // Check if token was revoked
    if (existingToken.revokedAt) {
      console.warn("[RefreshToken] Token was revoked");
      return null;
    }

    // SECURITY: Reuse detection - if token was already used, revoke entire family
    if (existingToken.usedAt) {
      console.error("[RefreshToken] SECURITY: Token reuse detected! Revoking family:", existingToken.familyId);
      await this.revokeFamily(existingToken.familyId);
      // Also revoke all user tokens via Redis for immediate effect
      await tokenRevocationService.revokeAllUserTokens(existingToken.userId, 86400);
      return null;
    }

    // Mark old token as used
    await prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { usedAt: new Date() },
    });

    // Calculate original duration to preserve the "remember me" flag intention
    const originalDurationDays = Math.max(1, Math.round((existingToken.expiresAt.getTime() - existingToken.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

    // Create new token in same family
    const newToken = crypto.randomBytes(32).toString("hex");
    const newTokenHash = crypto.createHash("sha256").update(newToken).digest("hex");
    const expiresAt = new Date(Date.now() + originalDurationDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId: existingToken.userId,
        familyId: existingToken.familyId, // Same family
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      token: newToken,
      userId: existingToken.userId,
      familyId: existingToken.familyId,
      expiresInDays: originalDurationDays
    };
  }

  /**
   * Revoke a specific token
   */
  static async revokeToken(token: string): Promise<boolean> {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    try {
      await prisma.refreshToken.update({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Revoke all tokens in a family (for reuse detection)
   */
  static async revokeFamily(familyId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke all tokens for a user (logout all devices)
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    // Also set Redis flag for immediate effect on access tokens
    await tokenRevocationService.revokeAllUserTokens(userId, 86400);
  }

  /**
   * Get active sessions for a user
   */
  static async getActiveSessions(userId: string) {
    return prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        userAgent: true,
        ipAddress: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Cleanup expired tokens (run periodically)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });
    return result.count;
  }
}
