import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Inbox, Domain } from "../types";

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    domains: Domain[];
    inboxes: Inbox[];
    onSelectInbox: (inbox: Inbox) => void;
    onCreateInbox: () => void;
    onSearch: (query: string) => void;
}

interface Command {
    id: string;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
    action: () => void;
    category: 'navigation' | 'action' | 'inbox' | 'search';
}

export function CommandPalette({
    isOpen,
    onClose,
    domains: _domains,
    inboxes,
    onSelectInbox,
    onCreateInbox,
    onSearch
}: CommandPaletteProps) {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Build command list
    const commands: Command[] = [
        // Navigation
        {
            id: 'nav-inbox',
            label: 'Đi đến Hộp thư',
            icon: <InboxIcon />,
            shortcut: 'G I',
            action: () => { navigate('/app'); onClose(); },
            category: 'navigation'
        },
        {
            id: 'nav-admin',
            label: 'Quản trị viên',
            icon: <SettingsIcon />,
            shortcut: 'G A',
            action: () => { navigate('/admin'); onClose(); },
            category: 'navigation'
        },
        // Actions
        {
            id: 'action-new-inbox',
            label: 'Tạo địa chỉ email mới',
            icon: <PlusIcon />,
            shortcut: 'N',
            action: () => { onCreateInbox(); onClose(); },
            category: 'action'
        },
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

    // Filter commands based on query
    const filteredCommands = query.length > 0
        ? commands.filter(cmd =>
            cmd.label.toLowerCase().includes(query.toLowerCase())
        )
        : commands;

    // Handle keyboard navigation
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

    if (!isOpen) return null;

    // Group commands by category
    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {} as Record<string, Command[]>);

    const categoryLabels: Record<string, string> = {
        navigation: 'Điều hướng',
        action: 'Thao tác',
        inbox: 'Hộp thư',
        search: 'Tìm kiếm'
    };

    let globalIndex = 0;

    return (
        <>
            <div className="command-palette-overlay" onClick={onClose} />
            <div className="command-palette">
                <div className="command-palette-input-wrapper">
                    <SearchIcon />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Nhập lệnh hoặc tìm kiếm..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="command-palette-input"
                    />
                    <kbd className="command-palette-kbd">ESC</kbd>
                </div>

                <div className="command-palette-results">
                    {Object.entries(groupedCommands).map(([category, cmds]) => (
                        <div key={category} className="command-palette-group">
                            <div className="command-palette-group-label">
                                {categoryLabels[category] || category}
                            </div>
                            {cmds.map((cmd) => {
                                const index = globalIndex++;
                                return (
                                    <button
                                        key={cmd.id}
                                        className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                                        onClick={cmd.action}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        <span className="command-palette-item-icon">{cmd.icon}</span>
                                        <span className="command-palette-item-label">{cmd.label}</span>
                                        {cmd.shortcut && (
                                            <kbd className="command-palette-item-shortcut">{cmd.shortcut}</kbd>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}

                    {filteredCommands.length === 0 && query.length > 0 && (
                        <div className="command-palette-empty">
                            <p>Không tìm thấy lệnh "{query}"</p>
                            <p className="text-muted">Nhấn Enter để tìm email</p>
                        </div>
                    )}
                </div>

                <div className="command-palette-footer">
                    <span>↑↓ Di chuyển</span>
                    <span>↵ Chọn</span>
                    <span>ESC Đóng</span>
                </div>
            </div>
        </>
    );
}

// Icons
const InboxIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859" />
    </svg>
);

const SettingsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const RefreshIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);

const MailIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);

const SearchIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);
