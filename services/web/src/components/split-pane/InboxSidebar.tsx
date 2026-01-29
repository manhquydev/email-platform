/**
 * InboxSidebar - Compact inbox list for split-pane sidebar
 * Shows inbox cards in a condensed format optimized for sidebar width
 * Includes context menu for actions (share mode, transfer, delete, etc.)
 *
 * Modules extracted to inbox-sidebar-modules/
 */
import { cn } from '../../utils/cn';
import { InboxSidebarItem, type InboxSidebarProps } from './inbox-sidebar-modules';

export { InboxSidebarItem } from './inbox-sidebar-modules';
export type { InboxSidebarItemProps, InboxSidebarProps } from './inbox-sidebar-modules';

export function InboxSidebar({
    inboxes,
    activeInboxId,
    onSelectInbox,
    onCopyEmail,
    onCopyPublicLink,
    onDeleteInbox,
    onTransferInbox,
    onExtendInbox,
    onTogglePermanent,
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
                    onCopyPublicLink={() => {
                        const email = `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;
                        onCopyPublicLink?.(email);
                    }}
                    onDelete={() => onDeleteInbox?.(inbox)}
                    onTransfer={() => onTransferInbox?.(inbox)}
                    onExtend={() => onExtendInbox?.(inbox)}
                    onTogglePermanent={() => onTogglePermanent?.(inbox)}
                    onShareModeChange={(mode) => onShareModeChange?.(inbox.id, mode)}
                    onVisibilityRules={() => onVisibilityRules?.(inbox)}
                    compact={compact}
                />
            ))}
        </div>
    );
}

export default InboxSidebar;
