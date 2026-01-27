/**
 * Ephemeral Header - Email address display, copy, and countdown timer
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { EphemeralInbox } from '../../services/ephemeralService';

interface EphemeralHeaderProps {
    inbox: EphemeralInbox;
    onExtend: () => void;
    isExtending: boolean;
}

export function EphemeralHeader({ inbox, onExtend, isExtending }: EphemeralHeaderProps) {
    const [timeLeft, setTimeLeft] = useState(inbox.expiresIn);
    const [copied, setCopied] = useState(false);

    // Countdown timer
    useEffect(() => {
        const expiresAt = new Date(inbox.expiresAt).getTime();

        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
            setTimeLeft(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [inbox.expiresAt]);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(inbox.address);
            setCopied(true);
            toast.success('Đã sao chép địa chỉ email!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Không thể sao chép');
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isUrgent = timeLeft < 300; // Less than 5 minutes
    const isExpired = timeLeft <= 0;

    return (
        <div className="neo-glass rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
            {/* Email Address Row - Grid for consistent alignment */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 sm:gap-4 mb-4">
                {/* Email display - constrained to prevent overflow */}
                <div className="min-w-0 overflow-hidden">
                    <p className="text-[10px] sm:text-xs text-[var(--nebula-text-secondary)] mb-1 uppercase tracking-wide">
                        Email tạm thời
                    </p>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <span className="text-base sm:text-xl lg:text-2xl font-mono font-bold text-white truncate min-w-0 flex-1">
                            {inbox.address}
                        </span>
                        <button
                            onClick={copyToClipboard}
                            className={`p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0 ${
                                copied
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-white/5 hover:bg-white/10 text-white'
                            }`}
                            title="Sao chép"
                        >
                            <span className="material-symbols-outlined !text-[18px] sm:!text-[20px]">
                                {copied ? 'check' : 'content_copy'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Timer - fixed width, won't shrink */}
                <div className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex-shrink-0 self-end ${
                    isExpired
                        ? 'bg-red-500/20 text-red-400'
                        : isUrgent
                            ? 'bg-orange-500/20 text-orange-400 animate-pulse'
                            : 'bg-white/5 text-white'
                }`}>
                    <span className="material-symbols-outlined !text-[18px] sm:!text-[20px]">timer</span>
                    <span className="font-mono font-bold text-sm sm:text-lg whitespace-nowrap">
                        {isExpired ? 'Hết hạn' : formatTime(timeLeft)}
                    </span>
                </div>
            </div>

            {/* Actions - compact on mobile */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                    onClick={onExtend}
                    disabled={isExtending || isExpired}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-xs sm:text-sm transition-all"
                >
                    <span className="material-symbols-outlined !text-[16px] sm:!text-[18px]">
                        {isExtending ? 'sync' : 'add_circle'}
                    </span>
                    <span className="hidden sm:inline">{isExtending ? 'Đang gia hạn...' : 'Gia hạn +1h'}</span>
                    <span className="sm:hidden">{isExtending ? '...' : '+1h'}</span>
                </button>

                <button
                    onClick={() => {
                        const url = window.location.href;
                        navigator.clipboard.writeText(url);
                        toast.success('Đã sao chép link chia sẻ!');
                    }}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium text-xs sm:text-sm transition-all"
                >
                    <span className="material-symbols-outlined !text-[16px] sm:!text-[18px]">share</span>
                    <span className="hidden sm:inline">Chia sẻ</span>
                </button>
            </div>

            {/* Expired warning */}
            {isExpired && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">
                        <span className="material-symbols-outlined !text-[16px] align-middle mr-1">warning</span>
                        Inbox đã hết hạn. Tạo inbox mới để tiếp tục nhận email.
                    </p>
                </div>
            )}
        </div>
    );
}
