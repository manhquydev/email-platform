/**
 * OTP Extractor Utility
 * Automatically detects and extracts OTP/verification codes from email content
 */

// Common OTP patterns in English and Vietnamese
const OTP_PATTERNS = [
    // Direct code patterns
    /(?:code|mã|otp|verification|xác thực|xác nhận|pin)[:\s]+(\d{4,8})/i,
    /(\d{6})\s+(?:is your|là mã|is the)/i,
    /(?:enter|nhập|use)[:\s]+(\d{4,8})/i,

    // "Your code is X" patterns
    /(?:your|mã của bạn)[^:]*?(?:code|mã)[^:]*?[:：]\s*(\d{4,8})/i,
    /(?:verification|xác minh)[^:]*?[:：]\s*(\d{4,8})/i,

    // Standalone 6-digit codes (common for 2FA)
    /\b(\d{6})\b(?=.*(?:verify|xác|confirm|code|mã))/i,

    // Code in quotes or special formatting
    /["'「」]\s*(\d{4,8})\s*["'「」]/,

    // Security/Login codes
    /(?:security|login|đăng nhập)[^:]*?[:：]\s*(\d{4,8})/i,

    // Alphanumeric codes (common for some services)
    /(?:code|mã)[:\s]+([A-Z0-9]{6,8})/i,
    /(?:verification|xác thực)[:\s]+([A-Z0-9]{6,8})/i,

    // Subject line patterns
    /(?:^|\s)(\d{6})(?:\s|$)/,  // Standalone 6-digit in subject
    /mã:\s*(\d{4,8})/i,
    /code:\s*(\d{4,8})/i,

    // Common service patterns
    /(?:google|facebook|twitter|microsoft|apple)[^:]*?[:：]\s*(\d{4,8})/i,
    /(?:telegram|whatsapp|signal)[^:]*?[:：]\s*(\d{4,8})/i,

    // Password reset codes
    /(?:reset|đặt lại|password|mật khẩu)[^:]*?[:：]\s*(\d{4,8})/i,

    // Bold/emphasized codes in HTML
    /<(?:b|strong)>\s*(\d{4,8})\s*<\/(?:b|strong)>/i,
];

// Patterns that should NOT be considered OTP (false positives)
const EXCLUDE_PATTERNS = [
    /\$\d+/, // Money amounts
    /\d{4}[-/]\d{2}[-/]\d{2}/, // Dates
    /\d{2}:\d{2}/, // Times
    /\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/, // Card numbers
];

export interface OTPResult {
    code: string;
    confidence: 'high' | 'medium' | 'low';
    context?: string;
}

/**
 * Extract OTP code from email text
 */
export function extractOTP(text: string): OTPResult | null {
    if (!text) return null;

    // Limit text length to prevent ReDoS/performance issues (max 5KB)
    const MAX_LENGTH = 5000;
    const truncatedText = text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH) : text;

    // Clean the text
    const cleanText = truncatedText.replace(/\s+/g, ' ').trim();

    // Check for exclusion patterns
    for (const pattern of EXCLUDE_PATTERNS) {
        if (pattern.test(cleanText)) {
            return null;
        }
    }

    // Try each pattern
    for (const pattern of OTP_PATTERNS) {
        const match = cleanText.match(pattern);
        if (match && match[1]) {
            const code = match[1];

            // Validate code length (4-8 digits)
            if (code.length >= 4 && code.length <= 8) {
                // Determine confidence based on pattern specificity
                const confidence = getConfidence(pattern, cleanText);

                // Get surrounding context
                const context = getContext(cleanText, match.index || 0);

                return {
                    code,
                    confidence,
                    context
                };
            }
        }
    }

    return null;
}

/**
 * Determine confidence level based on pattern and context
 */
function getConfidence(_pattern: RegExp, text: string): 'high' | 'medium' | 'low' {
    const textLower = text.toLowerCase();

    // High confidence indicators
    const highConfidenceKeywords = [
        'verification code',
        'mã xác thực',
        'otp',
        'one-time',
        'security code',
        'mã bảo mật'
    ];

    if (highConfidenceKeywords.some(kw => textLower.includes(kw))) {
        return 'high';
    }

    // Medium confidence
    const mediumConfidenceKeywords = [
        'code',
        'mã',
        'verify',
        'confirm'
    ];

    if (mediumConfidenceKeywords.some(kw => textLower.includes(kw))) {
        return 'medium';
    }

    return 'low';
}

/**
 * Get surrounding context for the OTP
 */
function getContext(text: string, matchIndex: number): string {
    const start = Math.max(0, matchIndex - 30);
    const end = Math.min(text.length, matchIndex + 50);
    return text.slice(start, end).trim();
}

/**
 * Check if text likely contains an OTP
 */
export function hasOTP(text: string): boolean {
    return extractOTP(text) !== null;
}

/**
 * Extract all potential OTPs from text (for edge cases with multiple codes)
 */
export function extractAllOTPs(text: string): OTPResult[] {
    const results: OTPResult[] = [];
    const seen = new Set<string>();

    for (const pattern of OTP_PATTERNS) {
        const matches = text.matchAll(new RegExp(pattern, 'gi'));
        for (const match of matches) {
            if (match[1] && !seen.has(match[1])) {
                seen.add(match[1]);
                results.push({
                    code: match[1],
                    confidence: getConfidence(pattern, text),
                    context: getContext(text, match.index || 0)
                });
            }
        }
    }

    // Sort by confidence
    return results.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.confidence] - order[b.confidence];
    });
}
