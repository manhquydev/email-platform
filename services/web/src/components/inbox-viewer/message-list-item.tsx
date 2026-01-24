/**
 * MessageListItem - Memoized item component for virtualized message list
 * Used with react-virtuoso for efficient rendering of 1000+ messages
 */
import { memo } from "react";
import { formatDistanceToNow } from "date-fns";
import { GhostActionBar } from "./ghost-action-bar";

interface Message {
  id: string;
  fromAddress: string | null;
  subject: string | null;
  receivedAt: string;
  isRead: boolean;
  preview: string;
  attachmentCount: number;
}

interface MessageListItemProps {
  message: Message;
  isSelected: boolean;
  isFocused: boolean;
  index: number;
  onItemClick: (id: string, index: number) => void;
}

export const MessageListItem = memo(function MessageListItem({
  message,
  isSelected,
  isFocused,
  index,
  onItemClick,
}: MessageListItemProps) {
  return (
    <div
      onClick={() => onItemClick(message.id, index)}
      role="option"
      aria-selected={isFocused}
      className={`group relative p-4 min-h-[56px] cursor-pointer transition-colors duration-100 border-l-2 ${
        isFocused
          ? "bg-zinc-900 border-l-white"
          : "bg-black hover:bg-zinc-900 border-l-transparent hover:border-l-zinc-700"
      } ${isSelected ? "ring-1 ring-inset ring-zinc-700" : ""}`}
    >
      <div className="flex justify-between items-start mb-1">
        <span
          className={`text-sm truncate max-w-[200px] ${
            message.isRead ? "text-zinc-500" : "text-white font-medium"
          }`}
        >
          {message.fromAddress || "(không rõ)"}
        </span>
        <span className="text-xs text-zinc-600 flex-shrink-0">
          {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: true })}
        </span>
      </div>

      <div
        className={`text-sm mb-1 truncate ${
          message.isRead ? "text-zinc-400" : "text-white font-medium"
        }`}
      >
        {message.subject || "(không có tiêu đề)"}
      </div>

      <div className="text-xs text-zinc-600 truncate">{message.preview}</div>

      {message.attachmentCount > 0 && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-zinc-500">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          <span>{message.attachmentCount} tệp đính kèm</span>
        </div>
      )}

      {/* Ghost Action Bar - Desktop only */}
      <GhostActionBar />
    </div>
  );
});
