/**
 * Webhook signature verification for Ephemera SDK
 * Verifies HMAC-SHA256 signatures with timestamp validation
 */

import { createHmac, timingSafeEqual } from 'crypto';

/** Webhook verification result */
export interface WebhookVerifyResult {
  valid: boolean;
  error?: string;
}

/** Webhook payload after verification */
export interface WebhookPayload<T = unknown> {
  event: string;
  data: T;
  timestamp: number;
}

/** Webhook event types */
export type WebhookEventType =
  | 'message.received'
  | 'message.deleted'
  | 'inbox.created'
  | 'inbox.deleted'
  | 'inbox.expired';

/** Standard webhook headers */
export interface WebhookHeaders {
  signature: string;
  timestamp: number;
}

/**
 * Extract webhook headers from request
 */
export function extractWebhookHeaders(
  headers: Headers | Record<string, string | undefined>
): WebhookHeaders | null {
  const getHeader = (name: string): string | undefined => {
    if (headers instanceof Headers) {
      return headers.get(name) || undefined;
    }
    return headers[name] || headers[name.toLowerCase()];
  };

  const signature = getHeader('X-Ephemera-Signature');
  const timestampStr = getHeader('X-Ephemera-Timestamp');

  if (!signature || !timestampStr) {
    return null;
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return null;
  }

  return { signature, timestamp };
}

/**
 * Verify webhook signature from Ephemera
 *
 * @param payload - Raw request body as string
 * @param signature - Signature from X-Ephemera-Signature header
 * @param secret - Webhook secret from dashboard
 * @param timestamp - Timestamp from X-Ephemera-Timestamp header
 * @param toleranceSeconds - Max age of webhook in seconds (default: 300)
 *
 * @example
 * ```typescript
 * const { valid, error } = verifyWebhookSignature(
 *   rawBody,
 *   req.headers['x-ephemera-signature'],
 *   process.env.WEBHOOK_SECRET,
 *   parseInt(req.headers['x-ephemera-timestamp'])
 * );
 * ```
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSeconds = 300
): WebhookVerifyResult {
  // Validate timestamp to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);

  if (age > toleranceSeconds) {
    return {
      valid: false,
      error: `Timestamp too old: ${age}s > ${toleranceSeconds}s tolerance`,
    };
  }

  // Compute expected signature
  const signaturePayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');

  // Extract hash from signature (remove 'sha256=' prefix if present)
  const providedHash = signature.startsWith('sha256=')
    ? signature.slice(7)
    : signature;

  // Constant-time comparison to prevent timing attacks
  try {
    const isValid = timingSafeEqual(
      Buffer.from(providedHash),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid signature format' };
  }
}

/**
 * Parse and verify a webhook request
 * Combines header extraction, verification, and payload parsing
 */
export function parseWebhook<T = unknown>(
  rawBody: string,
  headers: Headers | Record<string, string | undefined>,
  secret: string,
  toleranceSeconds = 300
): { success: true; payload: WebhookPayload<T> } | { success: false; error: string } {
  const webhookHeaders = extractWebhookHeaders(headers);
  if (!webhookHeaders) {
    return { success: false, error: 'Missing webhook headers' };
  }

  const verification = verifyWebhookSignature(
    rawBody,
    webhookHeaders.signature,
    secret,
    webhookHeaders.timestamp,
    toleranceSeconds
  );

  if (!verification.valid) {
    return { success: false, error: verification.error || 'Verification failed' };
  }

  try {
    const data = JSON.parse(rawBody);
    return {
      success: true,
      payload: {
        event: data.event,
        data: data.data as T,
        timestamp: webhookHeaders.timestamp,
      },
    };
  } catch {
    return { success: false, error: 'Invalid JSON payload' };
  }
}
