/**
 * Alias Validation Utilities
 * Validates ephemeral inbox aliases for format and reserved words
 */

// Alias format: 3-30 chars, alphanumeric + dots/hyphens, must start/end with alphanumeric
const ALIAS_REGEX = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;

// Reserved words that cannot be used as aliases
const RESERVED_WORDS = [
  'admin', 'administrator', 'support', 'help', 'postmaster',
  'abuse', 'noreply', 'no-reply', 'system', 'root', 'webmaster',
  'hostmaster', 'security', 'info', 'contact', 'sales', 'billing',
  'mailer-daemon', 'null', 'nobody', 'test', 'spam', 'phishing'
];

// Patterns that suggest abuse attempts
const ABUSE_PATTERNS = [
  /^.{0,2}$/, // Too short (less than 3 chars)
  /(.)\1{4,}/, // Same char repeated 5+ times
  /^[0-9]+$/, // All numbers
];

export interface AliasValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Sanitize alias input (lowercase, trim)
 */
export function sanitizeAlias(alias: string): string {
  return alias.toLowerCase().trim();
}

/**
 * Validate alias format, reserved words, and abuse patterns
 */
export function validateAlias(alias: string): AliasValidationResult {
  const sanitized = sanitizeAlias(alias);

  // Check minimum length
  if (sanitized.length < 3) {
    return { valid: false, error: 'Alias must be at least 3 characters' };
  }

  // Check maximum length
  if (sanitized.length > 30) {
    return { valid: false, error: 'Alias must be at most 30 characters' };
  }

  // Check regex pattern
  if (!ALIAS_REGEX.test(sanitized)) {
    return {
      valid: false,
      error: 'Alias must start/end with letter or number, can contain dots, hyphens, underscores'
    };
  }

  // Check reserved words
  if (RESERVED_WORDS.includes(sanitized)) {
    return { valid: false, error: 'This alias is reserved and cannot be used' };
  }

  // Check abuse patterns
  for (const pattern of ABUSE_PATTERNS) {
    if (pattern.test(sanitized)) {
      return { valid: false, error: 'Invalid alias format' };
    }
  }

  // Check for consecutive special characters
  if (/[._-]{2,}/.test(sanitized)) {
    return { valid: false, error: 'Alias cannot have consecutive special characters' };
  }

  return { valid: true, sanitized };
}

/**
 * Check if alias is a reserved word
 */
export function isReservedAlias(alias: string): boolean {
  return RESERVED_WORDS.includes(sanitizeAlias(alias));
}
