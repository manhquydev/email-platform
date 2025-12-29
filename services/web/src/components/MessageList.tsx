import type { Message, Inbox } from "../types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useState, type RefObject } from "react";
import { SnoozePicker } from "./SnoozePicker";
import { SwipeableMessage } from "./SwipeableMessage";
import { motion, AnimatePresence } from "framer-motion";

interface MessageListProps {
    inbox?: Inbox;
    messages: Message[];
    selectedMessageId: string | undefined;
    onSelectMessage: (msg: Message) => void;
    onMarkUnread: (msgId: string) => void;
    onTogglePin: (msgId: string, isPinned: boolean) => void;
    onSnooze: (msgId: string, until: Date | null) => void;
    search: string;
    onSearchChange: (val: string) => void;
    hasAttachments: boolean;
    onToggleAttachments: () => void;
    onRefresh: () => void;
    loading: boolean;
    canLoadMore: boolean;
    onLoadMore: () => void;
    onBack?: () => void;
    searchInputRef?: RefObject<HTMLInputElement | null>;
    // Bulk selection
    selectedIds: Set<string>;
    onToggleSelect: (msgId: string) => void;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onBulkDelete: () => void;
    onBulkMarkRead: () => void;
    // Swipe actions
    onDelete: (msgId: string) => void;
}

export function MessageList({
    inbox,
    messages,
    selectedMessageId,
    onSelectMessage,
    onMarkUnread,
    onTogglePin,
    onSnooze,
    search,
    onSearchChange,
    hasAttachments,
    onToggleAttachments,
    onRefresh,
    loading,
    canLoadMore,
    onLoadMore,
    onBack,
    searchInputRef,
    selectedIds,
    onToggleSelect,
    onSelectAll,
    onClearSelection,
    onBulkDelete,
    onBulkMarkRead,
    onDelete,
}: MessageListProps) {
    const [snoozeMessageId, setSnoozeMessageId] = useState<string | null>(null);
    const snoozeMessage = messages.find(m => m.id === snoozeMessageId);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    if (!inbox) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="21" cy="12" r="1" fill="currentColor" opacity="0.4" />
                </svg>
                <div className="text-lg font-medium mb-1">Chọn một hộp thư</div>
                <div className="text-sm text-text-light">Chọn hộp thư từ sidebar để xem email</div>
            </div>
        );
    }


    // Skeleton Loading Component
    const SkeletonMessage = () => (
        <div className="p-3 animate-pulse">
            <div className="flex justify-between items-center mb-2">
                <div className="skeleton skeleton-text w-32"></div>
                <div className="skeleton skeleton-text w-16"></div>
            </div>
            <div className="skeleton skeleton-text w-48 mb-2"></div>
            <div className="skeleton skeleton-text w-full"></div>
            <div className="skeleton skeleton-text w-3/4"></div>
        </div>
    );

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
                            ref={searchInputRef}
                            className="pl-8 text-sm py-1.5 w-full"
                            placeholder="Tìm kiếm email... (nhấn / để focus)"
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
                {loading && messages.length === 0 ? (
                    // Skeleton loading state
                    <div className="divide-y divide-border">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <SkeletonMessage key={i} />
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="empty-state">
                        <svg className="empty-state-icon" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                            <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="text-lg font-medium mb-1">Không có email</div>
                        <div className="text-sm text-text-light">Hộp thư này hiện đang trống</div>
                    </div>
                ) : (
                    <>
                        {/* Bulk Action Toolbar */}
                        {selectedIds.size > 0 && (
                            <div className="sticky top-0 z-20 bg-primary text-white px-3 py-2 flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="font-medium">{selectedIds.size} đã chọn</span>
                                    <button
                                        onClick={onSelectAll}
                                        className="text-xs hover:underline opacity-80"
                                    >
                                        Chọn tất cả ({messages.length})
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={onBulkMarkRead}
                                        className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-xs"
                                    >
                                        Đánh dấu đã đọc
                                    </button>
                                    <button
                                        onClick={onBulkDelete}
                                        className="px-2 py-1 rounded bg-danger hover:bg-danger/90 text-xs"
                                    >
                                        Xóa
                                    </button>
                                    <button
                                        onClick={onClearSelection}
                                        className="p-1 rounded hover:bg-white/20"
                                        title="Bỏ chọn"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                        <motion.div
                            className="divide-y divide-border"
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                        >
                            <AnimatePresence mode="popLayout">
                                {messages.map(msg => (
                                    <motion.div
                                        key={msg.id}
                                        variants={itemVariants}
                                        layout
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <SwipeableMessage
                                            onSwipeLeft={() => onDelete(msg.id)}
                                            onSwipeRight={() => onTogglePin(msg.id, !msg.isPinned)}
                                            leftLabel="Xóa"
                                            rightLabel={msg.isPinned ? "Bỏ ghim" : "Ghim"}
                                        >
                                            <div
                                                className={`group py-4 px-5 cursor-pointer relative list-item-interactive border-b border-border hover:bg-bg/50 transition-colors ${selectedMessageId === msg.id ? 'bg-primary-light ring-1 ring-inset ring-primary-border' : ''} ${selectedIds.has(msg.id) ? 'bg-primary-light/50' : ''}`}
                                            >
                                                {/* Checkbox for bulk selection - aligned better */}
                                                <div
                                                    className={`absolute left-3 top-4 ${selectedIds.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-20`}
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(msg.id)}
                                                        onChange={() => onToggleSelect(msg.id)}
                                                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                                    />
                                                </div>

                                                {/* Read Indicator */}
                                                {!msg.isRead && !selectedIds.has(msg.id) && selectedIds.size === 0 && (
                                                    <span className="absolute left-3 top-5 w-2.5 h-2.5 rounded-full bg-primary shadow-sm" title="Chưa đọc"></span>
                                                )}

                                                {/* Action buttons - refined style */}
                                                <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 z-10 bg-surface/90 backdrop-blur-sm rounded-md shadow-sm border border-border p-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onTogglePin(msg.id, !msg.isPinned);
                                                        }}
                                                        className={`p-1.5 rounded hover:bg-bg transition-all ${msg.isPinned ? 'text-yellow-500' : 'text-muted hover:text-yellow-500'}`}
                                                        title={msg.isPinned ? "Bỏ ghim" : "Ghim email"}
                                                    >
                                                        <svg className="w-4 h-4" fill={msg.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSnoozeMessageId(msg.id);
                                                        }}
                                                        className={`p-1.5 rounded hover:bg-bg transition-all ${msg.snoozedUntil ? 'text-primary' : 'text-muted hover:text-primary'}`}
                                                        title={msg.snoozedUntil ? `Snooze đến ${new Date(msg.snoozedUntil).toLocaleString('vi-VN')}` : "Nhắc lại sau"}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDelete(msg.id);
                                                        }}
                                                        className="p-1.5 rounded hover:bg-danger/10 text-muted hover:text-danger transition-all"
                                                        title="Xóa"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </button>

                                                    {msg.isRead && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onMarkUnread(msg.id);
                                                            }}
                                                            className="p-1.5 rounded hover:bg-bg hover:text-primary text-muted transition-all"
                                                            title="Đánh dấu chưa đọc"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                <circle cx="12" cy="12" r="3" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Snooze indicator */}
                                                {msg.snoozedUntil && (
                                                    <div className="absolute right-2 bottom-2 flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 text-[10px]">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        <span>{formatDistanceToNow(new Date(msg.snoozedUntil), { addSuffix: true, locale: vi })}</span>
                                                    </div>
                                                )}

                                                <div onClick={() => onSelectMessage(msg)} className="pl-6 space-y-1.5">
                                                    <div className="flex justify-between items-baseline gap-3 mb-1">
                                                        <div className={`text-[15px] truncate leading-snug ${!msg.isRead ? 'font-bold text-text-main' : 'font-medium text-text-main/80'}`}>
                                                            {msg.fromAddress || 'Không rõ người gửi'}
                                                        </div>
                                                        <div className="text-xs text-muted flex-shrink-0 whitespace-nowrap font-medium">
                                                            {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true, locale: vi })}
                                                        </div>
                                                    </div>

                                                    <div className={`text-sm truncate leading-snug ${!msg.isRead ? 'font-semibold text-text-main' : 'text-text-main/90'}`}>
                                                        {msg.subject || '(Không có tiêu đề)'}
                                                    </div>

                                                    <div className="text-[13px] text-muted truncate line-clamp-2 leading-relaxed opacity-80">
                                                        {msg.textBody ? msg.textBody.substring(0, 120) : 'Không có nội dung xem trước...'}

                                                        {msg.attachments && msg.attachments.length > 0 && (
                                                            <div className="mt-2 flex gap-1 flex-wrap">
                                                                {msg.attachments.slice(0, 3).map((a: any) => (
                                                                    <span key={a.id} className="inline-flex items-center px-2 py-0.5 rounded-full bg-bg border border-border text-[10px] text-muted-foreground hover:bg-bg-dark transition-colors">
                                                                        <svg className="w-3 h-3 mr-1 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                                        {a.filename}
                                                                    </span>
                                                                ))}
                                                                {msg.attachments.length > 3 && <span className="text-[10px] text-muted flex items-center">+{msg.attachments.length - 3}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </SwipeableMessage>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {canLoadMore && (
                                <div className="p-3 text-center">
                                    <button onClick={onLoadMore} disabled={loading} className="text-xs text-primary hover:underline">
                                        {loading ? 'Đang tải...' : 'Xem thêm tin cũ hơn'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </div>

            {/* Snooze Picker Modal */}
            {snoozeMessageId && snoozeMessage && (
                <SnoozePicker
                    currentSnooze={snoozeMessage.snoozedUntil}
                    onSnooze={(until) => {
                        onSnooze(snoozeMessageId, until);
                        setSnoozeMessageId(null);
                    }}
                    onClose={() => setSnoozeMessageId(null)}
                />
            )}
        </div>
    );
}
