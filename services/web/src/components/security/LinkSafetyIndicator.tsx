/**
 * LinkSafetyIndicator - Visual indicator for external link safety
 * Shows icon and tooltip with domain info and warnings
 */
import { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

export interface LinkSafetyIndicatorProps {
    /** The URL to analyze */
    url: string;
    /** Override safety level */
    safetyLevel?: 'safe' | 'caution' | 'dangerous' | 'unknown';
    /** Additional class names */
    className?: string;
}

const safetyConfig = {
    safe: {
        icon: 'verified',
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        label: 'An toàn',
    },
    caution: {
        icon: 'warning',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        label: 'Cẩn thận',
    },
    dangerous: {
        icon: 'gpp_bad',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        label: 'Nguy hiểm',
    },
    unknown: {
        icon: 'help',
        color: 'text-gray-400',
        bg: 'bg-gray-500/10',
        label: 'Không xác định',
    },
};

// Known safe domains (simplified list)
const KNOWN_SAFE_DOMAINS = [
    'google.com', 'gmail.com', 'microsoft.com', 'outlook.com',
    'apple.com', 'icloud.com', 'amazon.com', 'facebook.com',
    'github.com', 'linkedin.com', 'twitter.com', 'x.com',
];

// Suspicious patterns
const SUSPICIOUS_PATTERNS = [
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP address
    /bit\.ly|tinyurl|t\.co|goo\.gl/, // URL shorteners
    /-login|-signin|-verify|-account/, // Fake login pages
];

function analyzeDomain(url: string): { level: 'safe' | 'caution' | 'dangerous' | 'unknown'; domain: string; reasons: string[] } {
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase();
        const reasons: string[] = [];

        // Check if known safe
        const isKnownSafe = KNOWN_SAFE_DOMAINS.some(safe =>
            domain === safe || domain.endsWith('.' + safe)
        );
        if (isKnownSafe) {
            return { level: 'safe', domain, reasons: ['Domain đáng tin cậy'] };
        }

        // Check suspicious patterns
        for (const pattern of SUSPICIOUS_PATTERNS) {
            if (pattern.test(url)) {
                reasons.push('URL có mẫu đáng ngờ');
                return { level: 'dangerous', domain, reasons };
            }
        }

        // Check for typosquatting (simple check)
        const typoPatterns = ['g00gle', 'micros0ft', 'amaz0n', 'faceb00k'];
        if (typoPatterns.some(p => domain.includes(p))) {
            reasons.push('Có thể là trang giả mạo');
            return { level: 'dangerous', domain, reasons };
        }

        // Default to caution for unknown external links
        return { level: 'caution', domain, reasons: ['Domain không xác định'] };
    } catch {
        return { level: 'unknown', domain: 'invalid', reasons: ['URL không hợp lệ'] };
    }
}

export function LinkSafetyIndicator({ url, safetyLevel, className }: LinkSafetyIndicatorProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const analysis = analyzeDomain(url);
    const level = safetyLevel || analysis.level;
    const config = safetyConfig[level];

    // Close tooltip on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
                setShowTooltip(false);
            }
        };
        if (showTooltip) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showTooltip]);

    return (
        <span className={cn('relative inline-flex items-center', className)}>
            <button
                onClick={() => setShowTooltip(!showTooltip)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={cn(
                    'inline-flex items-center justify-center w-4 h-4 rounded',
                    config.bg,
                    'hover:opacity-80 transition-opacity'
                )}
                aria-label={`Link safety: ${config.label}`}
            >
                <span className={cn('material-symbols-outlined !text-[12px]', config.color)}>
                    {config.icon}
                </span>
            </button>

            {/* Tooltip */}
            {showTooltip && (
                <div
                    ref={tooltipRef}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
                >
                    <div className="bg-[var(--nebula-surface)] border border-white/10 rounded-lg shadow-xl p-3 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={cn('material-symbols-outlined !text-[16px]', config.color)}>
                                {config.icon}
                            </span>
                            <span className={cn('text-sm font-medium', config.color)}>
                                {config.label}
                            </span>
                        </div>
                        <p className="text-xs text-[var(--nebula-text-secondary)] truncate mb-1">
                            {analysis.domain}
                        </p>
                        {analysis.reasons.length > 0 && (
                            <p className="text-xs text-[var(--nebula-text-muted)]">
                                {analysis.reasons[0]}
                            </p>
                        )}
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                            <div className="border-8 border-transparent border-t-[var(--nebula-surface)]" />
                        </div>
                    </div>
                </div>
            )}
        </span>
    );
}

export default LinkSafetyIndicator;
