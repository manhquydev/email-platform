// services/web/src/components/inbox-viewer/message-list.tsx
import { formatDistanceToNow } from "date-fns";

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
}

// Loading skeleton component
function MessageSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex justify-between items-start mb-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
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
}: MessageListProps) {
  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {loading ? (
          // Loading skeleton
          <div className="divide-y divide-nebula-border">
            {[...Array(5)].map((_, i) => (
              <MessageSkeleton key={i} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          // Enhanced empty state
          <div className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-nebula-text-muted text-lg font-medium mb-1">Không có email nào</p>
            <p className="text-nebula-text-muted text-sm">Hộp thư này chưa nhận được email hoặc đã hết hạn</p>
          </div>
        ) : (
          <ul className="divide-y divide-nebula-border">
            {messages.map((msg) => (
              <li
                key={msg.id}
                onClick={() => onSelect(msg.id)}
                className={`p-4 cursor-pointer hover:bg-nebula-elevated hover:border-l-2 hover:border-l-nebula-violet ${
                  selectedId === msg.id ? "bg-nebula-violet/10 border-l-2 border-l-nebula-violet" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm truncate max-w-[200px]">
                    {msg.fromAddress || "(không rõ)"}
                  </span>
                  <span className="text-xs text-nebula-text-muted">
                    {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-sm font-medium mb-1 truncate">
                  {msg.subject || "(không có tiêu đề)"}
                </div>
                <div className="text-xs text-nebula-text-muted truncate">{msg.preview}</div>
                {msg.attachmentCount > 0 && (
                  <span className="text-xs text-info mt-1 inline-block">
                    {msg.attachmentCount} tệp đính kèm
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 p-4 border-t border-nebula-border">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Trước
          </button>
          <span className="px-3 py-1">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
