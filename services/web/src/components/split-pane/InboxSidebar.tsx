/**
 * InboxSidebar - Compact inbox list for split-pane sidebar
 * Shows inbox cards in a condensed format optimized for sidebar width
 */

import type { Inbox } from '../../types';
import { cn } from '../../utils/cn';
import { CopyButton } from '../copy-first/CopyButton';
import { TTLProgressBar } from '../copy-first/TTLProgressBar';

interface InboxSidebarItemProps {
    inbox: Inbox;
    isActive: boolean;
    onSelect: () => void;
    onCopy?: () => void;
    /** Compact mode shows minimal info */
    compact?: boolean;
}

export function InboxSidebarItem({
    inbox,
    isActive,
    onSelect,
    onCopy,
    compact = false,
}: InboxSidebarItemProps) {
    const email = `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;
    const messageCount = inbox._count?.messages ?? 0;

    return (
        <div
            className={cn(
                'group relative px-3 py-2 cursor-pointer transition-all duration-200',
                'border-l-2 border-transparent hover:bg-white/5',
                isActive && 'bg-primary/10 border-l-primary'
            )}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
        >
            {/* Email address */}
            <div className="flex items-center gap-2 mb-1">
                <span
                    className={cn(
                        'text-sm font-medium truncate flex-1',
                        isActive ? 'text-primary' : 'text-text-main'
                    )}
                    title={email}
                >
                    {compact ? inbox.localPart : email}
                </span>

                {/* Copy button - visible on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton
                        text={email}
                        size="sm"
                        variant="ghost"
                        showToast
                        successMessage={`Đã copy: ${email}`}
                        onCopy={onCopy}
                        ariaLabel="Copy email"
                    />
                </div>
            </div>

            {/* TTL and message count */}
            {!compact && (
                <div className="flex items-center gap-3">
                    <TTLProgressBar
                        expiresAt={inbox.expiresAt || null}
                        createdAt={inbox.createdAt}
                        size="sm"
                        className="flex-1"
                    />
                    <span className="text-[10px] text-text-secondary whitespace-nowrap">
                        {messageCount} tin
                    </span>
                </div>
            )}

            {/* Compact mode: Just show message count badge */}
            {compact && messageCount > 0 && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary/20 text-primary">
                    {messageCount}
                </span>
            )}
        </div>
    );
}

interface InboxSidebarProps {
    inboxes: Inbox[];
    activeInboxId: string | null;
    onSelectInbox: (inboxId: string) => void;
    onCopyEmail?: (email: string) => void;
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
                    compact={compact}
                />
            ))}
        </div>
    );
}

export default InboxSidebar;
