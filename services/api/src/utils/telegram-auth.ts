// Telegram Login Widget verification utilities
import crypto from "crypto";

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Verify Telegram Login Widget data using HMAC-SHA256
 * @see https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
  const { hash, ...checkData } = data;

  // 1. Build check string (sorted keys, newline separated, exclude empty values)
  const checkString = Object.keys(checkData)
    .sort()
    .filter((k) => {
      const value = checkData[k as keyof typeof checkData];
      return value !== undefined && value !== null && value !== "";
    })
    .map((k) => `${k}=${checkData[k as keyof typeof checkData]}`)
    .join("\n");

  // 2. Secret key = SHA256(botToken)
  const secretKey = crypto.createHash("sha256").update(botToken).digest();

  // 3. HMAC-SHA256(checkString, secretKey)
  const hmac = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");

  return hmac === hash;
}

/**
 * Check if auth_date is fresh (not too old)
 * @param authDate Unix timestamp from Telegram
 * @param maxAgeSeconds Maximum age in seconds (default: 24 hours)
 */
export function isAuthDateFresh(authDate: number, maxAgeSeconds = 86400): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - authDate < maxAgeSeconds;
}
