/**
 * SDK Core - Webhook Signature Verifier
 * Verifies HMAC-SHA256 signatures for webhook payloads
 */

import * as crypto from 'crypto';

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify webhook signature
 * @param payload - Raw request body as string
 * @param signature - Value of X-Ephemera-Signature header
 * @param secret - Your webhook secret
 * @param timestamp - Value of X-Ephemera-Timestamp header (Unix seconds)
 * @param toleranceSeconds - Max age for signature (default 5 minutes)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSeconds = 300
): VerifyResult {
  // Validate timestamp freshness
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);

  if (age > toleranceSeconds) {
    return {
      valid: false,
      error: `Timestamp expired: ${age}s old (max ${toleranceSeconds}s)`,
    };
  }

  // Calculate expected signature
  const signaturePayload = `${timestamp}.${payload}`;
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
  const expectedSignature = `sha256=${expectedHmac}`;

  // Constant-time comparison
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    return { valid: isValid };
  } catch {
    return { valid: false, error: 'Signature format mismatch' };
  }
}

/**
 * Extract webhook data from request headers
 */
export function extractWebhookHeaders(headers: Record<string, string | undefined>): {
  signature: string | null;
  timestamp: number | null;
  event: string | null;
} {
  const normalize = (key: string) =>
    headers[key] || headers[key.toLowerCase()] || null;

  const signature = normalize('X-Ephemera-Signature');
  const timestampStr = normalize('X-Ephemera-Timestamp');
  const event = normalize('X-Ephemera-Event');

  return {
    signature,
    timestamp: timestampStr ? parseInt(timestampStr, 10) : null,
    event,
  };
}
