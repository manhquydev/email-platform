/**
 * Ephemeral Message List - Split View Layout (Gmail/Outlook style)
 * Left: Email list | Right: Email content
 */
import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import type { EphemeralMessage } from '../../services/ephemeralService';

interface EphemeralMessageListProps {
    messages: EphemeralMessage[];
    isLoading: boolean;
    lastRefresh: Date | null;
}

function sanitizeEmailHtml(html: string): string {
    return DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target', 'rel']
    });
}

export function EphemeralMessageList({ messages, isLoading, lastRefresh }: EphemeralMessageListProps) {
    const [selectedMessage, setSelectedMessage] = useState<EphemeralMessage | null>(null);

    // Auto-select first message when messages load
    useEffect(() => {
        if (messages.length > 0 && !selectedMessage) {
            setSelectedMessage(messages[0]);
        }
    }, [messages, selectedMessage]);

    // Update selected message when messages refresh
    useEffect(() => {
        if (selectedMessage) {
            const updated = messages.find(m => m.id === selectedMessage.id);
            if (updated) setSelectedMessage(updated);
        }
    }, [messages, selectedMessage]);

    if (messages.length === 0 && !isLoading) {
        return <EmptyState lastRefresh={lastRefresh} />;
    }

    return (
        <div className="neo-glass rounded-2xl overflow-hidden h-[600px] lg:h-[700px]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                <h2 className="font-semibold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined !text-[22px] text-[var(--nebula-violet)]">inbox</span>
                    Hộp thư đến
                    <span className="ml-1 px-2 py-0.5 bg-[var(--nebula-violet)]/20 text-[var(--nebula-violet)] text-xs font-medium rounded-full">
                        {messages.length}
                    </span>
                </h2>
                <div className="flex items-center gap-3">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-xs text-[var(--nebula-text-secondary)]">
                            <span className="material-symbols-outlined !text-[16px] animate-spin">sync</span>
                            Đang tải...
                        </div>
                    )}
                    {lastRefresh && !isLoading && (
                        <div className="text-xs text-[var(--nebula-text-secondary)] flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[14px]">schedule</span>
                            {lastRefresh.toLocaleTimeString('vi-VN')}
                        </div>
                    )}
                </div>
            </div>

            {/* Split View Container */}
            <div className="flex h-[calc(100%-60px)]">
                {/* Left Panel - Message List */}
                <div className={`w-full lg:w-[340px] xl:w-[380px] border-r border-white/10 overflow-y-auto flex-shrink-0 ${
                    selectedMessage ? 'hidden lg:block' : ''
                }`}>
                    <div className="divide-y divide-white/5">
                        {messages.map((message) => (
                            <MessageRow
                                key={message.id}
                                message={message}
                                isSelected={selectedMessage?.id === message.id}
                                onClick={() => setSelectedMessage(message)}
                            />
                        ))}
                    </div>
                </div>

                {/* Right Panel - Message Content */}
                <div className="hidden lg:flex flex-1 flex-col overflow-hidden bg-black/20">
                    {selectedMessage ? (
                        <MessageContent message={selectedMessage} />
                    ) : (
                        <NoMessageSelected />
                    )}
                </div>
            </div>

            {/* Mobile: Full screen modal when message selected */}
            {selectedMessage && (
                <div className="lg:hidden fixed inset-0 z-[120] bg-[var(--nebula-void)]">
                    <MobileMessageView
                        message={selectedMessage}
                        onBack={() => setSelectedMessage(null)}
                    />
                </div>
            )}
        </div>
    );
}

/** Message row in list */
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
            className={`w-full text-left px-4 py-4 transition-all duration-150 ${
                isSelected
                    ? 'bg-[var(--nebula-violet)]/15 border-l-2 border-[var(--nebula-violet)]'
                    : 'hover:bg-white/5 border-l-2 border-transparent'
            }`}
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-[var(--nebula-violet)]/30' : 'bg-[var(--nebula-violet)]/15'
                }`}>
                    <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[20px]">
                        person
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`font-medium truncate text-sm ${
                            isSelected ? 'text-white' : 'text-white/90'
                        }`}>
                            {extractSenderName(message.fromAddress)}
                        </span>
                        <span className="text-xs text-[var(--nebula-text-secondary)] flex-shrink-0">
                            {timeAgo}
                        </span>
                    </div>
                    <p className={`text-sm truncate ${
                        isSelected ? 'text-white font-medium' : 'text-white/80'
                    }`}>
                        {message.subject || '(Không có tiêu đề)'}
                    </p>
                    <p className="text-xs text-[var(--nebula-text-secondary)] truncate mt-1 leading-relaxed">
                        {message.textBody?.substring(0, 80) || '(Không có nội dung)'}
                    </p>
                </div>

                {/* Indicators */}
                <div className="flex flex-col items-end gap-1">
                    {message.attachments && message.attachments.length > 0 && (
                        <span className="material-symbols-outlined text-[var(--nebula-text-secondary)] !text-[16px]">
                            attach_file
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

/** Message content panel (desktop) */
function MessageContent({ message }: { message: EphemeralMessage }) {
    const receivedDate = new Date(message.receivedAt);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 lg:px-8 py-5 lg:py-6 border-b border-white/10 bg-white/[0.02]">
                <h2 className="text-xl lg:text-2xl font-semibold text-white leading-tight mb-3">
                    {message.subject || '(Không có tiêu đề)'}
                </h2>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-[var(--nebula-violet)]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[18px]">person</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">{extractSenderName(message.fromAddress)}</p>
                            <p className="text-xs text-[var(--nebula-text-secondary)]">{extractEmail(message.fromAddress)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--nebula-text-secondary)]">
                        <span className="material-symbols-outlined !text-[18px]">schedule</span>
                        <span>{receivedDate.toLocaleString('vi-VN', {
                            dateStyle: 'full',
                            timeStyle: 'short'
                        })}</span>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto">
                <div className="px-6 lg:px-8 py-6 lg:py-8">
                    {message.htmlBody ? (
                        <div
                            className="email-content rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:p-6
                                overflow-x-auto text-white/90
                                [&_*]:max-w-full [&_table]:block [&_table]:overflow-x-auto
                                [&_table]:whitespace-nowrap [&_td]:whitespace-normal [&_th]:whitespace-normal
                                [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words
                                [&_code]:break-all [&_a]:break-all"
                            dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(message.htmlBody) }}
                        />
                    ) : (
                        <div className="whitespace-pre-wrap break-words overflow-x-auto text-base lg:text-lg text-white/85 font-sans leading-relaxed">
                            {message.textBody || '(Không có nội dung)'}
                        </div>
                    )}
                </div>
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
                <div className="px-6 lg:px-8 py-4 border-t border-white/10 bg-white/[0.02]">
                    <p className="text-sm text-[var(--nebula-text-secondary)] mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined !text-[18px]">attach_file</span>
                        Tệp đính kèm ({message.attachments.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {message.attachments.map((att, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white transition-colors cursor-default"
                            >
                                <span className="material-symbols-outlined !text-[18px] text-[var(--nebula-violet)]">description</span>
                                <span className="truncate max-w-[200px]">{att.filename}</span>
                                <span className="text-xs text-[var(--nebula-text-secondary)]">
                                    {formatFileSize(att.size)}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Mobile full screen message view */
function MobileMessageView({
    message,
    onBack
}: {
    message: EphemeralMessage;
    onBack: () => void;
}) {
    const receivedDate = new Date(message.receivedAt);
    const [viewMode, setViewMode] = useState<'html' | 'text'>(message.htmlBody ? 'html' : 'text');

    useEffect(() => {
        setViewMode(message.htmlBody ? 'html' : 'text');
    }, [message.id, message.htmlBody]);

    return (
        <div className="flex flex-col h-full">
            {/* Header with back button */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[var(--nebula-surface)]">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                        {extractSenderName(message.fromAddress)}
                    </p>
                    <p className="text-xs text-[var(--nebula-text-secondary)]">
                        {receivedDate.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                </div>
            </div>

            {/* Subject */}
            <div className="px-4 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white leading-tight">
                    {message.subject || '(Không có tiêu đề)'}
                </h2>
                {message.htmlBody && message.textBody && (
                    <div className="mt-3 inline-flex items-center rounded-lg bg-white/5 p-1">
                        <button
                            onClick={() => setViewMode('html')}
                            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                                viewMode === 'html'
                                    ? 'bg-[var(--nebula-violet)] text-white'
                                    : 'text-[var(--nebula-text-secondary)] hover:text-white'
                            }`}
                        >
                            HTML
                        </button>
                        <button
                            onClick={() => setViewMode('text')}
                            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                                viewMode === 'text'
                                    ? 'bg-[var(--nebula-violet)] text-white'
                                    : 'text-[var(--nebula-text-secondary)] hover:text-white'
                            }`}
                        >
                            Text
                        </button>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto px-4 py-5">
                {viewMode === 'html' && message.htmlBody ? (
                    <div
                        className="email-content text-sm text-white/90 rounded-xl border border-white/10 bg-white/[0.02] p-3
                            overflow-x-auto
                            [&_*]:max-w-full [&_table]:block [&_table]:overflow-x-auto
                            [&_table]:whitespace-nowrap [&_td]:whitespace-normal [&_th]:whitespace-normal
                            [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words
                            [&_code]:break-all [&_a]:break-all"
                        dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(message.htmlBody) }}
                    />
                ) : (
                    <div className="whitespace-pre-wrap break-words overflow-x-auto text-sm text-white/85 leading-relaxed">
                        {message.textBody || '(Không có nội dung)'}
                    </div>
                )}
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
                <div className="px-4 py-3 border-t border-white/10">
                    <div className="flex flex-wrap gap-2">
                        {message.attachments.map((att, i) => (
                            <span key={i} className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-sm text-white max-w-full">
                                <span className="material-symbols-outlined !text-[16px]">attach_file</span>
                                <span className="truncate max-w-[200px]">{att.filename}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Empty state - No messages */
function EmptyState({ lastRefresh }: { lastRefresh: Date | null }) {
    return (
        <div className="neo-glass rounded-2xl p-12 lg:p-16 text-center">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-[var(--nebula-violet)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[var(--nebula-violet)] !text-[48px] animate-bounce">
                    mark_email_unread
                </span>
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">
                Đang chờ email đến...
            </h3>
            <p className="text-[var(--nebula-text-secondary)] text-base max-w-md mx-auto mb-6">
                Gửi email đến địa chỉ ở trên để kiểm tra. Email sẽ xuất hiện tự động trong vài giây.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-[var(--nebula-text-secondary)]">
                <span className="material-symbols-outlined !text-[18px] animate-spin">sync</span>
                Tự động làm mới mỗi 10 giây
                {lastRefresh && (
                    <span className="ml-2">• Lần cuối: {lastRefresh.toLocaleTimeString('vi-VN')}</span>
                )}
            </div>
        </div>
    );
}

/** No message selected state */
function NoMessageSelected() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[var(--nebula-text-secondary)] !text-[40px]">
                    mail
                </span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
                Chọn email để xem
            </h3>
            <p className="text-sm text-[var(--nebula-text-secondary)]">
                Chọn một email từ danh sách bên trái để xem nội dung
            </p>
        </div>
    );
}

/** Helper: Extract sender name from "Name <email>" format */
function extractSenderName(fromAddress: string): string {
    const match = fromAddress.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : fromAddress.split('@')[0];
}

/** Helper: Extract email from "Name <email>" format */
function extractEmail(fromAddress: string): string {
    const match = fromAddress.match(/<([^>]+)>/);
    return match ? match[1] : fromAddress;
}

/** Helper: Format file size */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Helper: Relative time */
function getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
