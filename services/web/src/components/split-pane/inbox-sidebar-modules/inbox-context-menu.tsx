/**
 * Context menu for inbox sidebar item actions
 */
import type { Inbox, ShareMode } from '../../../types';

interface ContextMenuProps {
    inbox: Inbox;
    menuPos: { x: number; y: number };
    menuRef: React.RefObject<HTMLDivElement | null>;
    onClose: () => void;
    onShareModeChange?: (mode: ShareMode) => void;
    onVisibilityRules?: () => void;
    onTransfer?: () => void;
    onTogglePermanent?: () => void;
    onExtend?: () => void;
    onDelete?: () => void;
}

export function InboxContextMenu({
    inbox,
    menuPos,
    menuRef,
    onClose,
    onShareModeChange,
    onVisibilityRules,
    onTransfer,
    onTogglePermanent,
    onExtend,
    onDelete
}: ContextMenuProps) {
    const handleMenuAction = (action: () => void) => {
        onClose();
        action();
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[200px] py-1.5 bg-[var(--nebula-surface)]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50"
            style={{ left: menuPos.x, top: menuPos.y }}
        >
            {/* Share Mode Toggle */}
            {onShareModeChange && (
                <button
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                    onClick={() => handleMenuAction(() => onShareModeChange(inbox.shareMode === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'))}
                >
                    {inbox.shareMode === 'PUBLIC' ? (
                        <>
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>Chuyển sang Riêng tư</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Chuyển sang Công khai</span>
                        </>
                    )}
                </button>
            )}

            {/* Visibility Rules */}
            {onVisibilityRules && (
                <button
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                    onClick={() => handleMenuAction(onVisibilityRules)}
                >
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Quy tắc hiển thị</span>
                </button>
            )}

            {/* Transfer */}
            {onTransfer && (
                <button
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                    onClick={() => handleMenuAction(onTransfer)}
                >
                    <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>Chuyển quyền sở hữu</span>
                </button>
            )}

            {/* Toggle Permanent */}
            {onTogglePermanent && (
                <button
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                    onClick={() => handleMenuAction(onTogglePermanent)}
                >
                    {!inbox.expiresAt ? (
                        <>
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Chuyển sang Có hạn (24h)</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                            </svg>
                            <span>Chuyển sang Vĩnh viễn</span>
                        </>
                    )}
                </button>
            )}

            {/* Extend TTL */}
            {onExtend && inbox.expiresAt && (
                <button
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                    onClick={() => handleMenuAction(onExtend)}
                >
                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Gia hạn +10 phút</span>
                </button>
            )}

            <div className="border-t border-white/5 my-1.5 mx-2" />

            {/* Delete */}
            {onDelete && (
                <button
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-red-500/10 text-red-400 flex items-center gap-2.5 transition-colors"
                    onClick={() => handleMenuAction(onDelete)}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Xóa hộp thư</span>
                </button>
            )}
        </div>
    );
}
