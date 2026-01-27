/**
 * Ephemeral Message List - Display incoming messages with auto-refresh
 */
import { useState } from 'react';
import DOMPurify from 'dompurify';
import type { EphemeralMessage } from '../../services/ephemeralService';

interface EphemeralMessageListProps {
    messages: EphemeralMessage[];
    isLoading: boolean;
    lastRefresh: Date | null;
}

export function EphemeralMessageList({ messages, isLoading, lastRefresh }: EphemeralMessageListProps) {
    const [selectedMessage, setSelectedMessage] = useState<EphemeralMessage | null>(null);

    if (messages.length === 0 && !isLoading) {
        return <EmptyState lastRefresh={lastRefresh} />;
    }

    return (
        <div className="neo-glass rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h2 className="font-semibold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined !text-[20px]">inbox</span>
                    Tin nhắn ({messages.length})
                </h2>
                {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-[var(--nebula-text-secondary)]">
                        <span className="material-symbols-outlined !text-[16px] animate-spin">sync</span>
                        Đang tải...
                    </div>
                )}
                {lastRefresh && !isLoading && (
                    <div className="text-xs text-[var(--nebula-text-secondary)]">
                        Cập nhật: {lastRefresh.toLocaleTimeString('vi-VN')}
                    </div>
                )}
            </div>

            {/* Message List */}
            <div className="divide-y divide-white/5">
                {messages.map((message) => (
                    <MessageRow
                        key={message.id}
                        message={message}
                        isSelected={selectedMessage?.id === message.id}
                        onClick={() => setSelectedMessage(
                            selectedMessage?.id === message.id ? null : message
                        )}
                    />
                ))}
            </div>

            {/* Message Detail Modal */}
            {selectedMessage && (
                <MessageDetailModal
                    message={selectedMessage}
                    onClose={() => setSelectedMessage(null)}
                />
            )}
        </div>
    );
}

/** Single message row */
function MessageRow({
    message,
    isSelected,
    onClick
}: {
    message: EphemeralMessage;
    isSelected: boolean;
    onClick: () => void;
}) {
    const receivedDate = new Date(message.receivedAt);
    const timeAgo = getTimeAgo(receivedDate);

    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${
                isSelected ? 'bg-white/10' : ''
            }`}
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[var(--nebula-violet)]/20 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[20px]">
                        person
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-white truncate text-sm">
                            {message.fromAddress}
                        </span>
                        <span className="text-xs text-[var(--nebula-text-secondary)] flex-shrink-0">
                            {timeAgo}
                        </span>
                    </div>
                    <p className="text-sm text-white truncate font-medium">
                        {message.subject || '(Không có tiêu đề)'}
                    </p>
                    <p className="text-xs text-[var(--nebula-text-secondary)] truncate mt-0.5">
                        {message.textBody?.substring(0, 100) || '(Không có nội dung)'}
                    </p>
                </div>

                {/* Attachments indicator */}
                {message.attachments && message.attachments.length > 0 && (
                    <span className="material-symbols-outlined text-[var(--nebula-text-secondary)] !text-[16px]">
                        attach_file
                    </span>
                )}
            </div>
        </button>
    );
}

/** Empty state with waiting animation */
function EmptyState({ lastRefresh }: { lastRefresh: Date | null }) {
    return (
        <div className="neo-glass rounded-xl p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--nebula-violet)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[40px] animate-bounce">
                    mark_email_unread
                </span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
                Đang chờ email đến...
            </h3>
            <p className="text-[var(--nebula-text-secondary)] text-sm max-w-md mx-auto mb-4">
                Gửi email đến địa chỉ ở trên để kiểm tra. Email sẽ xuất hiện tự động trong vài giây.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-[var(--nebula-text-secondary)]">
                <span className="material-symbols-outlined !text-[16px] animate-spin">sync</span>
                Tự động làm mới mỗi 10 giây
                {lastRefresh && (
                    <span>• Lần cuối: {lastRefresh.toLocaleTimeString('vi-VN')}</span>
                )}
            </div>
        </div>
    );
}

/** Message detail modal - Optimized for better UX */
function MessageDetailModal({
    message,
    onClose
}: {
    message: EphemeralMessage;
    onClose: () => void;
}) {
    const receivedDate = new Date(message.receivedAt);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black/70 backdrop-blur-md"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full max-w-4xl max-h-[90vh] bg-[var(--nebula-surface)] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header - More spacious */}
                <div className="flex items-start justify-between gap-4 px-6 sm:px-8 py-5 sm:py-6 border-b border-white/10 bg-white/[0.02]">
                    <div className="min-w-0 flex-1 space-y-2">
                        <h3 className="text-lg sm:text-xl font-semibold text-white leading-tight">
                            {message.subject || '(Không có tiêu đề)'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <div className="flex items-center gap-2 text-[var(--nebula-text-secondary)]">
                                <span className="material-symbols-outlined !text-[18px] text-[var(--nebula-violet)]">person</span>
                                <span className="text-white/90">{message.fromAddress}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--nebula-text-secondary)]">
                                <span className="material-symbols-outlined !text-[18px]">schedule</span>
                                <span>{receivedDate.toLocaleString('vi-VN', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                })}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-white/10 rounded-xl transition-colors flex-shrink-0 group"
                        title="Đóng (Esc)"
                    >
                        <span className="material-symbols-outlined text-white/70 group-hover:text-white transition-colors">close</span>
                    </button>
                </div>

                {/* Body - More spacious with better typography */}
                <div className="flex-1 overflow-auto">
                    <div className="px-6 sm:px-8 py-6 sm:py-8">
                        {message.htmlBody ? (
                            <div
                                className="prose prose-invert prose-sm sm:prose-base max-w-none
                                    prose-headings:text-white prose-p:text-white/85 prose-p:leading-relaxed
                                    prose-a:text-[var(--nebula-violet)] prose-a:no-underline hover:prose-a:underline
                                    prose-strong:text-white prose-code:text-[var(--nebula-cyan)]
                                    prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.htmlBody) }}
                            />
                        ) : (
                            <div className="whitespace-pre-wrap text-sm sm:text-base text-white/85 font-sans leading-relaxed">
                                {message.textBody || '(Không có nội dung)'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Attachments - Enhanced styling */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="px-6 sm:px-8 py-4 border-t border-white/10 bg-white/[0.02]">
                        <p className="text-xs text-[var(--nebula-text-secondary)] mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined !text-[16px]">attach_file</span>
                            Tệp đính kèm ({message.attachments.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {message.attachments.map((att, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors cursor-default"
                                >
                                    <span className="material-symbols-outlined !text-[16px] text-[var(--nebula-violet)]">description</span>
                                    <span className="truncate max-w-[200px]">{att.filename}</span>
                                    <span className="text-xs text-[var(--nebula-text-secondary)]">
                                        {formatFileSize(att.size)}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer with actions */}
                <div className="px-6 sm:px-8 py-4 border-t border-white/10 flex items-center justify-between">
                    <p className="text-xs text-[var(--nebula-text-secondary)]">
                        Nhấn Esc hoặc click bên ngoài để đóng
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Helper: format file size */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Helper: relative time */
function getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return date.toLocaleDateString('vi-VN');
}
