/**
 * InboxSidebar - Compact inbox list for split-pane sidebar
 * Shows inbox cards in a condensed format optimized for sidebar width
 * Includes context menu for actions (share mode, transfer, delete, etc.)
 */

import { useState, useRef, useEffect } from 'react';
import type { Inbox, ShareMode } from '../../types';
import { cn } from '../../utils/cn';
import { CopyButton } from '../copy-first/CopyButton';
import { TTLProgressBar } from '../copy-first/TTLProgressBar';

interface InboxSidebarItemProps {
    inbox: Inbox;
    isActive: boolean;
    onSelect: () => void;
    onCopy?: () => void;
    onDelete?: () => void;
    onTransfer?: () => void;
    onShareModeChange?: (mode: ShareMode) => void;
    onVisibilityRules?: () => void;
    /** Compact mode shows minimal info */
    compact?: boolean;
}

export function InboxSidebarItem({
    inbox,
    isActive,
    onSelect,
    onCopy,
    onDelete,
    onTransfer,
    onShareModeChange,
    onVisibilityRules,
    compact = false,
}: InboxSidebarItemProps) {
    const email = `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;
    const messageCount = inbox._count?.messages ?? 0;
    const [showMenu, setShowMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const menuRef = useRef<HTMLDivElement>(null);

    // Check if inbox is expiring soon (within 24h)
    const isExpiringSoon = inbox.expiresAt
        ? new Date(inbox.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
        : false;

    // Close menu on outside click
    useEffect(() => {
        if (!showMenu) return;
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [showMenu]);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY });
        setShowMenu(true);
    };

    const handleMenuAction = (action: () => void) => {
        setShowMenu(false);
        action();
    };

    return (
        <>
            <div
                className={cn(
                    'group relative px-3 py-2.5 cursor-pointer transition-all duration-200',
                    'border-l-2 border-transparent hover:bg-white/5',
                    isActive && 'bg-primary/10 border-l-primary',
                    isExpiringSoon && !isActive && 'bg-amber-500/5'
                )}
                onClick={onSelect}
                onContextMenu={handleContextMenu}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect();
                    }
                }}
            >
                {/* Email address row */}
                <div className="flex items-center gap-2 mb-1.5">
                    {/* Status indicators */}
                    <div className="flex-shrink-0 flex items-center gap-1">
                        {inbox.shareMode === 'PUBLIC' && (
                            <span className="w-2 h-2 rounded-full bg-green-400" title="Công khai" />
                        )}
                    </div>

                    <span
                        className={cn(
                            'text-sm truncate flex-1',
                            isActive ? 'text-primary font-semibold' : 'text-text-main font-medium'
                        )}
                        title={email}
                    >
                        {compact ? inbox.localPart : email}
                    </span>

                    {/* Message count badge */}
                    {messageCount > 0 && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-white/10 text-text-secondary min-w-[18px] text-center">
                            {messageCount > 99 ? '99+' : messageCount}
                        </span>
                    )}

                    {/* Action buttons - visible on hover */}
                    <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton
                            text={email}
                            size="sm"
                            variant="ghost"
                            showToast
                            successMessage={`Đã copy: ${email}`}
                            onCopy={onCopy}
                            ariaLabel="Copy email"
                        />
                        <button
                            className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-text-main transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuPos({ x: e.currentTarget.getBoundingClientRect().left, y: e.currentTarget.getBoundingClientRect().bottom });
                                setShowMenu(!showMenu);
                            }}
                            title="Thêm tùy chọn"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Stats row */}
                {!compact && (
                    <div className="flex items-center gap-2">
                        <TTLProgressBar
                            expiresAt={inbox.expiresAt || null}
                            createdAt={inbox.createdAt}
                            size="sm"
                            className="flex-1"
                        />
                        <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                            <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>{messageCount}</span>
                        </div>
                    </div>
                )}

                {/* Compact mode: Show message count badge */}
                {compact && messageCount > 0 && (
                    <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-white/10 text-text-secondary">
                        {messageCount}
                    </span>
                )}
            </div>

            {/* Context Menu */}
            {showMenu && (
                <div
                    ref={menuRef}
                    className="fixed z-50 min-w-[180px] py-1 bg-bg-secondary border border-white/10 rounded-lg shadow-xl"
                    style={{ left: menuPos.x, top: menuPos.y }}
                >
                    {/* Share Mode Toggle */}
                    {onShareModeChange && (
                        <button
                            className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                            onClick={() => handleMenuAction(() => onShareModeChange(inbox.shareMode === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'))}
                        >
                            {inbox.shareMode === 'PUBLIC' ? (
                                <>
                                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <span>Chuyển sang Riêng tư</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Chuyển sang Công khai</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Visibility Rules */}
                    {onVisibilityRules && (
                        <button
                            className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                            onClick={() => handleMenuAction(onVisibilityRules)}
                        >
                            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Quy tắc hiển thị</span>
                        </button>
                    )}

                    {/* Transfer */}
                    {onTransfer && (
                        <button
                            className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                            onClick={() => handleMenuAction(onTransfer)}
                        >
                            <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            <span>Chuyển quyền sở hữu</span>
                        </button>
                    )}

                    <div className="border-t border-white/5 my-1" />

                    {/* Delete */}
                    {onDelete && (
                        <button
                            className="w-full px-3 py-2 text-left text-sm hover:bg-red-500/10 text-red-400 flex items-center gap-2"
                            onClick={() => handleMenuAction(onDelete)}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Xóa hộp thư</span>
                        </button>
                    )}
                </div>
            )}
        </>
    );
}

interface InboxSidebarProps {
    inboxes: Inbox[];
    activeInboxId: string | null;
    onSelectInbox: (inboxId: string) => void;
    onCopyEmail?: (email: string) => void;
    onDeleteInbox?: (inbox: Inbox) => void;
    onTransferInbox?: (inbox: Inbox) => void;
    onShareModeChange?: (inboxId: string, mode: ShareMode) => void;
    onVisibilityRules?: (inbox: Inbox) => void;
    /** Show in compact mode (icon-only when collapsed) */
    compact?: boolean;
    /** Loading state */
    isLoading?: boolean;
    /** Additional class names */
    className?: string;
}

export function InboxSidebar({
    inboxes,
    activeInboxId,
    onSelectInbox,
    onCopyEmail,
    onDeleteInbox,
    onTransferInbox,
    onShareModeChange,
    onVisibilityRules,
    compact = false,
    isLoading = false,
    className,
}: InboxSidebarProps) {
    if (isLoading) {
        return (
            <div className={cn('p-3 space-y-2', className)}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                        <div className="h-1 bg-white/5 rounded w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (inboxes.length === 0) {
        return (
            <div className={cn('p-4 text-center text-text-secondary', className)}>
                <svg
                    className="w-10 h-10 mx-auto mb-2 opacity-30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                </svg>
                <p className="text-xs">Chưa có hộp thư</p>
            </div>
        );
    }

    return (
        <div className={cn('divide-y divide-white/5', className)}>
            {inboxes.map((inbox) => (
                <InboxSidebarItem
                    key={inbox.id}
                    inbox={inbox}
                    isActive={inbox.id === activeInboxId}
                    onSelect={() => onSelectInbox(inbox.id)}
                    onCopy={() => {
                        const email = `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;
                        onCopyEmail?.(email);
                    }}
                    onDelete={() => onDeleteInbox?.(inbox)}
                    onTransfer={() => onTransferInbox?.(inbox)}
                    onShareModeChange={(mode) => onShareModeChange?.(inbox.id, mode)}
                    onVisibilityRules={() => onVisibilityRules?.(inbox)}
                    compact={compact}
                />
            ))}
        </div>
    );
}

export default InboxSidebar;
