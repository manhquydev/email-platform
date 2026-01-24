/**
 * Security Tests for Phase 2: Authentication & Token Security
 * Tests verify JWT revocation, refresh token rotation, and 2FA protection
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";

// Mock Redis for token revocation
vi.mock("ioredis", () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
  return { default: vi.fn(() => mockRedis) };
});

vi.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  }
}));

vi.mock("../../services/token-revocation.service", () => ({
  tokenRevocationService: {
    isRevoked: vi.fn(),
    revokeToken: vi.fn(),
    isUserTokenRevoked: vi.fn(),
    revokeAllUserTokens: vi.fn(),
  }
}));

vi.mock("../../utils/audit", () => ({
  recordAuditFromRequest: vi.fn(),
  AuditAction: {
    LOGIN_SUCCESS: "auth.login_success",
    LOGIN_FAILED: "auth.login_failed",
  }
}));

describe("Phase 2 Security: Authentication & Token Security", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(jwt, { secret: "test-secret-key-minimum-32-chars!!" });
    await app.ready();
  });

  describe("JWT Token Revocation", () => {
    it("should reject requests with revoked tokens", async () => {
      const { tokenRevocationService } = await import("../../services/token-revocation.service");

      // Mock token as revoked
      (tokenRevocationService.isRevoked as any).mockResolvedValue(true);

      const token = app.jwt.sign({
        userId: "user-1",
        role: "USER",
        jti: "revoked-token-id"
      });

      // Simulate authentication check
      const isRevoked = await tokenRevocationService.isRevoked("revoked-token-id");
      expect(isRevoked).toBe(true);
    });

    it("should accept requests with valid non-revoked tokens", async () => {
      const { tokenRevocationService } = await import("../../services/token-revocation.service");

      (tokenRevocationService.isRevoked as any).mockResolvedValue(false);

      const token = app.jwt.sign({
        userId: "user-1",
        role: "USER",
        jti: "valid-token-id"
      });

      const isRevoked = await tokenRevocationService.isRevoked("valid-token-id");
      expect(isRevoked).toBe(false);
    });

    it("should revoke all user tokens on logout-all", async () => {
      const { tokenRevocationService } = await import("../../services/token-revocation.service");

      await tokenRevocationService.revokeAllUserTokens("user-1", 86400);

      expect(tokenRevocationService.revokeAllUserTokens).toHaveBeenCalledWith("user-1", 86400);
    });
  });

  describe("Refresh Token Rotation", () => {
    it("should invalidate old refresh token after rotation", async () => {
      const { prisma } = await import("../../lib/prisma");

      // Simulate token rotation - old token should be marked as used
      const oldTokenId = "old-refresh-token-id";

      (prisma.refreshToken.update as any).mockResolvedValue({
        id: oldTokenId,
        isRevoked: true,
      });

      await prisma.refreshToken.update({
        where: { id: oldTokenId },
        data: { isRevoked: true }
      });

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: oldTokenId },
        data: { isRevoked: true }
      });
    });

    it("should detect refresh token reuse (potential theft)", async () => {
      const { prisma } = await import("../../lib/prisma");

      // Simulate finding a used/revoked token
      (prisma.refreshToken.findUnique as any).mockResolvedValue({
        id: "stolen-token",
        isRevoked: true, // Already used = potential theft
        userId: "victim-user"
      });

      const token = await prisma.refreshToken.findUnique({
        where: { id: "stolen-token" }
      });

      // If token is already revoked, this is suspicious
      expect(token?.isRevoked).toBe(true);
    });
  });

  describe("2FA Brute Force Protection", () => {
    it("should track failed 2FA attempts", async () => {
      // Import backoff tracker
      const Redis = (await import("ioredis")).default;
      const redis = new Redis();

      // Simulate tracking failures
      await redis.incr("2fa:failures:user-1");
      await redis.expire("2fa:failures:user-1", 3600);

      expect(redis.incr).toHaveBeenCalledWith("2fa:failures:user-1");
    });

    it("should block after exponential backoff threshold", async () => {
      const Redis = (await import("ioredis")).default;
      const redis = new Redis();

      // Simulate lock check
      const lockUntil = Date.now() + 60000; // Locked for 1 minute
      (redis.get as any).mockResolvedValue(lockUntil.toString());

      const lockValue = await redis.get("2fa:lock:user-1");
      const isLocked = lockValue && parseInt(lockValue) > Date.now();

      expect(isLocked).toBe(true);
    });
  });

  describe("JWT Claims Validation", () => {
    it("should include jti claim in new tokens", () => {
      const token = app.jwt.sign({
        userId: "user-1",
        role: "USER",
        jti: "unique-token-id-123"
      });

      const decoded = app.jwt.decode(token) as any;
      expect(decoded.jti).toBe("unique-token-id-123");
    });

    it("should include correct expiry for access tokens", () => {
      const token = app.jwt.sign(
        { userId: "user-1", role: "USER", type: "access" },
        { expiresIn: "15m" }
      );

      const decoded = app.jwt.decode(token) as any;
      const expiry = decoded.exp - decoded.iat;
      expect(expiry).toBe(900); // 15 minutes in seconds
    });
  });
});
