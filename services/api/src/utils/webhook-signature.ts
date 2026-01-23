/**
 * Enhanced Webhook Signature Utility
 * Implements HMAC-SHA256 signing with timestamp for replay attack prevention
 *
 * Signature format:
 * - X-Ephemera-Signature: sha256=<hmac_hex>
 * - X-Ephemera-Timestamp: <unix_timestamp>
 */

import crypto from 'crypto';

export interface WebhookSignatureResult {
  signature: string;
  timestamp: number;
}

export interface WebhookHeaders {
  'X-Ephemera-Signature': string;
  'X-Ephemera-Timestamp': string;
  'X-Ephemera-Event': string;
}

/**
 * Sign a webhook payload with timestamp
 * @param payload - JSON string payload
 * @param secret - Webhook secret key
 * @param timestamp - Unix timestamp (optional, defaults to now)
 */
export function signWebhookPayload(
  payload: string,
  secret: string,
  timestamp?: number
): WebhookSignatureResult {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const signaturePayload = `${ts}.${payload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');

  return {
    signature: `sha256=${signature}`,
    timestamp: ts,
  };
}

/**
 * Verify a webhook signature
 * @param payload - JSON string payload
 * @param signature - Signature from X-Ephemera-Signature header
 * @param secret - Webhook secret key
 * @param timestamp - Timestamp from X-Ephemera-Timestamp header
 * @param toleranceSeconds - Maximum age of signature (default 5 minutes)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSeconds = 300
): { valid: boolean; error?: string } {
  // Check timestamp freshness
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);

  if (age > toleranceSeconds) {
    return {
      valid: false,
      error: `Timestamp too old: ${age}s (max ${toleranceSeconds}s)`,
    };
  }

  // Calculate expected signature
  const signaturePayload = `${timestamp}.${payload}`;
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
  const expectedSignature = `sha256=${expectedHmac}`;

  // Constant-time comparison to prevent timing attacks
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
 * Create webhook headers for delivery
 */
export function createWebhookHeaders(
  payload: string,
  secret: string,
  event: string
): WebhookHeaders {
  const { signature, timestamp } = signWebhookPayload(payload, secret);

  return {
    'X-Ephemera-Signature': signature,
    'X-Ephemera-Timestamp': timestamp.toString(),
    'X-Ephemera-Event': event,
  };
}

/**
 * Extract and validate webhook from request headers
 */
export function extractWebhookSignature(headers: Record<string, string | undefined>): {
  signature: string | null;
  timestamp: number | null;
  event: string | null;
} {
  const signature = headers['x-ephemera-signature'] || headers['X-Ephemera-Signature'] || null;
  const timestampStr = headers['x-ephemera-timestamp'] || headers['X-Ephemera-Timestamp'];
  const event = headers['x-ephemera-event'] || headers['X-Ephemera-Event'] || null;

  const timestamp = timestampStr ? parseInt(timestampStr, 10) : null;

  return { signature, timestamp, event };
}
