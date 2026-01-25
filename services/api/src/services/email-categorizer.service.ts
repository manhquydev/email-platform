/**
 * Email Categorizer Service
 * Auto-categorizes emails on ingestion
 */

export type EmailCategory = 'verification' | 'newsletter' | 'receipt' | 'promotional' | 'personal' | 'notification' | 'unknown';

export interface CategorizationResult {
  category: EmailCategory;
  confidence: number;
  source: 'rules' | 'ai';
}

// Category detection patterns
const CATEGORY_PATTERNS: Record<EmailCategory, RegExp[]> = {
  verification: [
    /(?:verification|verify|confirm|xác nhận|xác minh)/i,
    /(?:otp|code|mã|pin)\s*(?:is|:|\s)\s*\d/i,
    /(?:activate|kích hoạt)\s*(?:your|tài khoản)/i,
    /(?:reset|đặt lại)\s*(?:password|mật khẩu)/i,
  ],
  receipt: [
    /(?:receipt|invoice|hóa đơn|biên lai)/i,
    /(?:order|đơn hàng)\s*(?:#|number|số)/i,
    /(?:payment|thanh toán)\s*(?:confirmed|thành công)/i,
    /(?:transaction|giao dịch)\s*(?:id|#)/i,
  ],
  newsletter: [
    /(?:newsletter|bản tin|weekly|monthly|daily digest)/i,
    /(?:unsubscribe|hủy đăng ký)/i,
    /(?:view in browser|xem trên trình duyệt)/i,
  ],
  promotional: [
    /(?:sale|giảm giá|discount|khuyến mãi)/i,
    /(?:\d+%\s*off|giảm\s*\d+%)/i,
    /(?:limited time|thời gian có hạn|exclusive offer)/i,
    /(?:free shipping|miễn phí vận chuyển)/i,
  ],
  notification: [
    /(?:notification|thông báo)/i,
    /(?:alert|cảnh báo)/i,
    /(?:reminder|nhắc nhở)/i,
    /(?:update|cập nhật)/i,
  ],
  personal: [
    /^(?:re:|fwd:|tr:)/i, // Reply/forward indicators
  ],
  unknown: [],
};

// Sender domain hints for categories
const SENDER_HINTS: Record<string, EmailCategory> = {
  'noreply': 'notification',
  'no-reply': 'notification',
  'newsletter': 'newsletter',
  'news': 'newsletter',
  'marketing': 'promotional',
  'promo': 'promotional',
  'sales': 'promotional',
  'billing': 'receipt',
  'invoice': 'receipt',
  'order': 'receipt',
  'security': 'verification',
  'verify': 'verification',
  'auth': 'verification',
};

export class EmailCategorizerService {
  /**
   * Categorize email based on content and metadata
   */
  static categorize(params: {
    subject?: string | null;
    fromAddress?: string | null;
    textBody?: string | null;
    htmlBody?: string | null;
  }): CategorizationResult {
    const { subject, fromAddress, textBody, htmlBody } = params;
    const content = `${subject || ''} ${textBody || htmlBody || ''}`;

    // Check sender hints first
    if (fromAddress) {
      const localPart = fromAddress.split('@')[0]?.toLowerCase() || '';
      for (const [hint, category] of Object.entries(SENDER_HINTS)) {
        if (localPart.includes(hint)) {
          return { category, confidence: 0.7, source: 'rules' };
        }
      }
    }

    // Check content patterns
    const scores: Record<EmailCategory, number> = {
      verification: 0,
      newsletter: 0,
      receipt: 0,
      promotional: 0,
      personal: 0,
      notification: 0,
      unknown: 0,
    };

    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          scores[category as EmailCategory] += 1;
        }
      }
    }

    // Find highest scoring category
    let maxScore = 0;
    let bestCategory: EmailCategory = 'unknown';

    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category as EmailCategory;
      }
    }

    // Calculate confidence based on score
    const confidence = maxScore > 0 ? Math.min(0.9, 0.5 + maxScore * 0.15) : 0.3;

    return {
      category: bestCategory,
      confidence,
      source: 'rules',
    };
  }

  /**
   * Categorize using AI for ambiguous cases
   */
  static async categorizeWithAI(content: string): Promise<CategorizationResult | null> {
    const { appConfig } = await import('../config');

    if (!appConfig.ai.enabled || !appConfig.ai.geminiApiKey) return null;

    const prompt = `Categorize this email into one of: verification, newsletter, receipt, promotional, personal, notification, unknown.
Return ONLY the category name, nothing else.

Email:
${content.substring(0, 2000)}

Category:`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${appConfig.ai.geminiModel}:generateContent?key=${appConfig.ai.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 16 },
          }),
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();

      const validCategories: EmailCategory[] = ['verification', 'newsletter', 'receipt', 'promotional', 'personal', 'notification', 'unknown'];
      const category = validCategories.find(c => text?.includes(c)) || 'unknown';

      return {
        category,
        confidence: 0.75,
        source: 'ai',
      };
    } catch {
      return null;
    }
  }
}
