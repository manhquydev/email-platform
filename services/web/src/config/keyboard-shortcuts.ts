/**
 * Keyboard Shortcuts Configuration
 * Gmail-style keyboard shortcuts for power users
 */

export interface KeyboardShortcut {
    key: string;
    modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
    action: string;
    description: string;
    category: 'navigation' | 'actions' | 'global';
    /** If true, disabled when user is typing in an input */
    disableInInput?: boolean;
    /** Two-key sequence (e.g., 'g i' for go to inbox) */
    sequence?: string[];
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
    // Navigation
    { key: 'j', action: 'next', description: 'Mục tiếp theo', category: 'navigation', disableInInput: true },
    { key: 'k', action: 'previous', description: 'Mục trước', category: 'navigation', disableInInput: true },
    { key: 'Enter', action: 'open', description: 'Mở/Chọn', category: 'navigation', disableInInput: true },
    { key: ' ', action: 'select', description: 'Đánh dấu chọn', category: 'navigation', disableInInput: true },
    { key: 'Escape', action: 'close', description: 'Đóng/Hủy', category: 'navigation', disableInInput: false },

    // Actions
    { key: '#', action: 'delete', description: 'Xóa', category: 'actions', disableInInput: true },
    { key: 's', action: 'star', description: 'Gắn sao/Pin', category: 'actions', disableInInput: true },
    { key: 'e', action: 'archive', description: 'Lưu trữ', category: 'actions', disableInInput: true },
    { key: 'c', action: 'copy', description: 'Sao chép', category: 'actions', disableInInput: true },
    { key: 'r', action: 'reply', description: 'Trả lời', category: 'actions', disableInInput: true },
    { key: 'u', action: 'markUnread', description: 'Đánh dấu chưa đọc', category: 'actions', disableInInput: true },

    // Global
    { key: '/', action: 'search', description: 'Tìm kiếm', category: 'global', disableInInput: false },
    { key: '?', action: 'showHelp', description: 'Hiện phím tắt', category: 'global', disableInInput: true },
    { key: 'n', action: 'compose', description: 'Tạo mới', category: 'global', disableInInput: true },
    { key: 'k', modifiers: ['meta'], action: 'commandPalette', description: 'Bảng lệnh', category: 'global', disableInInput: false },
    { key: 'k', modifiers: ['ctrl'], action: 'commandPalette', description: 'Bảng lệnh', category: 'global', disableInInput: false },

    // Sequences (two-key combos)
    { key: 'g', action: 'goPrefix', description: 'Chuyển đến...', category: 'global', sequence: ['g'], disableInInput: true },
];

// Sequence shortcuts (triggered after 'g')
export const SEQUENCE_SHORTCUTS: Record<string, { action: string; description: string }> = {
    'i': { action: 'goInbox', description: 'Đến Hộp thư' },
    's': { action: 'goSettings', description: 'Đến Cài đặt' },
    'a': { action: 'goAdmin', description: 'Đến Quản trị' },
    'd': { action: 'goDashboard', description: 'Đến Dashboard' },
};

// Category labels for UI
export const SHORTCUT_CATEGORIES = {
    navigation: 'Di chuyển',
    actions: 'Hành động',
    global: 'Toàn cục',
};

/**
 * Format key for display
 */
export function formatKeyDisplay(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];

    if (shortcut.modifiers?.includes('meta')) {
        parts.push('⌘');
    }
    if (shortcut.modifiers?.includes('ctrl')) {
        parts.push('Ctrl');
    }
    if (shortcut.modifiers?.includes('alt')) {
        parts.push('Alt');
    }
    if (shortcut.modifiers?.includes('shift')) {
        parts.push('Shift');
    }

    // Format special keys
    let keyDisplay = shortcut.key;
    switch (shortcut.key) {
        case ' ':
            keyDisplay = 'Space';
            break;
        case 'Enter':
            keyDisplay = '↵';
            break;
        case 'Escape':
            keyDisplay = 'Esc';
            break;
        case 'ArrowUp':
            keyDisplay = '↑';
            break;
        case 'ArrowDown':
            keyDisplay = '↓';
            break;
        case 'ArrowLeft':
            keyDisplay = '←';
            break;
        case 'ArrowRight':
            keyDisplay = '→';
            break;
    }

    parts.push(keyDisplay);

    return parts.join(' + ');
}
