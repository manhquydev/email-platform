/**
 * Email Sanitizer Service
 * Strips tracking pixels and rewrites tracking URLs for privacy
 */

export interface SanitizationResult {
  sanitizedHtml: string;
  trackingPixelsRemoved: number;
  trackingUrlsRewritten: number;
  openTrackersRemoved: number;
}

// Known tracking domains
const TRACKING_DOMAINS = [
  'mailchimp.com', 'sendgrid.net', 'mailgun.org', 'amazonses.com',
  'list-manage.com', 'click.', 'track.', 'open.', 'pixel.',
  'beacon.', 'trk.', 'analytics.', 'metrics.', 't.co',
  'bit.ly', 'goo.gl', 'tinyurl.com', 'ow.ly',
];

// Tracking pixel patterns
const PIXEL_PATTERNS = [
  // 1x1 images
  /<img[^>]*(?:width|height)\s*=\s*["']?1["']?[^>]*(?:width|height)\s*=\s*["']?1["']?[^>]*>/gi,
  // Hidden images
  /<img[^>]*style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden)[^"']*["'][^>]*>/gi,
  // Common tracking pixel patterns
  /<img[^>]*(?:open|track|beacon|pixel|wf|PixelTracking)[^>]*>/gi,
  // Zero-size images
  /<img[^>]*(?:width|height)\s*=\s*["']?0["']?[^>]*>/gi,
];

// Open tracker patterns in URLs
const OPEN_TRACKER_PATTERNS = [
  /[?&](?:utm_|mc_|_hsenc|_hsmi|fbclid|gclid|msclkid|ref_?=)/i,
  /\/wf\/open\//i,
  /\/track\/open\//i,
  /\/beacon\//i,
];

export class EmailSanitizerService {
  /**
   * Sanitize email HTML content
   */
  static sanitize(html: string): SanitizationResult {
    if (!html) {
      return {
        sanitizedHtml: '',
        trackingPixelsRemoved: 0,
        trackingUrlsRewritten: 0,
        openTrackersRemoved: 0,
      };
    }

    let sanitizedHtml = html;
    let trackingPixelsRemoved = 0;
    let trackingUrlsRewritten = 0;
    let openTrackersRemoved = 0;

    // Remove tracking pixels
    for (const pattern of PIXEL_PATTERNS) {
      const matches = sanitizedHtml.match(pattern);
      if (matches) {
        trackingPixelsRemoved += matches.length;
        sanitizedHtml = sanitizedHtml.replace(pattern, '<!-- tracking pixel removed -->');
      }
    }

    // Remove/rewrite tracking URLs in images
    sanitizedHtml = sanitizedHtml.replace(
      /<img[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi,
      (match, src) => {
        if (this.isTrackingUrl(src)) {
          trackingUrlsRewritten++;
          return '<!-- tracking image removed -->';
        }
        return match;
      }
    );

    // Strip tracking parameters from links
    sanitizedHtml = sanitizedHtml.replace(
      /href\s*=\s*["']([^"']+)["']/gi,
      (match, url) => {
        const cleanedUrl = this.stripTrackingParams(url);
        if (cleanedUrl !== url) {
          openTrackersRemoved++;
        }
        return `href="${cleanedUrl}"`;
      }
    );

    return {
      sanitizedHtml,
      trackingPixelsRemoved,
      trackingUrlsRewritten,
      openTrackersRemoved,
    };
  }

  /**
   * Check if URL is a tracking URL
   */
  private static isTrackingUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return TRACKING_DOMAINS.some(domain => lowerUrl.includes(domain)) ||
           OPEN_TRACKER_PATTERNS.some(pattern => pattern.test(url));
  }

  /**
   * Strip tracking parameters from URL
   */
  private static stripTrackingParams(url: string): string {
    try {
      const parsed = new URL(url);
      const paramsToRemove = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'mc_cid', 'mc_eid', '_hsenc', '_hsmi', 'fbclid', 'gclid', 'msclkid',
        'ref', 'ref_', 'trk', 'tracking_id', 'campaign_id',
      ];

      paramsToRemove.forEach(param => parsed.searchParams.delete(param));
      return parsed.toString();
    } catch {
      // Invalid URL, return as-is
      return url;
    }
  }

  /**
   * Sanitize and save to message
   */
  static async sanitizeMessage(messageId: string): Promise<SanitizationResult | null> {
    const { prisma } = await import('../lib/prisma');

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { htmlBody: true },
    });

    if (!message?.htmlBody) return null;

    const result = this.sanitize(message.htmlBody);

    // Update message with sanitized HTML
    await prisma.message.update({
      where: { id: messageId },
      data: { htmlBody: result.sanitizedHtml },
    });

    return result;
  }
}
