/**
 * Hooks for CommandPalette
 */
import { useState, useEffect, useRef, useCallback } from "react";
import type { Command } from "./command-palette-types";

/** Hook for command palette state management */
export function useCommandPaletteState(isOpen: boolean) {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setQuery("");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Reset selection when query changes
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedIndex(0);
    }, [query]);

    return { query, setQuery, selectedIndex, setSelectedIndex, inputRef };
}

/** Hook for keyboard navigation */
export function useKeyboardNavigation(
    isOpen: boolean,
    filteredCommands: Command[],
    selectedIndex: number,
    setSelectedIndex: (fn: (i: number) => number) => void,
    query: string,
    onSearch: (query: string) => void,
    onClose: () => void
) {
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
    }, [isOpen, filteredCommands, selectedIndex, query, onSearch, onClose, setSelectedIndex]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
