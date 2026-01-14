/**
 * ListeningIndicator - Real-time connection status indicator
 * Shows pulsing dot when WebSocket is connected and listening for emails
 */

import { cn } from '../../utils/cn';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface ListeningIndicatorProps {
    /** Current connection status */
    status: ConnectionStatus;
    /** Show "New email!" flash when email arrives */
    hasNewEmail?: boolean;
    /** Size variant */
    size?: 'sm' | 'md';
    /** Show label text */
    showLabel?: boolean;
    /** Additional class names */
    className?: string;
}

const statusConfig: Record<ConnectionStatus, { color: string; label: string; pulse: boolean }> = {
    connected: {
        color: 'bg-green-500',
        label: 'Đang lắng nghe...',
        pulse: true,
    },
    connecting: {
        color: 'bg-yellow-500',
        label: 'Đang kết nối...',
        pulse: true,
    },
    disconnected: {
        color: 'bg-gray-500',
        label: 'Mất kết nối',
        pulse: false,
    },
};

const sizeClasses = {
    sm: {
        dot: 'w-2 h-2',
        text: 'text-xs',
        gap: 'gap-1.5',
    },
    md: {
        dot: 'w-2.5 h-2.5',
        text: 'text-sm',
        gap: 'gap-2',
    },
};

export function ListeningIndicator({
    status,
    hasNewEmail = false,
    size = 'sm',
    showLabel = true,
    className,
}: ListeningIndicatorProps) {
    const config = statusConfig[status];
    const sizes = sizeClasses[size];

    return (
        <div
            className={cn(
                'inline-flex items-center',
                sizes.gap,
                className
            )}
            role="status"
            aria-live="polite"
        >
            {/* Pulsing dot */}
            <span className="relative flex">
                <span
                    className={cn(
                        'rounded-full',
                        sizes.dot,
                        config.color,
                        hasNewEmail && 'animate-ping absolute inline-flex h-full w-full opacity-75'
                    )}
                />
                <span
                    className={cn(
                        'relative inline-flex rounded-full',
                        sizes.dot,
                        config.color,
                        config.pulse && !hasNewEmail && 'animate-pulse'
                    )}
                />
            </span>

            {/* Label */}
            {showLabel && (
                <span
                    className={cn(
                        sizes.text,
                        'font-medium transition-colors',
                        hasNewEmail
                            ? 'text-green-400'
                            : status === 'connected'
                            ? 'text-text-secondary'
                            : status === 'connecting'
                            ? 'text-yellow-400'
                            : 'text-gray-400'
                    )}
                >
                    {hasNewEmail ? 'Email mới!' : config.label}
                </span>
            )}
        </div>
    );
}

/**
 * Compact version for header/toolbar use
 */
export function ListeningDot({
    status,
    hasNewEmail = false,
    className,
}: Pick<ListeningIndicatorProps, 'status' | 'hasNewEmail' | 'className'>) {
    return (
        <ListeningIndicator
            status={status}
            hasNewEmail={hasNewEmail}
            size="sm"
            showLabel={false}
            className={className}
        />
    );
}
