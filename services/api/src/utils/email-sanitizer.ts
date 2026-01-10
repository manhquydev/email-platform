/**
 * Email Sanitizer Utility
 * Removes tracking pixels, external images, and privacy-invasive metadata from emails
 * to protect user privacy in accordance with Zero-Log policy.
 */

// Common tracking pixel patterns
const TRACKING_PIXEL_PATTERNS = [
    // 1x1 pixel images
    /width\s*=\s*["']?1["']?\s+height\s*=\s*["']?1["']?/gi,
    /height\s*=\s*["']?1["']?\s+width\s*=\s*["']?1["']?/gi,
    // Common tracking domains
    /src\s*=\s*["'][^"']*(?:track|pixel|beacon|open|click|mail\.|analytics|stat|count|log)[^"']*["']/gi,
    // Mailchimp, SendGrid, etc.
    /src\s*=\s*["'][^"']*(?:mailchimp|sendgrid|mailgun|sparkpost|postmark|amazonses|mandrill)[^"']*["']/gi,
    // Google Analytics tracking
    /src\s*=\s*["'][^"']*(?:google-analytics|googleusercontent|googlesyndication)[^"']*["']/gi,
];

// Domains known for email tracking
const TRACKING_DOMAINS = [
    'mailtrack.io',
    'getnotify.com',
    'yesware.com',
    'bananatag.com',
    'cirrusinsight.com',
    'hubspot.com',
    'salesforce.com',
    'mixmax.com',
    'streak.com',
    'boomeranggmail.com',
    'mailchimp.com',
    'sendgrid.net',
    'mailgun.org',
    'list-manage.com',
    'campaign-archive.com',
    'exacttarget.com',
    'responsys.net',
    'eloqua.com',
    'marketo.com',
    'pardot.com',
];

export interface SanitizeResult {
    html: string;
    trackingPixelsRemoved: number;
    externalImagesBlocked: number;
    linksRewritten: number;
}

export interface SanitizeOptions {
    removeTrackingPixels?: boolean;
    blockExternalImages?: boolean;
    rewriteTrackingLinks?: boolean;
    preserveInlineImages?: boolean;
}

const DEFAULT_OPTIONS: SanitizeOptions = {
    removeTrackingPixels: true,
    blockExternalImages: false, // Don't block all images by default
    rewriteTrackingLinks: true,
    preserveInlineImages: true,
};

/**
 * Detect if an image is likely a tracking pixel
 */
function isTrackingPixel(imgTag: string): boolean {
    // Check for 1x1 dimensions
    const widthMatch = imgTag.match(/width\s*=\s*["']?(\d+)/i);
    const heightMatch = imgTag.match(/height\s*=\s*["']?(\d+)/i);

    if (widthMatch && heightMatch) {
        const width = parseInt(widthMatch[1], 10);
        const height = parseInt(heightMatch[1], 10);
        if (width <= 3 && height <= 3) {
            return true;
        }
    }

    // Check for tracking domain in src
    const srcMatch = imgTag.match(/src\s*=\s*["']([^"']+)["']/i);
    if (srcMatch) {
        const src = srcMatch[1].toLowerCase();
        for (const domain of TRACKING_DOMAINS) {
            if (src.includes(domain)) {
                return true;
            }
        }
        // Check for tracking keywords in URL
        if (/(?:track|pixel|beacon|open|\.gif\?|\.png\?.*(?:id|uid|email|hash))/i.test(src)) {
            return true;
        }
    }

    // Check for common tracking patterns
    for (const pattern of TRACKING_PIXEL_PATTERNS) {
        if (pattern.test(imgTag)) {
            return true;
        }
    }

    return false;
}

/**
 * Check if a link is a tracking/redirect link
 */
function isTrackingLink(href: string): boolean {
    const lowerHref = href.toLowerCase();

    // Check for tracking domains
    for (const domain of TRACKING_DOMAINS) {
        if (lowerHref.includes(domain)) {
            return true;
        }
    }

    // Check for common tracking patterns in URLs
    if (/(?:click|track|redirect|r\.php|go\.php|link\.php|url\.php)/i.test(lowerHref)) {
        return true;
    }

    return false;
}

/**
 * Extract destination URL from tracking link if possible
 */
function extractDestinationUrl(href: string): string | null {
    // Try to extract destination from common patterns
    const patterns = [
        /[?&](?:url|dest|destination|redirect|target|goto)=([^&]+)/i,
        /\/redirect\/\?.*?url=([^&]+)/i,
    ];

    for (const pattern of patterns) {
        const match = href.match(pattern);
        if (match) {
            try {
                return decodeURIComponent(match[1]);
            } catch {
                return match[1];
            }
        }
    }

    return null;
}

/**
 * Sanitize HTML email content
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): SanitizeResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let result = html;
    let trackingPixelsRemoved = 0;
    let externalImagesBlocked = 0;
    let linksRewritten = 0;

    if (!html) {
        return { html: '', trackingPixelsRemoved: 0, externalImagesBlocked: 0, linksRewritten: 0 };
    }

    // Remove tracking pixels
    if (opts.removeTrackingPixels) {
        result = result.replace(/<img[^>]*>/gi, (imgTag) => {
            if (isTrackingPixel(imgTag)) {
                trackingPixelsRemoved++;
                return '<!-- tracking pixel removed -->';
            }
            return imgTag;
        });
    }

    // Block external images (optional - disabled by default)
    if (opts.blockExternalImages) {
        result = result.replace(/<img[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi, (imgTag, src) => {
            // Preserve inline/base64 images
            if (opts.preserveInlineImages && (src.startsWith('data:') || src.startsWith('cid:'))) {
                return imgTag;
            }
            // Block external
            if (src.startsWith('http://') || src.startsWith('https://')) {
                externalImagesBlocked++;
                return `<!-- external image blocked: ${src.substring(0, 50)}... -->`;
            }
            return imgTag;
        });
    }

    // Rewrite tracking links
    if (opts.rewriteTrackingLinks) {
        result = result.replace(/<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi, (aTag, href) => {
            if (isTrackingLink(href)) {
                const destination = extractDestinationUrl(href);
                if (destination) {
                    linksRewritten++;
                    return aTag.replace(href, destination);
                }
            }
            return aTag;
        });
    }

    // Remove common tracking/analytics scripts
    result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (scriptTag) => {
        if (/(?:track|analytics|pixel|beacon)/i.test(scriptTag)) {
            return '<!-- tracking script removed -->';
        }
        return scriptTag;
    });

    // Remove tracking query parameters from remaining image URLs
    if (opts.removeTrackingPixels) {
        result = result.replace(/(<img[^>]*src\s*=\s*["'])([^"']+)(["'][^>]*>)/gi, (match, prefix, src, suffix) => {
            try {
                const url = new URL(src);
                const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'mc_eid', 'mc_cid', 'e', 'email', 'hash', 'uid', 'user_id'];
                let modified = false;
                for (const param of trackingParams) {
                    if (url.searchParams.has(param)) {
                        url.searchParams.delete(param);
                        modified = true;
                    }
                }
                if (modified) {
                    return prefix + url.toString() + suffix;
                }
            } catch {
                // Invalid URL, return as-is
            }
            return match;
        });
    }

    return {
        html: result,
        trackingPixelsRemoved,
        externalImagesBlocked,
        linksRewritten,
    };
}

/**
 * Sanitize email headers to remove privacy-invasive data
 */
export function sanitizeHeaders(headers: Record<string, unknown>): object {
    const sanitized = { ...headers };

    // Headers that may leak privacy info
    const headersToRemove = [
        'x-originating-ip',
        'x-sender-ip',
        'x-mailer',
        'x-mimeole',
        'x-client-ip',
        'x-forwarded-for',
        'x-source-ip',
        'x-real-ip',
        'x-ms-exchange-organization-authsource',
        'x-ms-exchange-organization-authas',
        'x-ms-has-attach',
        'x-ms-tnef-correlator',
        'x-google-dkim-signature',
        'x-gm-message-state',
        'x-received',
    ];

    for (const header of headersToRemove) {
        delete sanitized[header];
        delete sanitized[header.toUpperCase()];
        // Also try mixed case
        const camelCase = header.split('-').map((part, i) =>
            i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
        ).join('-');
        delete sanitized[camelCase];
    }

    return sanitized;
}
