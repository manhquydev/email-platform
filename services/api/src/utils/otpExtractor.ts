/**
 * OTP Extractor Utility for API
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
];

export interface OTPResult {
    code: string;
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Extract OTP code from email text
 */
export function extractOTP(text: string): OTPResult | null {
    if (!text) return null;

    // Clean the text
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // Try each pattern
    for (const pattern of OTP_PATTERNS) {
        const match = cleanText.match(pattern);
        if (match && match[1]) {
            const code = match[1];

            // Validate code length (4-8 digits)
            if (code.length >= 4 && code.length <= 8) {
                const confidence = getConfidence(cleanText);
                return { code, confidence };
            }
        }
    }

    return null;
}

/**
 * Determine confidence level based on context
 */
function getConfidence(text: string): 'high' | 'medium' | 'low' {
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
    const mediumConfidenceKeywords = ['code', 'mã', 'verify', 'confirm'];

    if (mediumConfidenceKeywords.some(kw => textLower.includes(kw))) {
        return 'medium';
    }

    return 'low';
}

/**
 * Check if text likely contains an OTP
 */
export function hasOTP(text: string): boolean {
    return extractOTP(text) !== null;
}
