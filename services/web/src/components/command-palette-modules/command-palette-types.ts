/**
 * Types and constants for CommandPalette
 */
import type { Inbox, Domain } from "../../types";

export interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    domains: Domain[];
    inboxes: Inbox[];
    onSelectInbox: (inbox: Inbox) => void;
    onCreateInbox: () => void;
    onSearch: (query: string) => void;
    currentInboxEmail?: string;
    onCopyEmail?: () => void;
}

export interface Command {
    id: string;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
    action: () => void;
    category: 'navigation' | 'action' | 'inbox' | 'search';
}

export const CATEGORY_LABELS: Record<string, string> = {
    navigation: 'Điều hướng',
    action: 'Thao tác',
    inbox: 'Hộp thư',
    search: 'Tìm kiếm'
};

/** Group commands by category */
export function groupCommandsByCategory(commands: Command[]): Record<string, Command[]> {
    return commands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {} as Record<string, Command[]>);
}

/** Filter commands by query */
export function filterCommands(commands: Command[], query: string): Command[] {
    if (query.length === 0) return commands;
    return commands.filter(cmd => cmd.label.toLowerCase().includes(query.toLowerCase()));
}
