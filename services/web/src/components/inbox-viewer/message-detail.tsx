// services/web/src/components/inbox-viewer/message-detail.tsx
import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { format } from "date-fns";

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
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-nebula-violet border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex items-center justify-center h-full text-nebula-text-muted">
        Select a message to view
      </div>
    );
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="p-4 border-b border-nebula-border">
        <h2 className="text-xl font-bold mb-2">{message.subject || "(no subject)"}</h2>
        <div className="text-sm text-nebula-text-muted space-y-1">
          <div><strong>From:</strong> {message.fromAddress || "(unknown)"}</div>
          <div><strong>To:</strong> {message.toAddress || "(unknown)"}</div>
          <div>
            <strong>Date:</strong> {format(new Date(message.receivedAt), "PPpp")}
          </div>
        </div>
      </div>

      {/* Attachments */}
      {message.attachments.length > 0 && (
        <div className="p-4 border-b border-nebula-border bg-nebula-elevated">
          <div className="text-sm font-medium mb-2">
            Attachments ({message.attachments.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <a
                key={att.id}
                href={`${apiUrl}/api/public/attachments/${att.id}/download`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-nebula-surface border border-nebula-border rounded-lg text-sm hover:bg-nebula-elevated"
                download
              >
                <span className="truncate max-w-[150px]">{att.filename}</span>
                <span className="text-xs text-nebula-text-muted">({formatSize(att.size)})</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 p-4">
        {sanitizedHtml ? (
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : message.textBody ? (
          <pre className="whitespace-pre-wrap font-sans text-sm">{message.textBody}</pre>
        ) : (
          <div className="text-nebula-text-muted italic">(no content)</div>
        )}
      </div>
    </div>
  );
}
