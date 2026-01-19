/**
 * UI components for EmailStream
 */
import type { Message } from "../../types";
import { cn } from "../../utils/cn";
import { extractOTP } from "../../utils/otpExtractor";
import { formatRelativeTime } from "./email-stream-types";

/** Empty state when no messages */
export function EmptyInbox() {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full text-nebula-text-muted">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-primary/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
            </div>
            <h3 className="text-lg font-semibold text-nebula-text mb-2">Hộp thư trống</h3>
            <p className="text-sm max-w-[250px] mb-4 leading-relaxed">
                Email mới sẽ xuất hiện ở đây. Chia sẻ địa chỉ này để nhận email.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-nebula-text-muted bg-nebula-elevated/50 border border-nebula-border rounded-lg px-3 py-2">
                <kbd className="px-1.5 py-0.5 rounded bg-nebula-elevated font-mono text-nebula-text border border-nebula-border">⌘K</kbd>
                <span>để tìm kiếm hoặc tạo inbox mới</span>
            </div>
        </div>
    );
}

/** Group header with label and count */
export function GroupHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="flex items-center gap-2 mb-2 px-4 sticky top-0 bg-nebula-surface/80 backdrop-blur-md z-10 py-2 border-b border-nebula-border">
            <span className="text-xs font-semibold text-nebula-text-muted uppercase tracking-wider">{label}</span>
            <span className="text-xs text-nebula-text-muted">({count})</span>
        </div>
    );
}

/** Single email item */
interface EmailItemProps {
    message: Message;
    isSelected: boolean;
    onSelect: () => void;
    onCopyOTP: (otp: string, e: React.MouseEvent) => void;
}

export function EmailItem({ message, isSelected, onSelect, onCopyOTP }: EmailItemProps) {
    const otpResult = extractOTP(message.textBody || message.subject || '');
    const otp = typeof otpResult === 'string' ? otpResult : otpResult?.code;
    const isUnread = !message.isRead;

    return (
        <div
            className={cn(
                "group relative p-4 cursor-pointer transition-all duration-200 border-b border-nebula-border last:border-0",
                "hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent",
                isUnread && "bg-gradient-to-r from-primary/[0.07] to-transparent",
                isSelected && "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border-l-4 border-l-primary shadow-[inset_0_0_25px_rgba(139,92,246,0.08)]",
                !isSelected && "hover:border-l-4 hover:border-l-primary/30"
            )}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelect()}
        >
            {/* Unread Indicator */}
            {isUnread && !isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
            )}

            <div className="space-y-1.5">
                {/* Header row: sender + time + indicators */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {message.isPinned && (
                            <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        )}
                        <span className={cn(
                            "text-sm truncate",
                            isUnread || isSelected ? "text-nebula-text font-semibold" : "text-nebula-text-secondary font-medium"
                        )}>
                            {message.fromAddress}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {message.attachments && message.attachments.length > 0 && (
                            <svg className="w-3.5 h-3.5 text-nebula-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        )}
                        <span className="text-xs text-nebula-text-muted whitespace-nowrap">
                            {formatRelativeTime(new Date(message.receivedAt))}
                        </span>
                    </div>
                </div>

                {/* Subject */}
                <div className={cn(
                    "text-sm truncate",
                    isUnread || isSelected ? "text-nebula-text font-medium" : "text-nebula-text-secondary"
                )}>
                    {message.subject || '(Không có tiêu đề)'}
                </div>

                {/* Preview */}
                <div className="text-xs text-nebula-text-muted line-clamp-2 leading-relaxed">
                    {message.textBody?.substring(0, 120) || 'Không có nội dung xem trước'}
                </div>

                {/* OTP Badge */}
                {otp && (
                    <button
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/15 to-purple-500/10 hover:from-primary/25 hover:to-purple-500/15 text-primary text-xs font-semibold transition-all border border-primary/20 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(139,92,246,0.25)] active:scale-[0.98]"
                        onClick={(e) => onCopyOTP(otp, e)}
                        title="Nhấn để sao chép OTP"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        OTP: {otp}
                    </button>
                )}

                {/* Labels */}
                {message.labels && message.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {message.labels.map(({ label }) => (
                            <span
                                key={label.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{
                                    backgroundColor: `${label.color}20`,
                                    color: label.color,
                                    border: `1px solid ${label.color}40`
                                }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                                {label.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
