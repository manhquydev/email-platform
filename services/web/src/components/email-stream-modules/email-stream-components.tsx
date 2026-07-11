/**
 * UI components for EmailStream
 */
import type { Message } from "../../types";
import { cn } from "../../utils/cn";
import { extractOTP } from "../../utils/otpExtractor";
import { formatRelativeTime } from "./email-stream-types";

/** Generate consistent avatar color from email address */
function getSenderAvatar(email: string): { letter: string; color: string } {
    const name = email.split('@')[0];
    const letter = name.charAt(0).toUpperCase() || '?';
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
    const hash = email.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const color = colors[hash % colors.length];
    return { letter, color };
}

/** Skeleton shimmer for loading state */
export function EmailSkeleton() {
    return (
        <div className="p-3 border-b border-semantic-border animate-pulse">
            <div className="flex items-center gap-3">
                {/* Avatar skeleton */}
                <div className="w-8 h-8 rounded-full bg-semantic-bg-hover flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                    {/* Header skeleton */}
                    <div className="flex justify-between items-center">
                        <div className="h-3.5 w-32 bg-semantic-bg-hover rounded" />
                        <div className="h-3 w-12 bg-semantic-bg-hover rounded" />
                    </div>
                    {/* Subject + preview skeleton */}
                    <div className="h-3.5 w-3/4 bg-semantic-bg-hover rounded" />
                </div>
            </div>
        </div>
    );
}

/** List of skeleton items for loading state */
export function EmailSkeletonList({ count = 5 }: { count?: number }) {
    return (
        <div className="h-full">
            {Array.from({ length: count }).map((_, i) => (
                <EmailSkeleton key={i} />
            ))}
        </div>
    );
}

/** Empty state when no messages */
export function EmptyInbox() {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full text-semantic-text-muted">
            <div className="w-20 h-20 rounded-2xl bg-semantic-accent-subtle border border-semantic-border flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-semantic-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
            </div>
            <h3 className="text-lg font-semibold text-semantic-text-main mb-2">Hộp thư trống</h3>
            <p className="text-sm max-w-[250px] mb-4 leading-relaxed">
                Email mới sẽ xuất hiện ở đây. Chia sẻ địa chỉ này để nhận email.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-semantic-text-muted bg-semantic-bg-secondary border border-semantic-border rounded-lg px-3 py-2">
                <kbd className="px-1.5 py-0.5 rounded bg-semantic-bg-hover font-mono text-semantic-text-main border border-semantic-border">⌘K</kbd>
                <span>để tìm kiếm hoặc tạo inbox mới</span>
            </div>
        </div>
    );
}

/** Group header with label and count */
export function GroupHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="flex items-center gap-2 px-4 sticky top-0 bg-semantic-bg-primary/95 backdrop-blur-sm z-10 py-2 border-b border-semantic-border">
            <span className="text-xs font-semibold text-semantic-text-muted uppercase tracking-wider">{label}</span>
            <span className="text-xs text-semantic-text-muted">({count})</span>
        </div>
    );
}

/** Single email item */
interface EmailItemProps {
    message: Message;
    isSelected: boolean;
    onSelect: () => void;
    onCopyOTP: (otp: string, e: React.MouseEvent) => void;
    onStar?: (id: string, e: React.MouseEvent) => void;
    onArchive?: (id: string, e: React.MouseEvent) => void;
    onDelete?: (id: string, e: React.MouseEvent) => void;
}

export function EmailItem({ message, isSelected, onSelect, onCopyOTP, onStar, onArchive, onDelete }: EmailItemProps) {
    const otpResult = extractOTP(message.textBody || message.subject || '');
    const otp = typeof otpResult === 'string' ? otpResult : otpResult?.code;
    const isUnread = !message.isRead;
    const { letter, color } = getSenderAvatar(message.fromAddress || '');
    const preview = message.textBody?.replace(/\s+/g, ' ').trim().substring(0, 140) || 'Không có nội dung xem trước';

    return (
        <div
            className={cn(
                "group relative flex h-[60px] cursor-pointer items-center gap-3 border-l-[3px] border-l-transparent px-3 transition-colors duration-150",
                isSelected
                    ? "border-l-semantic-accent bg-semantic-bg-selected"
                    : isUnread
                        ? "border-l-semantic-accent bg-semantic-accent-subtle/40 hover:bg-semantic-accent-subtle/60"
                        : "hover:bg-semantic-bg-hover"
            )}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelect()}
        >
            {/* Inline Actions - appear on hover */}
            {(onStar || onArchive || onDelete) && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-0.5 rounded-lg border border-semantic-border bg-semantic-bg-elevated p-1 opacity-0 shadow-semantic-md transition-opacity duration-150 group-hover:opacity-100">
                    {onStar && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onStar(message.id, e); }}
                            className={cn(
                                "p-1.5 rounded-md transition-colors",
                                message.isPinned
                                    ? "text-semantic-warning hover:bg-semantic-warning-subtle"
                                    : "text-semantic-text-muted hover:text-semantic-warning hover:bg-semantic-bg-hover"
                            )}
                            title={message.isPinned ? "Bỏ gắn sao" : "Gắn sao"}
                        >
                            <svg className="w-4 h-4" fill={message.isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </button>
                    )}
                    {onArchive && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onArchive(message.id, e); }}
                            className="p-1.5 rounded-md text-semantic-text-muted hover:text-semantic-text-main hover:bg-semantic-bg-hover transition-colors"
                            title="Lưu trữ"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(message.id, e); }}
                            className="p-1.5 rounded-md text-semantic-text-muted hover:text-semantic-danger hover:bg-semantic-danger-subtle transition-colors"
                            title="Xóa"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            )}

            {/* Sender Avatar */}
            <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: color }}
                aria-hidden="true"
            >
                {letter}
            </div>

            <div className="min-w-0 flex-1">
                {/* Row 1: sender + attachment/OTP indicators + time */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        {message.isPinned && (
                            <svg className="h-3 w-3 flex-shrink-0 text-semantic-warning" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        )}
                        <span className={cn(
                            "truncate text-sm",
                            isUnread || isSelected ? "text-semantic-text-main font-semibold" : "text-semantic-text-secondary font-medium"
                        )}>
                            {message.fromAddress}
                        </span>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                        {message.attachments && message.attachments.length > 0 && (
                            <svg className="h-3.5 w-3.5 text-semantic-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        )}
                        {message.labels && message.labels.length > 0 && (
                            <span className="flex items-center gap-0.5" title={message.labels.map(({ label }) => label.name).join(', ')}>
                                {message.labels.slice(0, 3).map(({ label }) => (
                                    <span key={label.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                                ))}
                            </span>
                        )}
                        {otp && (
                            <button
                                className="inline-flex items-center gap-1 rounded-full bg-semantic-accent-subtle px-2 py-0.5 text-[10px] font-semibold text-semantic-accent-text transition-colors hover:bg-semantic-accent/20"
                                onClick={(e) => onCopyOTP(otp, e)}
                                title="Nhấn để sao chép OTP"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </svg>
                                {otp}
                            </button>
                        )}
                        <span className="whitespace-nowrap text-xs text-semantic-text-muted">
                            {formatRelativeTime(new Date(message.receivedAt))}
                        </span>
                    </div>
                </div>

                {/* Row 2: subject (truncate) + muted preview snippet, single line */}
                <div className="truncate text-sm leading-tight">
                    <span className={cn(isUnread || isSelected ? "text-semantic-text-main font-medium" : "text-semantic-text-secondary")}>
                        {message.subject || '(Không có tiêu đề)'}
                    </span>
                    <span className="text-semantic-text-muted"> — {preview}</span>
                </div>
            </div>
        </div>
    );
}
