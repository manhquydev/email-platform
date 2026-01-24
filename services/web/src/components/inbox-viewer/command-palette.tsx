/**
 * CommandPalette - Superhuman-style command palette (Cmd+K)
 * Fuzzy search, keyboard navigation, quick actions
 */
import { useState, useEffect, useRef, useCallback } from "react";

interface Command {
    id: string;
    label: string;
    shortcut?: string;
    group: "navigation" | "actions";
}

const COMMANDS: Command[] = [
    { id: "search", label: "Search emails...", group: "navigation" },
    { id: "refresh", label: "Refresh inbox", shortcut: "R", group: "actions" },
    { id: "change-email", label: "Change email address", group: "navigation" },
    { id: "copy-link", label: "Copy share link", group: "actions" },
    { id: "telegram", label: "Link Telegram", group: "actions" },
];

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onCommand: (commandId: string) => void;
}

export function CommandPalette({ isOpen, onClose, onCommand }: CommandPaletteProps) {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter commands by query
    const filteredCommands = COMMANDS.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
    );

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((i) => Math.max(i - 1, 0));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (filteredCommands[selectedIndex]) {
                        onCommand(filteredCommands[selectedIndex].id);
                        onClose();
                    }
                    break;
                case "Escape":
                    e.preventDefault();
                    onClose();
                    break;
            }
        },
        [filteredCommands, selectedIndex, onCommand, onClose]
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 hidden md:flex items-start justify-center pt-[20vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Palette */}
            <div
                className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden"
                onKeyDown={handleKeyDown}
            >
                {/* Search Input */}
                <div className="flex items-center border-b border-zinc-800 px-4">
                    <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Type a command..."
                        className="flex-1 px-3 py-4 bg-transparent text-white placeholder:text-zinc-500 focus:outline-none"
                    />
                    <kbd className="px-2 py-1 text-xs text-zinc-500 bg-zinc-800 rounded">esc</kbd>
                </div>

                {/* Command List */}
                <div className="max-h-64 overflow-y-auto py-2">
                    {filteredCommands.length === 0 ? (
                        <div className="px-4 py-8 text-center text-zinc-500">
                            No commands found
                        </div>
                    ) : (
                        filteredCommands.map((cmd, index) => (
                            <button
                                key={cmd.id}
                                onClick={() => {
                                    onCommand(cmd.id);
                                    onClose();
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                                    index === selectedIndex
                                        ? "bg-zinc-800 text-white"
                                        : "text-zinc-300 hover:bg-zinc-800/50"
                                }`}
                            >
                                <span>{cmd.label}</span>
                                {cmd.shortcut && (
                                    <kbd className="px-2 py-0.5 text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 rounded">
                                        {cmd.shortcut}
                                    </kbd>
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* Footer hint */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-zinc-800 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 bg-zinc-800 rounded">↑↓</kbd> navigate
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 bg-zinc-800 rounded">↵</kbd> select
                    </span>
                </div>
            </div>
        </div>
    );
}
