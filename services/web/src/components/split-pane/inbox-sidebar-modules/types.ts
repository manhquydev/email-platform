/**
 * Types for InboxSidebar components
 */
import type { Inbox, ShareMode } from '../../../types';

export interface InboxSidebarItemProps {
    inbox: Inbox;
    isActive: boolean;
    onSelect: () => void;
    onCopy?: () => void;
    onDelete?: () => void;
    onTransfer?: () => void;
    onExtend?: () => void;
    onTogglePermanent?: () => void;
    onShareModeChange?: (mode: ShareMode) => void;
    onVisibilityRules?: () => void;
    /** Compact mode shows minimal info */
    compact?: boolean;
}

export interface InboxSidebarProps {
    inboxes: Inbox[];
    activeInboxId: string | null;
    onSelectInbox: (inboxId: string) => void;
    onCopyEmail?: (email: string) => void;
    onDeleteInbox?: (inbox: Inbox) => void;
    onTransferInbox?: (inbox: Inbox) => void;
    onExtendInbox?: (inbox: Inbox) => void;
    onTogglePermanent?: (inbox: Inbox) => void;
    onShareModeChange?: (inboxId: string, mode: ShareMode) => void;
    onVisibilityRules?: (inbox: Inbox) => void;
    /** Show in compact mode (icon-only when collapsed) */
    compact?: boolean;
    /** Loading state */
    isLoading?: boolean;
    /** Additional class names */
    className?: string;
}
