/**
 * Hooks for CommandPalette
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { Inbox } from "../../types";
import type { Command } from "./command-palette-types";
import { InboxIcon, SettingsIcon, PlusIcon, RefreshIcon, MailIcon, CopyIcon } from "./command-palette-icons";

interface UseCommandsOptions {
    inboxes: Inbox[];
    onSelectInbox: (inbox: Inbox) => void;
    onCreateInbox: () => void;
    onClose: () => void;
    currentInboxEmail?: string;
    onCopyEmail?: () => void;
}

/** Build command list based on user role and context */
export function useCommands({ inboxes, onSelectInbox, onCreateInbox, onClose, currentInboxEmail, onCopyEmail }: UseCommandsOptions): Command[] {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    return [
        // Navigation
        {
            id: 'nav-inbox',
            label: 'Đi đến Hộp thư',
            icon: <InboxIcon />,
            shortcut: 'G I',
            action: () => { navigate('/app'); onClose(); },
            category: 'navigation'
        },
        // Admin navigation
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
        // Copy email action
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
}

/** Hook for command palette state and keyboard handling */
export function useCommandPaletteState(
    isOpen: boolean,
    onClose: () => void,
    filteredCommands: Command[],
    onSearch: (query: string) => void
) {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action();
                } else if (query.length > 0) {
                    onSearch(query);
                    onClose();
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    }, [isOpen, filteredCommands, selectedIndex, query, onSearch, onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    return { query, setQuery, selectedIndex, setSelectedIndex, inputRef };
}
