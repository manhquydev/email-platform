/**
 * Secret validation utilities for critical security configurations
 * Validates encryption keys and secrets at startup to prevent security misconfigurations
 */

/**
 * Validates TOTP encryption key format and strength
 * TOTP key must be 64 hex characters (32 bytes) for AES-256 encryption
 * @throws Error if key is invalid or weak
 */
export function validateTotpKey(key: string): void {
  if (!key) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY is required. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (key.length !== 64) {
    throw new Error(
      `TOTP_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Current length: ${key.length}`
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY must contain only valid hexadecimal characters (0-9, a-f, A-F)'
    );
  }

  // Reject all-zeros key (insecure default)
  if (/^0+$/.test(key)) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY cannot be all zeros. Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Reject low-entropy keys (repeated patterns)
  const uniqueChars = new Set(key.toLowerCase()).size;
  if (uniqueChars < 8) {
    throw new Error(
      `TOTP_ENCRYPTION_KEY has low entropy (only ${uniqueChars} unique characters). Use a cryptographically random key.`
    );
  }
}

/**
 * Validates JWT secret strength
 * @throws Error if secret is too short or weak
 */
export function validateJwtSecret(secret: string): void {
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }

  if (secret.length < 32) {
    throw new Error(
      `JWT_SECRET must be at least 32 characters. Current length: ${secret.length}`
    );
  }

  // Check for common weak secrets
  const weakSecrets = ['secret', 'password', 'changeme', 'your-secret-key'];
  if (weakSecrets.some(weak => secret.toLowerCase().includes(weak))) {
    throw new Error(
      'JWT_SECRET appears to be a weak/default value. Use a cryptographically random secret.'
    );
  }
}

/**
 * Run all secret validations - call at server startup in production
 */
export function validateAllSecrets(config: {
  totpEncryptionKey: string;
  jwtSecret: string;
}): void {
  validateTotpKey(config.totpEncryptionKey);
  validateJwtSecret(config.jwtSecret);
}
