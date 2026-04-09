/**
 * Command builder for CommandPalette
 */
import type { NavigateFunction } from "react-router-dom";
import type { Inbox } from "../../types";
import type { Command } from "./command-palette-types";
import { InboxIcon, SettingsIcon, PlusIcon, RefreshIcon, MailIcon, CopyIcon } from "./command-palette-icons";

interface BuildCommandsParams {
    navigate: NavigateFunction;
    onClose: () => void;
    onCreateInbox: () => void;
    onSelectInbox: (inbox: Inbox) => void;
    inboxes: Inbox[];
    isAdmin: boolean;
    currentInboxEmail?: string;
    onCopyEmail?: () => void;
}

export function buildCommands({
    navigate, onClose, onCreateInbox, onSelectInbox, inboxes,
    isAdmin, currentInboxEmail, onCopyEmail
}: BuildCommandsParams): Command[] {
    const commands: Command[] = [
        // Navigation
        {
            id: 'nav-inbox',
            label: 'Đi đến Hộp thư',
            icon: <InboxIcon />,
            shortcut: 'G I',
            action: () => { navigate('/app/manager'); onClose(); },
            category: 'navigation'
        },
        // Admin navigation - only show for admins
        ...(isAdmin ? [{
            id: 'nav-admin',
            label: 'Quản trị viên',
            icon: <SettingsIcon />,
            shortcut: 'G A',
            action: () => { navigate('/admin'); onClose(); },
            category: 'navigation' as const
        }] : []),
        // Actions
        {
            id: 'action-new-inbox',
            label: 'Tạo địa chỉ email mới',
            icon: <PlusIcon />,
            shortcut: 'N',
            action: () => { onCreateInbox(); onClose(); },
            category: 'action'
        },
        // Copy email action (if available)
        ...(currentInboxEmail && onCopyEmail ? [{
            id: 'action-copy-email',
            label: `Sao chép: ${currentInboxEmail}`,
            icon: <CopyIcon />,
            shortcut: 'C',
            action: () => { onCopyEmail(); onClose(); },
            category: 'action' as const
        }] : []),
        {
            id: 'action-refresh',
            label: 'Làm mới',
            icon: <RefreshIcon />,
            shortcut: 'R',
            action: () => { window.location.reload(); },
            category: 'action'
        },
        // Inboxes
        ...inboxes.slice(0, 10).map(inbox => ({
            id: `inbox-${inbox.id}`,
            label: `${inbox.localPart}@${inbox.domain?.name || 'domain'}`,
            icon: <MailIcon />,
            action: () => { onSelectInbox(inbox); onClose(); },
            category: 'inbox' as const
        }))
    ];

    return commands;
}
