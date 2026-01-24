/**
 * Token Revocation Service
 * Uses Redis to maintain a denylist of revoked JWT tokens
 * Implements fail-open pattern for Redis failures (with logging)
 */
import Redis from "ioredis";

// Redis config from environment
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);

class TokenRevocationService {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor() {
    this.initRedis();
  }

  private initRedis(): void {
    try {
      this.redis = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on("connect", () => {
        this.isConnected = true;
        console.log("[TokenRevocation] Redis connected");
      });

      this.redis.on("error", (err) => {
        this.isConnected = false;
        console.error("[TokenRevocation] Redis error:", err.message);
      });

      this.redis.on("close", () => {
        this.isConnected = false;
      });

      // Attempt connection
      this.redis.connect().catch((err) => {
        console.warn("[TokenRevocation] Redis connection failed, running in fail-open mode:", err.message);
      });
    } catch (err) {
      console.warn("[TokenRevocation] Failed to initialize Redis:", err);
    }
  }

  /**
   * Revoke a token by its JTI (JWT ID)
   * @param jti - The JWT ID to revoke
   * @param expiresInSeconds - TTL for the revocation entry (should match token expiry)
   */
  async revokeToken(jti: string, expiresInSeconds: number): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      console.warn("[TokenRevocation] Redis unavailable, cannot revoke token");
      return false;
    }

    try {
      await this.redis.setex(`revoked:${jti}`, expiresInSeconds, "1");
      console.log(`[TokenRevocation] Token revoked: ${jti.slice(0, 8)}...`);
      return true;
    } catch (err) {
      console.error("[TokenRevocation] Failed to revoke token:", err);
      return false;
    }
  }

  /**
   * Check if a token is revoked
   * Implements fail-open: if Redis is unavailable, returns false (allow)
   * @param jti - The JWT ID to check
   */
  async isRevoked(jti: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      // Fail-open: allow request if Redis unavailable, but log it
      console.warn("[TokenRevocation] Redis unavailable, fail-open allowing token");
      return false;
    }

    try {
      const result = await this.redis.exists(`revoked:${jti}`);
      return result === 1;
    } catch (err) {
      console.error("[TokenRevocation] Failed to check revocation:", err);
      // Fail-open on error
      return false;
    }
  }

  /**
   * Revoke all tokens for a user by storing a "revoked before" timestamp
   * Any token issued before this timestamp should be rejected
   * @param userId - The user ID to revoke all tokens for
   * @param ttlSeconds - How long to keep the revocation record
   */
  async revokeAllUserTokens(userId: string, ttlSeconds: number = 86400): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      console.warn("[TokenRevocation] Redis unavailable, cannot revoke user tokens");
      return false;
    }

    try {
      const revokedAt = Date.now();
      await this.redis.setex(`user-revoked:${userId}`, ttlSeconds, revokedAt.toString());
      console.log(`[TokenRevocation] All tokens revoked for user: ${userId.slice(0, 8)}...`);
      return true;
    } catch (err) {
      console.error("[TokenRevocation] Failed to revoke user tokens:", err);
      return false;
    }
  }

  /**
   * Check if a token was issued before user-wide revocation
   * @param userId - The user ID
   * @param tokenIssuedAt - Token issued timestamp (seconds since epoch)
   */
  async isUserTokenRevoked(userId: string, tokenIssuedAt: number): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false; // Fail-open
    }

    try {
      const revokedAtStr = await this.redis.get(`user-revoked:${userId}`);
      if (!revokedAtStr) return false;

      const revokedAt = parseInt(revokedAtStr, 10);
      // Token is revoked if it was issued before the revocation timestamp
      return tokenIssuedAt * 1000 < revokedAt;
    } catch (err) {
      console.error("[TokenRevocation] Failed to check user token revocation:", err);
      return false;
    }
  }

  /**
   * Check Redis connection status
   */
  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
    }
  }
}

// Singleton instance
export const tokenRevocationService = new TokenRevocationService();
