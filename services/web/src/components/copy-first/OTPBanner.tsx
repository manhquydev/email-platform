/**
 * OTPBanner - Prominent OTP display with one-click copy
 * Shown at top of email viewer when OTP/verification code detected
 */

import { useEffect } from 'react';
import { cn } from '../../utils/cn';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import type { OTPResult } from '../../utils/otpExtractor';

interface OTPBannerProps {
    /** OTP extraction result */
    otp: OTPResult | null;
    /** Auto-copy on mount (opt-in) */
    autoCopy?: boolean;
    /** Callback when OTP is copied */
    onCopy?: (code: string) => void;
    /** Additional class names */
    className?: string;
}

export function OTPBanner({ otp, autoCopy = false, onCopy, className }: OTPBannerProps) {
    const { copy, status } = useCopyToClipboard({
        successMessage: 'Đã copy mã xác thực!',
        showToast: true,
    });

    // Auto-copy on mount if enabled
    useEffect(() => {
        const performAutoCopy = async () => {
            if (autoCopy && otp?.code) {
                // Attempt silent copy - browsers may block this without user interaction
                // We suppress the error toast to avoid confusing the user
                const success = await copy(otp.code, undefined, true);
                if (success) {
                    onCopy?.(otp.code);
                }
            }
        };
        performAutoCopy();
    }, [autoCopy, otp?.code]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!otp) return null;

    const handleCopy = async () => {
        const success = await copy(otp.code);
        if (success) {
            onCopy?.(otp.code);
        }
    };

    const confidenceColors = {
        high: 'border-green-500/30 bg-green-500/5',
        medium: 'border-yellow-500/30 bg-yellow-500/5',
        low: 'border-gray-500/30 bg-gray-500/5',
    };

    return (
        <div
            className={cn(
                'rounded-xl border-2 p-4 mb-4 transition-all',
                confidenceColors[otp.confidence],
                status === 'copied' && 'border-green-500/50 bg-green-500/10',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                </svg>
                <span className="text-sm font-medium text-text-main">
                    Mã xác thực
                </span>
                {otp.confidence === 'high' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">
                        Độ tin cậy cao
                    </span>
                )}
            </div>

            {/* OTP Code Display */}
            <button
                onClick={handleCopy}
                className={cn(
                    'w-full flex items-center justify-center gap-3 py-4 px-6 rounded-lg',
                    'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30',
                    'transition-all duration-200 group',
                    status === 'copied' && 'bg-green-500/10 border-green-500/30'
                )}
            >
                {/* Code digits */}
                <span
                    className={cn(
                        'text-3xl font-mono font-bold tracking-[0.3em] text-text-main',
                        status === 'copied' && 'text-green-400'
                    )}
                >
                    {otp.code}
                </span>

                {/* Copy indicator */}
                <span
                    className={cn(
                        'flex items-center gap-1.5 text-sm transition-colors',
                        status === 'copied'
                            ? 'text-green-400'
                            : 'text-text-secondary group-hover:text-primary'
                    )}
                >
                    {status === 'copied' ? (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Đã copy!
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                            Nhấn để copy
                        </>
                    )}
                </span>
            </button>

            {/* Context hint */}
            {otp.context && (
                <p className="mt-2 text-xs text-text-secondary truncate">
                    {otp.context}
                </p>
            )}
        </div>
    );
}
