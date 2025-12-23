import { KEYBOARD_SHORTCUTS } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
    onClose: () => void;
}

export function KeyboardShortcutsHelp({ onClose }: KeyboardShortcutsHelpProps) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div
                className="glass-card-elevated rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-[var(--nebula-border)] bg-[var(--nebula-surface-elevated)]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-text-main">Phím tắt bàn phím</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded hover:bg-bg text-muted hover:text-text-main transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-2">
                    {KEYBOARD_SHORTCUTS.map(({ key, action }) => (
                        <div key={key} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                            <span className="text-sm text-text-main">{action}</span>
                            <kbd className="px-2 py-1 bg-bg border border-border rounded text-xs font-mono text-muted">
                                {key}
                            </kbd>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-border text-center">
                    <span className="text-xs text-muted">Nhấn <kbd className="px-1 py-0.5 bg-bg border border-border rounded text-[10px] font-mono">?</kbd> để mở lại</span>
                </div>
            </div>
        </div>
    );
}

