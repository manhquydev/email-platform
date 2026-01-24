/**
 * MessageList - Virtualized message list using react-virtuoso
 * Efficiently renders 1000+ messages with smooth scrolling
 */
import { useEffect, useRef, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import { MessageListItem } from "./message-list-item";

interface Message {
  id: string;
  fromAddress: string | null;
  subject: string | null;
  receivedAt: string;
  isRead: boolean;
  preview: string;
  attachmentCount: number;
}

interface MessageListProps {
  messages: Message[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  focusedIndex?: number;
  onFocusChange?: (index: number) => void;
}

// Constants
const PAGE_SIZE = 20;

// Loading skeleton component
function MessageListSkeleton() {
  return (
    <div className="divide-y divide-zinc-900">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 animate-pulse">
          <div className="flex justify-between items-start mb-2">
            <div className="h-4 bg-zinc-900 rounded w-32" />
            <div className="h-3 bg-zinc-900 rounded w-16" />
          </div>
          <div className="h-4 bg-zinc-900 rounded w-3/4 mb-2" />
          <div className="h-3 bg-zinc-900 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

// Empty state component
function MessageListEmpty() {
  return (
    <div className="p-8 text-center">
      <svg
        className="w-16 h-16 mx-auto text-zinc-700 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      <p className="text-zinc-400 text-lg font-medium mb-1">Không có email nào</p>
      <p className="text-zinc-600 text-sm">Hộp thư này chưa nhận được email hoặc đã hết hạn</p>
    </div>
  );
}

export function MessageList({
  messages,
  selectedId,
  onSelect,
  total,
  page,
  onPageChange,
  loading = false,
  focusedIndex = 0,
  onFocusChange,
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Scroll to focused index when it changes
  const scrollToIndex = useCallback((index: number) => {
    virtuosoRef.current?.scrollToIndex({
      index,
      align: "center",
      behavior: "smooth",
    });
  }, []);

  // Scroll to focused item when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < messages.length) {
      scrollToIndex(focusedIndex);
    }
  }, [focusedIndex, messages.length, scrollToIndex]);

  // Stable callback for item clicks (fixes memoization)
  const handleItemClick = useCallback((id: string, index: number) => {
    onFocusChange?.(index);
    onSelect(id);
  }, [onFocusChange, onSelect]);

  if (loading) {
    return <MessageListSkeleton />;
  }

  if (messages.length === 0) {
    return <MessageListEmpty />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1" role="listbox">
        <Virtuoso
          ref={virtuosoRef}
          data={messages}
          itemContent={(index, message) => (
            <MessageListItem
              message={message}
              isSelected={selectedId === message.id}
              isFocused={focusedIndex === index}
              index={index}
              onItemClick={handleItemClick}
            />
          )}
          style={{ height: "100%" }}
          className="divide-y divide-zinc-900"
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 p-3 border-t border-zinc-800">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded-md border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white disabled:opacity-50 transition-colors duration-100 text-sm"
          >
            Trước
          </button>
          <span className="px-3 py-1 text-zinc-500 text-sm">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded-md border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white disabled:opacity-50 transition-colors duration-100 text-sm"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
