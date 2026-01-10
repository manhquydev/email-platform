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
}

export function MessageList({
  messages,
  selectedId,
  onSelect,
  total,
  page,
  onPageChange,
}: MessageListProps) {
  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {messages.length === 0 ? (
          <div className="p-4 text-center text-nebula-text-muted">No messages found</div>
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
                    {msg.fromAddress || "(unknown)"}
                  </span>
                  <span className="text-xs text-nebula-text-muted">
                    {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-sm font-medium mb-1 truncate">
                  {msg.subject || "(no subject)"}
                </div>
                <div className="text-xs text-nebula-text-muted truncate">{msg.preview}</div>
                {msg.attachmentCount > 0 && (
                  <span className="text-xs text-info mt-1 inline-block">
                    {msg.attachmentCount} attachment(s)
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
            Prev
          </button>
          <span className="px-3 py-1">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
