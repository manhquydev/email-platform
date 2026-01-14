/**
 * EmailActionToolbar - Quick actions for email messages
 * Pin, Delete, Export, Copy source
 */

import { useState } from 'react';
import { cn } from '../../utils/cn';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import type { Message } from '../../types';

interface EmailActionToolbarProps {
    message: Message;
    onDelete?: () => void;
    onPin?: (isPinned: boolean) => void;
    onExport?: () => void;
    isDeleting?: boolean;
    className?: string;
}

export function EmailActionToolbar({
    message,
    onDelete,
    onPin,
    onExport,
    isDeleting = false,
    className,
}: EmailActionToolbarProps) {
    const [isPinned, setIsPinned] = useState(message.isPinned || false);
    const { copy } = useCopyToClipboard({ successMessage: 'Đã copy nguồn email' });

    const handlePin = () => {
        const newState = !isPinned;
        setIsPinned(newState);
        onPin?.(newState);
    };

    const handleCopySource = () => {
        const source = message.htmlBody || message.textBody || '';
        copy(source);
    };

    return (
        <div className={cn('flex items-center gap-1 flex-wrap', className)}>
            {/* Pin */}
            <ActionButton
                onClick={handlePin}
                icon={
                    <svg className="w-4 h-4" fill={isPinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                }
                label={isPinned ? 'Bỏ ghim' : 'Ghim'}
                isActive={isPinned}
                activeColor="text-amber-400"
            />

            {/* Copy source */}
            <ActionButton
                onClick={handleCopySource}
                icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                }
                label="Copy nguồn"
            />

            {/* Export */}
            {onExport && (
                <ActionButton
                    onClick={onExport}
                    icon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    }
                    label="Xuất .eml"
                />
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-white/10 mx-1" />

            {/* Delete */}
            {onDelete && (
                <ActionButton
                    onClick={onDelete}
                    icon={
                        isDeleting ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        )
                    }
                    label="Xóa"
                    variant="danger"
                    disabled={isDeleting}
                />
            )}
        </div>
    );
}

interface ActionButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    activeColor?: string;
    variant?: 'default' | 'danger';
    disabled?: boolean;
}

function ActionButton({
    onClick,
    icon,
    label,
    isActive = false,
    activeColor = 'text-primary',
    variant = 'default',
    disabled = false,
}: ActionButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                'hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed',
                variant === 'danger'
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : isActive
                    ? `${activeColor} bg-white/5`
                    : 'text-text-secondary hover:text-text-main'
            )}
            title={label}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
