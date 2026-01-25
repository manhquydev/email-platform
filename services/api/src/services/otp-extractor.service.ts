/**
 * OTP Extraction Service
 * Extracts verification codes from emails using regex patterns + AI fallback
 */

import { prisma } from '../lib/prisma';
import { appConfig } from '../config';

export interface OTPResult {
  code: string;
  type: 'numeric' | 'alphanumeric' | 'link';
  confidence: 'high' | 'medium' | 'low';
  source: 'regex' | 'ai';
}

// Common OTP patterns from major services
const OTP_PATTERNS = [
  // 4-8 digit numeric codes (most common)
  { regex: /\b(?:code|mã|otp|pin|verification|xác nhận)[:\s]*(\d{4,8})\b/i, type: 'numeric' as const, confidence: 'high' as const },
  { regex: /\b(\d{4,8})\s*(?:is your|là mã|verification|xác nhận)/i, type: 'numeric' as const, confidence: 'high' as const },
  { regex: /(?:enter|nhập)[:\s]*(\d{4,8})\b/i, type: 'numeric' as const, confidence: 'high' as const },

  // Standalone 6-digit codes (common OTP length)
  { regex: /\b(\d{6})\b(?=.*(?:code|mã|verify|xác nhận|expire|hết hạn))/i, type: 'numeric' as const, confidence: 'medium' as const },

  // Alphanumeric codes (some services use these)
  { regex: /\b(?:code|mã)[:\s]*([A-Z0-9]{6,10})\b/i, type: 'alphanumeric' as const, confidence: 'medium' as const },

  // Verification links (magic links, confirm links)
  { regex: /(https?:\/\/[^\s<>"]+(?:verify|confirm|activate|token|code)[^\s<>"]*)/i, type: 'link' as const, confidence: 'medium' as const },
];

// Services with known OTP formats for higher confidence
const KNOWN_SERVICES: Record<string, RegExp> = {
  'google': /\b(\d{6})\b/,
  'microsoft': /\b(\d{6,8})\b/,
  'facebook': /\b(\d{6})\b/,
  'twitter': /\b(\d{6})\b/,
  'paypal': /\b(\d{6})\b/,
  'amazon': /\b(\d{6})\b/,
  'apple': /\b(\d{6})\b/,
  'github': /\b(\d{6})\b/,
  'stripe': /\b(\d{6})\b/,
  'shopee': /\b(\d{6})\b/,
  'grab': /\b(\d{6})\b/,
  'momo': /\b(\d{6})\b/,
  'vnpay': /\b(\d{6})\b/,
};

export class OTPExtractorService {
  /**
   * Extract OTP from email content
   */
  static extractFromContent(
    content: string,
    fromAddress?: string | null
  ): OTPResult | null {
    if (!content) return null;

    // Check if sender is a known service for higher confidence
    const senderDomain = fromAddress?.split('@')[1]?.toLowerCase() || '';
    const knownService = Object.keys(KNOWN_SERVICES).find(s => senderDomain.includes(s));

    // Try known service pattern first
    if (knownService) {
      const match = content.match(KNOWN_SERVICES[knownService]);
      if (match) {
        return {
          code: match[1],
          type: 'numeric',
          confidence: 'high',
          source: 'regex',
        };
      }
    }

    // Try general patterns
    for (const pattern of OTP_PATTERNS) {
      const match = content.match(pattern.regex);
      if (match && match[1]) {
        return {
          code: match[1],
          type: pattern.type,
          confidence: pattern.confidence,
          source: 'regex',
        };
      }
    }

    return null;
  }

  /**
   * Extract OTP using AI for complex cases
   */
  static async extractWithAI(content: string): Promise<OTPResult | null> {
    if (!appConfig.ai.enabled || !appConfig.ai.geminiApiKey) {
      return null;
    }

    const prompt = `Extract the verification code or OTP from this email.
Return ONLY the code itself (numbers/letters), nothing else.
If no code found, return "NONE".

Email content:
${content.substring(0, 2000)}

Code:`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${appConfig.ai.geminiModel}:generateContent?key=${appConfig.ai.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 32 },
          }),
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text || text === 'NONE' || text.length > 20) return null;

      return {
        code: text,
        type: /^\d+$/.test(text) ? 'numeric' : 'alphanumeric',
        confidence: 'medium',
        source: 'ai',
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract and save OTP for a message
   */
  static async extractAndSave(messageId: string): Promise<OTPResult | null> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { textBody: true, htmlBody: true, fromAddress: true, extractedOtp: true },
    });

    if (!message) return null;

    // Return cached result if exists
    if (message.extractedOtp) {
      return {
        code: message.extractedOtp,
        type: /^\d+$/.test(message.extractedOtp) ? 'numeric' : 'alphanumeric',
        confidence: 'high',
        source: 'regex',
      };
    }

    // Prepare content (prefer text, fallback to stripped HTML)
    let content = message.textBody || '';
    if (!content && message.htmlBody) {
      content = message.htmlBody
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Try regex first
    let result = this.extractFromContent(content, message.fromAddress);

    // Fallback to AI for complex cases
    if (!result) {
      result = await this.extractWithAI(content);
    }

    // Save to database
    if (result) {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          extractedOtp: result.code,
          otpConfidence: result.confidence,
          otpExtractedAt: new Date(),
        },
      });
    }

    return result;
  }
}
