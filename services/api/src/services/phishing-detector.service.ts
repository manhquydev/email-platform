/**
 * Phishing Detector Service
 * Analyzes emails for phishing/scam indicators
 */

import { appConfig } from '../config';

export interface PhishingResult {
  riskScore: number; // 0-100
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  indicators: PhishingIndicator[];
  recommendation: string;
}

export interface PhishingIndicator {
  type: string;
  description: string;
  severity: number; // 1-10
}

// Suspicious TLDs often used in phishing
const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.club', '.online', '.site', '.work', '.click',
  '.link', '.gq', '.ml', '.cf', '.tk', '.ga', '.pw',
];

// Common brand impersonation targets
const IMPERSONATION_TARGETS = [
  { brand: 'paypal', domains: ['paypal.com'] },
  { brand: 'amazon', domains: ['amazon.com', 'amazon.co'] },
  { brand: 'apple', domains: ['apple.com', 'icloud.com'] },
  { brand: 'microsoft', domains: ['microsoft.com', 'outlook.com', 'live.com'] },
  { brand: 'google', domains: ['google.com', 'gmail.com'] },
  { brand: 'facebook', domains: ['facebook.com', 'fb.com'] },
  { brand: 'netflix', domains: ['netflix.com'] },
  { brand: 'bank', domains: [] }, // Generic banking keywords
];

// Urgent/fear language patterns
const URGENCY_PATTERNS = [
  /urgent|immediately|suspended|locked|verify now|action required/i,
  /account.*(suspend|terminat|clos|block|limit)/i,
  /within\s*\d+\s*(hour|minute|day)/i,
  /last\s*(chance|warning|notice)/i,
  /unusual\s*(activity|login|access)/i,
];

export class PhishingDetectorService {
  /**
   * Analyze email for phishing indicators
   */
  static analyze(params: {
    fromAddress?: string | null;
    subject?: string | null;
    textBody?: string | null;
    htmlBody?: string | null;
    spfResult?: string | null;
    dkimResult?: string | null;
    dmarcResult?: string | null;
  }): PhishingResult {
    const indicators: PhishingIndicator[] = [];
    let totalScore = 0;

    // 1. Check email authentication (SPF/DKIM/DMARC)
    const authScore = this.checkAuthentication(params, indicators);
    totalScore += authScore;

    // 2. Check sender domain
    const senderScore = this.checkSenderDomain(params.fromAddress, indicators);
    totalScore += senderScore;

    // 3. Check content for urgency/fear tactics
    const content = params.textBody || params.htmlBody || '';
    const urgencyScore = this.checkUrgencyTactics(content, params.subject, indicators);
    totalScore += urgencyScore;

    // 4. Check URLs in content
    const urlScore = this.checkUrls(params.htmlBody || '', params.fromAddress, indicators);
    totalScore += urlScore;

    // 5. Check for brand impersonation
    const impersonationScore = this.checkImpersonation(
      params.fromAddress,
      content,
      indicators
    );
    totalScore += impersonationScore;

    // Normalize score to 0-100
    const riskScore = Math.min(100, Math.round(totalScore));

    return {
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      indicators,
      recommendation: this.getRecommendation(riskScore),
    };
  }

  private static checkAuthentication(
    params: { spfResult?: string | null; dkimResult?: string | null; dmarcResult?: string | null },
    indicators: PhishingIndicator[]
  ): number {
    let score = 0;

    if (params.spfResult === 'fail' || params.spfResult === 'softfail') {
      indicators.push({
        type: 'auth_spf_fail',
        description: 'SPF authentication failed - sender may be spoofed',
        severity: 7,
      });
      score += 20;
    }

    if (params.dkimResult === 'fail') {
      indicators.push({
        type: 'auth_dkim_fail',
        description: 'DKIM signature invalid - email may be tampered',
        severity: 8,
      });
      score += 25;
    }

    if (params.dmarcResult === 'fail') {
      indicators.push({
        type: 'auth_dmarc_fail',
        description: 'DMARC policy failed - high risk of spoofing',
        severity: 9,
      });
      score += 30;
    }

    return score;
  }

  private static checkSenderDomain(
    fromAddress: string | null | undefined,
    indicators: PhishingIndicator[]
  ): number {
    if (!fromAddress) return 0;

    let score = 0;
    const domain = fromAddress.split('@')[1]?.toLowerCase() || '';

    // Check suspicious TLDs
    if (SUSPICIOUS_TLDS.some(tld => domain.endsWith(tld))) {
      indicators.push({
        type: 'suspicious_tld',
        description: `Sender uses suspicious TLD: ${domain}`,
        severity: 5,
      });
      score += 15;
    }

    // Check for lookalike domains (e.g., paypa1.com, amaz0n.com)
    if (/[0-9]/.test(domain) && /payp|amaz|googl|micros|faceb|appl/i.test(domain)) {
      indicators.push({
        type: 'lookalike_domain',
        description: 'Domain appears to impersonate a known brand',
        severity: 8,
      });
      score += 25;
    }

    return score;
  }

  private static checkUrgencyTactics(
    content: string,
    subject: string | null | undefined,
    indicators: PhishingIndicator[]
  ): number {
    let score = 0;
    const fullText = `${subject || ''} ${content}`;

    for (const pattern of URGENCY_PATTERNS) {
      if (pattern.test(fullText)) {
        indicators.push({
          type: 'urgency_tactic',
          description: 'Email uses urgent/fear language common in phishing',
          severity: 4,
        });
        score += 10;
        break; // Only count once
      }
    }

    return score;
  }

  private static checkUrls(
    htmlBody: string,
    fromAddress: string | null | undefined,
    indicators: PhishingIndicator[]
  ): number {
    let score = 0;
    const urlRegex = /href\s*=\s*["']?(https?:\/\/[^"'\s>]+)/gi;
    const senderDomain = fromAddress?.split('@')[1]?.toLowerCase() || '';

    let match;
    while ((match = urlRegex.exec(htmlBody)) !== null) {
      const url = match[1];
      try {
        const parsed = new URL(url);
        const linkDomain = parsed.hostname.toLowerCase();

        // Check if link domain differs from sender domain (potential phishing)
        if (senderDomain && !linkDomain.includes(senderDomain.split('.')[0])) {
          // Check if it's a known suspicious TLD
          if (SUSPICIOUS_TLDS.some(tld => linkDomain.endsWith(tld))) {
            indicators.push({
              type: 'suspicious_link',
              description: `Link to suspicious domain: ${linkDomain}`,
              severity: 6,
            });
            score += 15;
          }
        }

        // Check for IP address in URL (common phishing tactic)
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) {
          indicators.push({
            type: 'ip_url',
            description: 'Link uses IP address instead of domain name',
            severity: 7,
          });
          score += 20;
        }
      } catch {
        // Invalid URL
      }
    }

    return Math.min(score, 40); // Cap URL score contribution
  }

  private static checkImpersonation(
    fromAddress: string | null | undefined,
    content: string,
    indicators: PhishingIndicator[]
  ): number {
    if (!fromAddress) return 0;

    let score = 0;
    const senderDomain = fromAddress.split('@')[1]?.toLowerCase() || '';

    for (const target of IMPERSONATION_TARGETS) {
      // Check if content mentions brand but sender is not from legitimate domain
      const brandRegex = new RegExp(`\\b${target.brand}\\b`, 'i');
      if (brandRegex.test(content)) {
        const isLegitimate = target.domains.some(d => senderDomain.includes(d));
        if (!isLegitimate && target.domains.length > 0) {
          indicators.push({
            type: 'brand_impersonation',
            description: `Email mentions ${target.brand} but sender is not from official domain`,
            severity: 7,
          });
          score += 20;
          break;
        }
      }
    }

    return score;
  }

  private static getRiskLevel(score: number): PhishingResult['riskLevel'] {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'safe';
  }

  private static getRecommendation(score: number): string {
    if (score >= 80) return 'Đây có thể là email lừa đảo. KHÔNG click vào bất kỳ link nào.';
    if (score >= 60) return 'Email có nhiều dấu hiệu đáng ngờ. Cẩn thận khi tương tác.';
    if (score >= 40) return 'Email có một số dấu hiệu bất thường. Xác minh nguồn gửi trước khi hành động.';
    if (score >= 20) return 'Email có ít dấu hiệu nghi ngờ. Vẫn nên thận trọng với các link.';
    return 'Email có vẻ an toàn.';
  }

  /**
   * Analyze using AI for complex cases
   */
  static async analyzeWithAI(content: string): Promise<{ isPhishing: boolean; confidence: number } | null> {
    if (!appConfig.ai.enabled || !appConfig.ai.geminiApiKey) return null;

    const prompt = `Analyze this email for phishing/scam indicators.
Return JSON: {"isPhishing": true/false, "confidence": 0-100}

Email:
${content.substring(0, 3000)}

Response:`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${appConfig.ai.geminiModel}:generateContent?key=${appConfig.ai.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 64 },
          }),
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) return null;

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
}
