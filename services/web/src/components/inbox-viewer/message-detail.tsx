// services/web/src/components/inbox-viewer/message-detail.tsx
import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { format } from "date-fns";
import { MessageDetailSkeleton } from "./skeletons";

interface Attachment {
  id: string;
  filename: string;
  mimeType: string | null;
  size: number | null;
}

interface MessageDetailProps {
  message: {
    id: string;
    fromAddress: string | null;
    toAddress: string | null;
    subject: string | null;
    receivedAt: string;
    htmlBody: string | null;
    textBody: string | null;
    attachments: Attachment[];
  } | null;
  loading: boolean;
  apiUrl: string;
}

export function MessageDetail({ message, loading, apiUrl }: MessageDetailProps) {
  const [sanitizedHtml, setSanitizedHtml] = useState("");

  useEffect(() => {
    if (message?.htmlBody) {
      // Sanitize HTML to prevent XSS
      const clean = DOMPurify.sanitize(message.htmlBody, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ["target"],
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSanitizedHtml(clean);
    } else {
       
      setSanitizedHtml("");
    }
  }, [message?.htmlBody]);

  if (loading) {
    return <MessageDetailSkeleton />;
  }

  if (!message) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <svg className="w-12 h-12 mb-3 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">Chọn một email để xem</p>
        <p className="text-xs text-zinc-600 mt-1">
          Sử dụng <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[10px]">j</kbd> /
          <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[10px]">k</kbd> để điều hướng
        </p>
      </div>
    );
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "Không rõ";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-2">{message.subject || "(không có tiêu đề)"}</h2>
        <div className="text-sm text-zinc-500 space-y-1">
          <div><strong className="text-zinc-400">Từ:</strong> {message.fromAddress || "(không rõ)"}</div>
          <div><strong className="text-zinc-400">Đến:</strong> {message.toAddress || "(không rõ)"}</div>
          <div>
            <strong className="text-zinc-400">Ngày:</strong> {format(new Date(message.receivedAt), "PPpp")}
          </div>
        </div>
      </div>

      {/* Attachments */}
      {message.attachments.length > 0 && (
        <div className="p-4 border-b border-zinc-800 bg-zinc-950">
          <div className="text-sm font-medium text-zinc-300 mb-2">
            Tệp đính kèm ({message.attachments.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <a
                key={att.id}
                href={`${apiUrl}/api/public/attachments/${att.id}/download`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors duration-100"
                download
              >
                <span className="truncate max-w-[150px]">{att.filename}</span>
                <span className="text-xs text-zinc-500">({formatSize(att.size)})</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Body - White container for HTML emails per validated decision */}
      <div className="flex-1 p-4">
        {sanitizedHtml ? (
          <div
            className="prose max-w-none bg-white text-black p-4 rounded-lg"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : message.textBody ? (
          <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300">{message.textBody}</pre>
        ) : (
          <div className="text-zinc-500 italic">(không có nội dung)</div>
        )}
      </div>
    </div>
  );
}
