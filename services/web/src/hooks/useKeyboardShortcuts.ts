import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
    messages: { id: string }[];
    selectedMessageId: string | undefined;
    onSelectMessage: (index: number) => void;
    onDeleteMessage?: () => void;
    onMarkUnread?: () => void;
    onReply?: () => void;
    onRefresh?: () => void;
    onFocusSearch?: () => void;
    onShowHelp?: () => void;
    onBack?: () => void;
    enabled?: boolean;
}

export function useKeyboardShortcuts({
    messages,
    selectedMessageId,
    onSelectMessage,
    onDeleteMessage,
    onMarkUnread,
    onReply,
    onRefresh,
    onFocusSearch,
    onShowHelp,
    onBack,
    enabled = true,
}: KeyboardShortcutsOptions) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in input fields
        const target = e.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            // Only allow Escape to blur
            if (e.key === 'Escape') {
                target.blur();
            }
            return;
        }

        const currentIndex = messages.findIndex(m => m.id === selectedMessageId);

        switch (e.key) {
            case 'j':
            case 'ArrowDown':
                // Next message
                e.preventDefault();
                if (currentIndex < messages.length - 1) {
                    onSelectMessage(currentIndex + 1);
                } else if (currentIndex === -1 && messages.length > 0) {
                    onSelectMessage(0);
                }
                break;

            case 'k':
            case 'ArrowUp':
                // Previous message
                e.preventDefault();
                if (currentIndex > 0) {
                    onSelectMessage(currentIndex - 1);
                }
                break;

            case 'o':
            case 'Enter':
                // Open/select message (already handled by click, but can trigger detail view)
                if (selectedMessageId && onSelectMessage && currentIndex >= 0) {
                    onSelectMessage(currentIndex);
                }
                break;

            case 'e':
            case 'Delete':
            case 'Backspace':
                // Archive/Delete
                if (selectedMessageId && onDeleteMessage) {
                    e.preventDefault();
                    onDeleteMessage();
                }
                break;

            case 'u':
            case 'U':
                // Mark as unread (Shift+U)
                if (e.shiftKey && selectedMessageId && onMarkUnread) {
                    e.preventDefault();
                    onMarkUnread();
                }
                break;

            case 'r':
                // Reply
                if (selectedMessageId && onReply) {
                    e.preventDefault();
                    onReply();
                }
                break;

            case 'R':
                // Refresh (Shift+R)
                if (e.shiftKey && onRefresh) {
                    e.preventDefault();
                    onRefresh();
                }
                break;

            case '/':
                // Focus search
                if (onFocusSearch) {
                    e.preventDefault();
                    onFocusSearch();
                }
                break;

            case '?':
                // Show help
                if (onShowHelp) {
                    e.preventDefault();
                    onShowHelp();
                }
                break;

            case 'Escape':
                // Go back / close
                if (onBack) {
                    e.preventDefault();
                    onBack();
                }
                break;
        }
    }, [
        messages,
        selectedMessageId,
        onSelectMessage,
        onDeleteMessage,
        onMarkUnread,
        onReply,
        onRefresh,
        onFocusSearch,
        onShowHelp,
        onBack,
    ]);

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, handleKeyDown]);
}

// Keyboard shortcuts data for help modal
export const KEYBOARD_SHORTCUTS = [
    { key: 'j / ↓', action: 'Email tiếp theo' },
    { key: 'k / ↑', action: 'Email trước đó' },
    { key: 'o / Enter', action: 'Mở email' },
    { key: 'e / Delete', action: 'Xóa email' },
    { key: 'Shift + U', action: 'Đánh dấu chưa đọc' },
    { key: 'r', action: 'Trả lời' },
    { key: 'Shift + R', action: 'Làm mới' },
    { key: '/', action: 'Tìm kiếm' },
    { key: '?', action: 'Hiện trợ giúp' },
    { key: 'Esc', action: 'Đóng / Quay lại' },
];
