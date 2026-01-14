/**
 * TTLProgressBar - Visual countdown progress bar for inbox expiration
 * Shows time remaining with color-coded urgency states
 */

import { useMemo } from 'react';
import { cn } from '../../utils/cn';

interface TTLProgressBarProps {
    /** Expiration date/time */
    expiresAt: string | Date | null;
    /** Created date for calculating total duration */
    createdAt?: string | Date;
    /** Size variant */
    size?: 'sm' | 'md';
    /** Show text label */
    showLabel?: boolean;
    /** Additional class names */
    className?: string;
}

type TTLStatus = 'permanent' | 'safe' | 'warning' | 'critical' | 'expired';

interface TTLInfo {
    status: TTLStatus;
    percentage: number;
    label: string;
    tooltip: string;
}

const statusColors: Record<TTLStatus, { bar: string; bg: string; text: string }> = {
    permanent: {
        bar: 'bg-purple-500',
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
    },
    safe: {
        bar: 'bg-green-500',
        bg: 'bg-green-500/10',
        text: 'text-green-400',
    },
    warning: {
        bar: 'bg-yellow-500',
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
    },
    critical: {
        bar: 'bg-red-500',
        bg: 'bg-red-500/10',
        text: 'text-red-400',
    },
    expired: {
        bar: 'bg-gray-500',
        bg: 'bg-gray-500/10',
        text: 'text-gray-400',
    },
};

const heightClasses = {
    sm: 'h-1',
    md: 'h-1.5',
};

export function TTLProgressBar({
    expiresAt,
    createdAt,
    size = 'sm',
    showLabel = false,
    className,
}: TTLProgressBarProps) {
    const ttlInfo = useMemo((): TTLInfo => {
        // Permanent inbox
        if (!expiresAt) {
            return {
                status: 'permanent',
                percentage: 100,
                label: 'Vĩnh viễn',
                tooltip: 'Hộp thư này không có thời hạn',
            };
        }

        const now = new Date();
        const expires = new Date(expiresAt);
        const created = createdAt ? new Date(createdAt) : new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const totalDuration = expires.getTime() - created.getTime();
        const remaining = expires.getTime() - now.getTime();

        // Expired
        if (remaining <= 0) {
            return {
                status: 'expired',
                percentage: 0,
                label: 'Hết hạn',
                tooltip: `Đã hết hạn lúc ${expires.toLocaleString('vi-VN')}`,
            };
        }

        const percentage = Math.max(0, Math.min(100, (remaining / totalDuration) * 100));

        // Calculate human-readable label
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const days = Math.floor(hours / 24);

        let label: string;
        if (days > 0) {
            label = `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            label = `${hours}h ${minutes}m`;
        } else {
            label = `${minutes}m`;
        }

        // Determine status based on remaining time
        let status: TTLStatus;
        if (hours < 1) {
            status = 'critical';
        } else if (hours < 6) {
            status = 'warning';
        } else {
            status = 'safe';
        }

        return {
            status,
            percentage,
            label,
            tooltip: `Hết hạn lúc ${expires.toLocaleString('vi-VN')} (còn ${label})`,
        };
    }, [expiresAt, createdAt]);

    const colors = statusColors[ttlInfo.status];

    return (
        <div className={cn('flex items-center gap-2', className)} title={ttlInfo.tooltip}>
            {/* Progress bar */}
            <div className={cn('flex-1 rounded-full overflow-hidden', colors.bg, heightClasses[size])}>
                <div
                    className={cn(
                        'h-full rounded-full transition-all duration-500',
                        colors.bar,
                        ttlInfo.status === 'critical' && 'animate-pulse'
                    )}
                    style={{ width: `${ttlInfo.percentage}%` }}
                />
            </div>

            {/* Label */}
            {showLabel && (
                <span className={cn('text-[10px] font-medium whitespace-nowrap', colors.text)}>
                    {ttlInfo.label}
                </span>
            )}
        </div>
    );
}
