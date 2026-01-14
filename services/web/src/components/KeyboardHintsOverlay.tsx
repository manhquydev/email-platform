/**
 * KeyboardHintsOverlay - Modal showing all keyboard shortcuts
 * Triggered by pressing '?'
 */

import { useEffect } from 'react';
import { cn } from '../utils/cn';
import { KEYBOARD_SHORTCUTS } from '../hooks/useKeyboardShortcuts';

interface KeyboardHintsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function KeyboardHintsOverlay({ isOpen, onClose }: KeyboardHintsOverlayProps) {
    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === '?') {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Group shortcuts by category
    const navigationShortcuts = KEYBOARD_SHORTCUTS.filter(s =>
        ['j / ↓', 'k / ↑', 'o / Enter', 'Esc'].some(k => s.key.includes(k.split(' ')[0]))
    );
    const actionShortcuts = KEYBOARD_SHORTCUTS.filter(s =>
        ['e / Delete', 'Shift + U', 'r', 'Shift + R'].some(k => s.key === k)
    );
    const globalShortcuts = KEYBOARD_SHORTCUTS.filter(s =>
        ['/', '?'].includes(s.key)
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className={cn(
                    'w-full max-w-2xl bg-bg-secondary rounded-2xl shadow-2xl border border-white/10',
                    'animate-scale-in overflow-hidden'
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-main">Phím tắt</h2>
                            <p className="text-sm text-text-secondary">Nhấn ? để ẩn/hiện</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-main transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto">
                    {/* Navigation */}
                    <div>
                        <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">
                            Di chuyển
                        </h3>
                        <div className="space-y-2">
                            {navigationShortcuts.map((shortcut) => (
                                <ShortcutItem key={shortcut.key} shortcut={shortcut} />
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div>
                        <h3 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wide">
                            Hành động
                        </h3>
                        <div className="space-y-2">
                            {actionShortcuts.map((shortcut) => (
                                <ShortcutItem key={shortcut.key} shortcut={shortcut} />
                            ))}
                        </div>
                    </div>

                    {/* Global */}
                    <div>
                        <h3 className="text-sm font-semibold text-amber-400 mb-3 uppercase tracking-wide">
                            Toàn cục
                        </h3>
                        <div className="space-y-2">
                            {globalShortcuts.map((shortcut) => (
                                <ShortcutItem key={shortcut.key} shortcut={shortcut} />
                            ))}
                            {/* Additional global shortcuts */}
                            <ShortcutItem shortcut={{ key: 'Ctrl/⌘ + K', action: 'Bảng lệnh' }} />
                            <ShortcutItem shortcut={{ key: 'n', action: 'Tạo inbox mới' }} />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 bg-surface/30">
                    <p className="text-xs text-text-secondary text-center">
                        Phím tắt hoạt động khi không ở trong ô nhập liệu
                    </p>
                </div>
            </div>
        </div>
    );
}

interface ShortcutItemProps {
    shortcut: { key: string; action: string };
}

function ShortcutItem({ shortcut }: ShortcutItemProps) {
    return (
        <div className="flex items-center justify-between gap-2 py-1.5">
            <span className="text-sm text-text-secondary">{shortcut.action}</span>
            <kbd className={cn(
                'px-2 py-1 text-xs font-mono rounded',
                'bg-white/5 border border-white/10 text-text-main',
                'min-w-[2rem] text-center'
            )}>
                {shortcut.key}
            </kbd>
        </div>
    );
}

export default KeyboardHintsOverlay;
