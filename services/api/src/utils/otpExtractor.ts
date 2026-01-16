/**
 * Enhanced OTP Extractor
 * Detects verification codes from email content with high accuracy
 * Supports multiple formats: 4-8 digits, various languages, formatted codes
 */

// Pattern categories for better organization and confidence scoring
const PATTERNS = {
  // Explicit OTP labels (highest confidence)
  explicit: [
    /(?:otp|one[- ]?time[- ]?(?:password|code|pin))[:\s]+(\d{4,8})/i,
    /(?:mã\s*(?:xác\s*thực|xác\s*nhận|otp))[:\s]*(\d{4,8})/i,
    /(?:verification|security|login)\s*code[:\s]+(\d{4,8})/i,
    /(?:code|mã)[:\s]+(\d{6})/i,
  ],

  // "Your code is X" patterns
  contextual: [
    /(?:your|the)\s+(?:verification\s+)?code\s+is[:\s]+(\d{4,8})/i,
    /(?:mã\s+của\s+bạn)[:\s]*(\d{4,8})/i,
    /(\d{6})\s+is\s+your\s+(?:verification\s+)?code/i,
    /(?:use|enter|input)[:\s]+(\d{4,8})\s+(?:to|for)/i,
  ],

  // Codes in special formatting
  formatted: [
    /["'「」【】\[\]]\s*(\d{4,8})\s*["'「」【】\[\]]/,
    /\*\*(\d{4,8})\*\*/,
    /<(?:b|strong|code)>(\d{4,8})<\/(?:b|strong|code)>/i,
    /style="[^"]*font-size[^"]*"[^>]*>(\d{4,8})</i,
  ],

  // PIN patterns
  pin: [
    /(?:pin|passcode)[:\s]+(\d{4,6})/i,
    /(?:mã\s*pin)[:\s]*(\d{4,6})/i,
  ],

  // 2FA patterns
  twoFactor: [
    /(?:2fa|two[- ]?factor|authenticator)[:\s]+(\d{6})/i,
    /(?:google|microsoft|authy)\s+authenticator[:\s]+(\d{6})/i,
  ],

  // Generic standalone (lowest confidence)
  standalone: [
    /\b(\d{6})\b(?=.*(?:verify|xác|confirm|code|mã|enter|nhập))/i,
  ],
};

// Keywords that increase confidence
const HIGH_CONFIDENCE_KEYWORDS = [
  'verification code', 'mã xác thực', 'mã xác nhận',
  'otp', 'one-time', 'one time',
  'security code', 'mã bảo mật',
  '2fa', 'two-factor', 'two factor',
  'authenticator',
];

const MEDIUM_CONFIDENCE_KEYWORDS = [
  'code', 'mã', 'verify', 'confirm', 'xác',
  'pin', 'passcode', 'password',
];

export interface OTPResult {
  code: string;
  confidence: 'high' | 'medium' | 'low';
  pattern?: string;
}

/**
 * Validate OTP code - reject common non-OTP patterns
 */
function isValidOTP(code: string): boolean {
  // Must be 4-8 digits
  if (!/^\d{4,8}$/.test(code)) return false;

  // Reject common non-OTP patterns
  const invalidPatterns = [
    /^(\d)\1+$/,      // All same digit (1111, 000000)
    /^123456$/,       // Sequential
    /^654321$/,       // Reverse sequential
    /^(19|20)\d{2}$/, // Years (1999, 2024)
    /^0{4,}$/,        // All zeros
  ];

  return !invalidPatterns.some(p => p.test(code));
}

/**
 * Determine confidence level based on pattern and keywords
 */
function getConfidence(text: string, patternGroup: string): 'high' | 'medium' | 'low' {
  const textLower = text.toLowerCase();

  // Pattern group based confidence
  if (['explicit', 'twoFactor'].includes(patternGroup)) {
    return 'high';
  }

  // Keyword based confidence
  if (HIGH_CONFIDENCE_KEYWORDS.some(kw => textLower.includes(kw))) {
    return 'high';
  }

  if (MEDIUM_CONFIDENCE_KEYWORDS.some(kw => textLower.includes(kw))) {
    return 'medium';
  }

  if (['contextual', 'formatted'].includes(patternGroup)) {
    return 'medium';
  }

  return 'low';
}

/**
 * Extract OTP code from text content
 */
export function extractOTP(text: string): OTPResult | null {
  if (!text || text.length < 4) return null;

  // Clean and normalize text
  const cleanText = text
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
    .trim();

  // Try patterns in order of confidence
  const patternGroups: [string, RegExp[]][] = [
    ['explicit', PATTERNS.explicit],
    ['contextual', PATTERNS.contextual],
    ['formatted', PATTERNS.formatted],
    ['twoFactor', PATTERNS.twoFactor],
    ['pin', PATTERNS.pin],
    ['standalone', PATTERNS.standalone],
  ];

  for (const [groupName, patterns] of patternGroups) {
    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match?.[1]) {
        const code = match[1];

        // Validate code
        if (!isValidOTP(code)) continue;

        // Determine confidence
        const confidence = getConfidence(cleanText, groupName);

        return { code, confidence, pattern: groupName };
      }
    }
  }

  return null;
}

/**
 * Extract all possible OTPs (for debugging/testing)
 */
export function extractAllOTPs(text: string): OTPResult[] {
  const results: OTPResult[] = [];
  const seen = new Set<string>();

  const cleanText = text.replace(/\s+/g, ' ').trim();

  for (const [groupName, patterns] of Object.entries(PATTERNS)) {
    for (const pattern of patterns) {
      const globalPattern = new RegExp(pattern.source, pattern.flags + 'g');
      let match;

      while ((match = globalPattern.exec(cleanText)) !== null) {
        const code = match[1];
        if (code && isValidOTP(code) && !seen.has(code)) {
          seen.add(code);
          results.push({
            code,
            confidence: getConfidence(cleanText, groupName),
            pattern: groupName,
          });
        }
      }
    }
  }

  return results.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
}

/**
 * Check if text likely contains an OTP
 */
export function hasOTP(text: string): boolean {
  return extractOTP(text) !== null;
}
