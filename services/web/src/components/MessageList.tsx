import type { Message, Inbox } from "../types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface MessageListProps {
    inbox?: Inbox;
    messages: Message[];
    selectedMessageId: string | undefined;
    onSelectMessage: (msg: Message) => void;
    search: string;
    onSearchChange: (val: string) => void;
    hasAttachments: boolean;
    onToggleAttachments: () => void;
    onRefresh: () => void;
    loading: boolean;
    canLoadMore: boolean;
    onLoadMore: () => void;
    onBack?: () => void;
}

export function MessageList({
    inbox,
    messages,
    selectedMessageId,
    onSelectMessage,
    search,
    onSearchChange,
    hasAttachments,
    onToggleAttachments,
    onRefresh,
    loading,
    canLoadMore,
    onLoadMore,
    onBack
}: MessageListProps) {

    if (!inbox) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted p-4 text-center">
                <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div>Chọn một hộp thư để xem email</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full border-r border-border bg-surface w-full">
            {/* Search & Toolbase */}
            <div className="p-3 border-b border-border flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <button onClick={onBack} className="md:hidden p-1.5 -ml-1 text-muted hover:text-text-main">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                    )}
                    <div className="relative flex-1">
                        <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-muted w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <input
                            className="pl-8 text-sm py-1.5 w-full"
                            placeholder="Tìm kiếm email..."
                            value={search}
                            onChange={e => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
                        <input type="checkbox" checked={hasAttachments} onChange={onToggleAttachments} className="rounded border-border w-3 h-3 text-primary focus:ring-primary" />
                        Có đính kèm
                    </label>

                    <button onClick={onRefresh} className="p-1 hover:bg-bg rounded text-muted hover:text-primary" title="Làm mới">
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                </div>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto">
                {messages.length === 0 && !loading ? (
                    <div className="text-center py-10 text-muted text-sm px-4">
                        Không tìm thấy email nào.
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                onClick={() => onSelectMessage(msg)}
                                className={`p-3 cursor-pointer transition-colors relative hover:bg-bg ${selectedMessageId === msg.id ? 'bg-primary-light ring-1 ring-inset ring-primary-border' : ''
                                    }`}
                            >
                                {/* Read Indicator */}
                                {!msg.isRead && (
                                    <span className="absolute left-1 top-4 w-2 h-2 rounded-full bg-primary" title="Chưa đọc"></span>
                                )}

                                <div className="flex justify-between items-baseline mb-1 pl-2">
                                    <div className={`text-sm truncate pr-2 ${!msg.isRead ? 'font-bold text-text-main' : 'font-medium text-text-main'}`}>
                                        {msg.fromAddress || 'Không rõ người gửi'}
                                    </div>
                                    <div className="text-[10px] text-muted flex-shrink-0 whitespace-nowrap">
                                        {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true, locale: vi })}
                                    </div>
                                </div>

                                <div className={`text-xs pl-2 truncate mb-1 ${!msg.isRead ? 'font-semibold text-text-main' : 'text-text-main'}`}>
                                    {msg.subject || '(Không có tiêu đề)'}
                                </div>

                                <div className="text-[11px] text-muted pl-2 truncate line-clamp-2">
                                    {msg.textBody ? msg.textBody.substring(0, 100) : 'Không có nội dung xem trước...'}
                                </div>

                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="pl-2 mt-1.5 flex gap-1 flex-wrap">
                                        {msg.attachments.slice(0, 3).map((a: any) => (
                                            <span key={a.id} className="inline-flex items-center px-1.5 py-0.5 rounded bg-bg border border-border text-[10px] text-muted">
                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                {a.filename}
                                            </span>
                                        ))}
                                        {msg.attachments.length > 3 && <span className="text-[10px] text-muted">+{msg.attachments.length - 3}</span>}
                                    </div>
                                )}
                            </div>
                        ))}

                        {canLoadMore && (
                            <div className="p-3 text-center">
                                <button onClick={onLoadMore} disabled={loading} className="text-xs text-primary hover:underline">
                                    {loading ? 'Đang tải...' : 'Xem thêm tin cũ hơn'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
