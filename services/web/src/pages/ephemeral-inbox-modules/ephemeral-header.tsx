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
        <div className="neo-glass rounded-xl p-6 mb-6">
            {/* Email Address */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--nebula-text-secondary)] mb-1 uppercase tracking-wide">
                        Email tạm thời của bạn
                    </p>
                    <div className="flex items-center gap-3">
                        <span className="text-xl sm:text-2xl font-mono font-bold text-white truncate">
                            {inbox.address}
                        </span>
                        <button
                            onClick={copyToClipboard}
                            className={`p-2 rounded-lg transition-all ${
                                copied
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-white/5 hover:bg-white/10 text-white'
                            }`}
                            title="Sao chép"
                        >
                            <span className="material-symbols-outlined !text-[20px]">
                                {copied ? 'check' : 'content_copy'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Timer */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    isExpired
                        ? 'bg-red-500/20 text-red-400'
                        : isUrgent
                            ? 'bg-orange-500/20 text-orange-400 animate-pulse'
                            : 'bg-white/5 text-white'
                }`}>
                    <span className="material-symbols-outlined !text-[20px]">timer</span>
                    <span className="font-mono font-bold text-lg">
                        {isExpired ? 'Hết hạn' : formatTime(timeLeft)}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={onExtend}
                    disabled={isExtending || isExpired}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--nebula-violet)] hover:bg-[var(--nebula-violet-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all"
                >
                    <span className="material-symbols-outlined !text-[18px]">
                        {isExtending ? 'sync' : 'add_circle'}
                    </span>
                    {isExtending ? 'Đang gia hạn...' : 'Gia hạn thêm 1 giờ'}
                </button>

                <button
                    onClick={() => {
                        const url = window.location.href;
                        navigator.clipboard.writeText(url);
                        toast.success('Đã sao chép link chia sẻ!');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium text-sm transition-all"
                >
                    <span className="material-symbols-outlined !text-[18px]">share</span>
                    Chia sẻ link
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
