/**
 * MessageListItem - Memoized item component for virtualized message list
 * Used with react-virtuoso for efficient rendering of 1000+ messages
 * Supports compact/comfortable density modes via data-density attribute
 */
import { memo } from "react";
import { formatDistanceToNow } from "date-fns";
import { GhostActionBar } from "./ghost-action-bar";
import { useDensity } from "./density-context";

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
  const { density } = useDensity();
  const isCompact = density === "compact";

  return (
    <div
      onClick={() => onItemClick(message.id, index)}
      role="option"
      aria-selected={isFocused}
      className={`group relative cursor-pointer transition-colors duration-100 border-l-2 ${
        isCompact ? "p-2 min-h-[44px]" : "p-4 min-h-[56px]"
      } ${
        isFocused
          ? "bg-zinc-900 border-l-white"
          : "bg-black hover:bg-zinc-900 border-l-transparent hover:border-l-zinc-700"
      } ${isSelected ? "ring-1 ring-inset ring-zinc-700" : ""}`}
    >
      <div className="flex justify-between items-start mb-1">
        <span
          className={`truncate max-w-[200px] ${
            isCompact ? "text-xs" : "text-sm"
          } ${message.isRead ? "text-zinc-500" : "text-white font-medium"}`}
        >
          {message.fromAddress || "(không rõ)"}
        </span>
        <span className={`text-zinc-600 flex-shrink-0 ${isCompact ? "text-[10px]" : "text-xs"}`}>
          {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: true })}
        </span>
      </div>

      <div
        className={`mb-1 truncate ${isCompact ? "text-xs" : "text-sm"} ${
          message.isRead ? "text-zinc-400" : "text-white font-medium"
        }`}
      >
        {message.subject || "(không có tiêu đề)"}
      </div>

      {/* Preview - hidden in compact mode */}
      {!isCompact && (
        <div className="text-xs text-zinc-600 truncate">{message.preview}</div>
      )}

      {/* Attachment indicator - simplified in compact mode */}
      {message.attachmentCount > 0 && (
        <div className={`flex items-center gap-1 text-zinc-500 ${isCompact ? "mt-0.5 text-[10px]" : "mt-1.5 text-xs"}`}>
          <svg className={isCompact ? "w-2.5 h-2.5" : "w-3 h-3"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          {!isCompact && <span>{message.attachmentCount} tệp đính kèm</span>}
        </div>
      )}

      {/* Ghost Action Bar - Desktop only */}
      <GhostActionBar />
    </div>
  );
});
