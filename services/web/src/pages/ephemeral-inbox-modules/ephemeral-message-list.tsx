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
                        {message.snippet || '(Không có nội dung)'}
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

/** Message detail modal */
function MessageDetailModal({
    message,
    onClose
}: {
    message: EphemeralMessage;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[80vh] bg-[var(--nebula-surface)] rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white truncate">
                            {message.subject || '(Không có tiêu đề)'}
                        </h3>
                        <p className="text-sm text-[var(--nebula-text-secondary)] truncate">
                            Từ: {message.fromAddress}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-white">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-6">
                    {message.html ? (
                        <div
                            className="prose prose-invert max-w-none text-sm"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.html) }}
                        />
                    ) : (
                        <pre className="whitespace-pre-wrap text-sm text-[var(--nebula-text-secondary)] font-sans">
                            {message.text || message.snippet || '(Không có nội dung)'}
                        </pre>
                    )}
                </div>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="px-6 py-3 border-t border-white/10">
                        <p className="text-xs text-[var(--nebula-text-secondary)] mb-2">
                            Tệp đính kèm ({message.attachments.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {message.attachments.map((att, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-xs text-white"
                                >
                                    <span className="material-symbols-outlined !text-[14px]">attach_file</span>
                                    {att.filename}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Helper: relative time */
function getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return date.toLocaleDateString('vi-VN');
}
