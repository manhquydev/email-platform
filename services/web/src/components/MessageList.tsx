/**
 * MessageList - Email message list with search, bulk actions, and swipe gestures
 * Modules extracted to message-list-modules/
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SnoozePicker } from "./SnoozePicker";
import {
    type MessageListProps,
    containerVariants,
    itemVariants,
    EmptyInboxState,
    EmptyMessagesState,
    SkeletonMessage,
    SearchToolbar,
    BulkActionsToolbar,
    MessageItem
} from "./message-list-modules";

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

    if (!inbox) {
        return <EmptyInboxState />;
    }

    return (
        <div className="flex flex-col h-full border-r border-border bg-surface w-full">
            {/* Search & Toolbar */}
            <SearchToolbar
                search={search}
                onSearchChange={onSearchChange}
                hasAttachments={hasAttachments}
                onToggleAttachments={onToggleAttachments}
                onRefresh={onRefresh}
                loading={loading}
                onBack={onBack}
                searchInputRef={searchInputRef}
            />

            {/* Message List */}
            <div className="flex-1 overflow-y-auto">
                {loading && messages.length === 0 ? (
                    <div className="divide-y divide-border">
                        {[1, 2, 3, 4, 5].map((i) => <SkeletonMessage key={i} />)}
                    </div>
                ) : messages.length === 0 ? (
                    <EmptyMessagesState />
                ) : (
                    <>
                        {/* Bulk Action Toolbar */}
                        {selectedIds.size > 0 && (
                            <BulkActionsToolbar
                                selectedCount={selectedIds.size}
                                totalCount={messages.length}
                                onSelectAll={onSelectAll}
                                onClearSelection={onClearSelection}
                                onBulkMarkRead={onBulkMarkRead}
                                onBulkDelete={onBulkDelete}
                            />
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
                                        <MessageItem
                                            msg={msg}
                                            isSelected={selectedMessageId === msg.id}
                                            isChecked={selectedIds.has(msg.id)}
                                            showCheckboxes={selectedIds.size > 0}
                                            onSelect={() => onSelectMessage(msg)}
                                            onToggleCheck={() => onToggleSelect(msg.id)}
                                            onTogglePin={() => onTogglePin(msg.id, !msg.isPinned)}
                                            onSnooze={() => setSnoozeMessageId(msg.id)}
                                            onDelete={() => onDelete(msg.id)}
                                            onMarkUnread={() => onMarkUnread(msg.id)}
                                        />
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
