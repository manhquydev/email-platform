import crypto from "crypto";

/**
 * Generate deterministic session ID from IP + User Agent
 * Same user = same ID within 15min window
 * Privacy-preserving (cannot reverse to IP)
 *
 * @param ip - Client IP address
 * @param userAgent - User-Agent header
 * @returns 16-character session ID
 */
export function generateSessionId(ip: string, userAgent: string): string {
  const timestamp = Math.floor(Date.now() / (15 * 60 * 1000)); // 15min window
  return crypto
    .createHash("sha256")
    .update(`${ip}-${userAgent}-${timestamp}`)
    .digest("hex")
    .slice(0, 16);
}
