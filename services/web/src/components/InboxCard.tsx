import type { Inbox } from "../types";
import { GlassCard } from "./ui/GlassCard";
import { cn } from "../utils/cn";
import { CopyButton } from "./copy-first/CopyButton";
import { TTLProgressBar } from "./copy-first/TTLProgressBar";

interface InboxCardProps {
    inbox: Inbox;
    isSelected: boolean;
    isActive: boolean;
    onSelect: () => void;
    onToggleSelect: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onViewMessages: () => void;
    onTransfer?: () => void;
    onExtend?: () => void;
    onShareModeChange?: (shareMode: 'PUBLIC' | 'PRIVATE') => void;
    onVisibilityRules?: () => void;
}

export function InboxCard({
    inbox,
    isSelected,
    isActive,
    onSelect,
    onToggleSelect,
    onCopy,
    onDelete,
    onViewMessages,
    onTransfer,
    onExtend,
    onShareModeChange,
    onVisibilityRules
}: InboxCardProps) {
    const email = `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;

    // Get message count from API
    const messageCount = inbox._count?.messages ?? 0;

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
    };

    const handleCheckbox = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleSelect();
    };

    return (
        <GlassCard
            className={cn(
                "group relative p-4 mb-3 cursor-pointer transition-all duration-300 border border-white/5 hover:border-white/10",
                isActive && "ring-2 ring-primary/50 bg-primary/5",
                isSelected && "bg-primary/10 border-primary/20"
            )}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter') onViewMessages();
                if (e.key === ' ') { e.preventDefault(); onToggleSelect(); }
            }}
        >
            <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div className="pt-1">
                    <button
                        onClick={handleCheckbox}
                        className={cn(
                            "w-5 h-5 rounded-md border border-white/20 flex items-center justify-center transition-colors",
                            isSelected ? "bg-primary border-primary" : "hover:border-primary/50"
                        )}
                        aria-label={isSelected ? "Bỏ chọn" : "Chọn"}
                    >
                        {isSelected && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {/* Email header with prominent copy button */}
                    <div className="flex items-center gap-2 mb-2">
                        <h3
                            className="text-base font-semibold text-text-main truncate flex-1 cursor-pointer hover:text-primary transition-colors"
                            onClick={onViewMessages}
                        >
                            {email}
                        </h3>
                        <CopyButton
                            text={email}
                            size="sm"
                            variant="primary"
                            label="Copy"
                            successMessage={`Đã copy: ${email}`}
                            onCopy={onCopy}
                            ariaLabel="Copy địa chỉ email"
                        />
                    </div>

                    {/* TTL Progress Bar */}
                    <TTLProgressBar
                        expiresAt={inbox.expiresAt || null}
                        createdAt={inbox.createdAt}
                        size="sm"
                        showLabel
                        className="mb-2"
                    />

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-xs text-text-secondary" onClick={onViewMessages}>
                        <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {messageCount} tin
                        </span>
                        <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(inbox.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                    </div>

                    {/* Share Mode Toggle - More prominent placement */}
                    {onShareModeChange && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onShareModeChange(inbox.shareMode === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC');
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all w-full justify-center",
                                    inbox.shareMode === 'PUBLIC'
                                        ? "bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/30"
                                        : "bg-gray-500/15 text-gray-400 hover:bg-gray-500/25 border border-gray-500/30"
                                )}
                                title={inbox.shareMode === 'PUBLIC' ? 'Click để chuyển sang Private' : 'Click để chuyển sang Public'}
                            >
                                {inbox.shareMode === 'PUBLIC' ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                )}
                                <span>{inbox.shareMode === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}</span>
                                <span className="text-[10px] opacity-60 ml-1">
                                    {inbox.shareMode === 'PUBLIC' ? '(ai cũng xem được qua inbox viewer)' : '(chỉ bạn mới xem được)'}
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Actions (visible on hover/focus/active) */}
                <div className={cn(
                    "flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                    (isActive || isSelected) && "opacity-100"
                )}>
                    {onTransfer && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onTransfer(); }}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-warning hover:bg-warning/10 transition-colors"
                            title="Transfer Ownership"
                            aria-label="Chuyển quyền sở hữu"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </button>
                    )}
                    {onExtend && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onExtend(); }}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors"
                            title="Gia hạn +10 phút"
                            aria-label="Gia hạn inbox"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    )}
                    {onVisibilityRules && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onVisibilityRules(); }}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                            title="Visibility Rules"
                            aria-label="Quy tắc hiển thị"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                        title="Delete Inbox"
                        aria-label="Xóa hộp thư"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </GlassCard>
    );
}
