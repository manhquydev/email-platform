/**
 * InboxActionSheet - Bottom sheet with actions for an inbox
 * Long press or "..." menu triggers this sheet
 */

import { useCallback } from 'react';
import { BottomSheet } from './BottomSheet';
import { cn } from '../../utils/cn';
import type { Inbox, ShareMode } from '../../types';

interface InboxActionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    inbox: Inbox | null;
    onCopy: () => void;
    onViewMessages: () => void;
    onTransfer: () => void;
    onDelete: () => void;
    onShareModeChange: (mode: ShareMode) => void;
    onVisibilityRules: () => void;
}

interface ActionItemProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
    disabled?: boolean;
}

function ActionItem({ icon, label, onClick, variant = 'default', disabled }: ActionItemProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors touch-manipulation',
                'min-h-[48px]', // Touch target >= 44px
                variant === 'danger'
                    ? 'text-red-400 hover:bg-red-500/10 active:bg-red-500/20'
                    : 'text-text-main hover:bg-white/5 active:bg-white/10',
                disabled && 'opacity-50 cursor-not-allowed'
            )}
        >
            <span className="flex-shrink-0">{icon}</span>
            <span className="font-medium">{label}</span>
        </button>
    );
}

export function InboxActionSheet({
    isOpen,
    onClose,
    inbox,
    onCopy,
    onViewMessages,
    onTransfer,
    onDelete,
    onShareModeChange,
    onVisibilityRules,
}: InboxActionSheetProps) {
    const handleAction = useCallback((action: () => void) => {
        onClose();
        // Small delay to allow sheet to close before action
        setTimeout(action, 150);
    }, [onClose]);

    if (!inbox) return null;

    const email = `${inbox.localPart}@${inbox.domain?.name}`;
    const isPublic = inbox.shareMode === 'PUBLIC';

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title={email}
            snapPoints={[0, 55]}
            initialSnap={1}
        >
            <div className="py-2 space-y-1">
                {/* Copy Email */}
                <ActionItem
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                    }
                    label="Sao chép địa chỉ email"
                    onClick={() => handleAction(onCopy)}
                />

                {/* View Messages */}
                <ActionItem
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    }
                    label="Xem tin nhắn"
                    onClick={() => handleAction(onViewMessages)}
                />

                {/* Toggle Share Mode */}
                <ActionItem
                    icon={
                        isPublic ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                        )
                    }
                    label={isPublic ? 'Chuyển sang riêng tư' : 'Chuyển sang công khai'}
                    onClick={() => handleAction(() => onShareModeChange(isPublic ? 'PRIVATE' : 'PUBLIC'))}
                />

                {/* Visibility Rules */}
                <ActionItem
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    }
                    label="Quy tắc hiển thị"
                    onClick={() => handleAction(onVisibilityRules)}
                />

                {/* Transfer */}
                <ActionItem
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    }
                    label="Chuyển quyền sở hữu"
                    onClick={() => handleAction(onTransfer)}
                />

                {/* Divider */}
                <div className="border-t border-white/5 my-2" />

                {/* Delete */}
                <ActionItem
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    }
                    label="Xóa hộp thư"
                    onClick={() => handleAction(onDelete)}
                    variant="danger"
                />
            </div>
        </BottomSheet>
    );
}

export default InboxActionSheet;
