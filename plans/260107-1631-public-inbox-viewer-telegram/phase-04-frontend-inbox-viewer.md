# Phase 04: Frontend - Inbox Viewer Page

## Context

- **Plan:** [plan.md](./plan.md)
- **Research:** [researcher-01-public-inbox-viewer.md](./research/researcher-01-public-inbox-viewer.md)

## Parallelization Info

| Can Parallel With | Depends On | Blocks |
|-------------------|------------|--------|
| Phase 05 | Phase 01, 02 | Phase 06 |

## Overview

| Priority | Status | Effort |
|----------|--------|--------|
| P1 | pending | 4h |

Create public-facing inbox viewer page at `/inbox-viewer`. Users search by email address, view paginated messages, and read full email content with attachments.

## Key Insights

- No authentication required
- Reuse existing component patterns (Loading, ErrorBoundary)
- Use existing `api.ts` utility for HTTP calls
- HTML email body sanitized with DOMPurify
- Lazy load DOMPurify to reduce bundle size

## Requirements

1. Email search input with validation
2. Paginated message list (20/page)
3. Message detail view with HTML rendering
4. Attachment list with download links
5. "Link to Telegram" button (opens modal from Phase 05)
6. Mobile responsive design

## Related Code Files (EXCLUSIVE)

| File | Action | Description |
|------|--------|-------------|
| `services/web/src/pages/InboxViewer.tsx` | Create | Main page component |
| `services/web/src/components/inbox-viewer/message-list.tsx` | Create | Message list component |
| `services/web/src/components/inbox-viewer/message-detail.tsx` | Create | Message detail component |
| `services/web/src/components/inbox-viewer/search-form.tsx` | Create | Email search form |
| `services/web/src/App.tsx` | Modify | Add route (2 lines) |

## File Ownership

- **ONLY this phase** creates `InboxViewer.tsx` and `inbox-viewer/` components
- Phase 05 creates `telegram-link-modal.tsx` (separate component)

## Implementation Steps

### 1. Install DOMPurify

```bash
cd services/web
npm install dompurify
npm install -D @types/dompurify
```

### 2. Create search-form.tsx

```tsx
// services/web/src/components/inbox-viewer/search-form.tsx
import { useState } from "react";

interface SearchFormProps {
  onSearch: (email: string) => void;
  loading: boolean;
}

export function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    onSearch(email);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Enter email address to view inbox
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "..." : "Search"}
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </form>
  );
}
```

### 3. Create message-list.tsx

```tsx
// services/web/src/components/inbox-viewer/message-list.tsx
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  fromAddress: string | null;
  subject: string | null;
  receivedAt: string;
  isRead: boolean;
  preview: string;
  _count: { attachments: number };
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
          <div className="p-4 text-center text-gray-500">No messages found</div>
        ) : (
          <ul className="divide-y dark:divide-gray-700">
            {messages.map((msg) => (
              <li
                key={msg.id}
                onClick={() => onSelect(msg.id)}
                className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  selectedId === msg.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm truncate max-w-[200px]">
                    {msg.fromAddress || "(unknown)"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-sm font-medium mb-1 truncate">
                  {msg.subject || "(no subject)"}
                </div>
                <div className="text-xs text-gray-500 truncate">{msg.preview}</div>
                {msg._count.attachments > 0 && (
                  <span className="text-xs text-blue-500 mt-1 inline-block">
                    {msg._count.attachments} attachment(s)
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 p-4 border-t dark:border-gray-700">
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
```

### 4. Create message-detail.tsx

```tsx
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
      setSanitizedHtml(clean);
    } else {
      setSanitizedHtml("");
    }
  }, [message?.htmlBody]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
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
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-xl font-bold mb-2">{message.subject || "(no subject)"}</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <div><strong>From:</strong> {message.fromAddress || "(unknown)"}</div>
          <div><strong>To:</strong> {message.toAddress || "(unknown)"}</div>
          <div>
            <strong>Date:</strong> {format(new Date(message.receivedAt), "PPpp")}
          </div>
        </div>
      </div>

      {/* Attachments */}
      {message.attachments.length > 0 && (
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-sm font-medium mb-2">
            Attachments ({message.attachments.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <a
                key={att.id}
                href={`${apiUrl}/api/public/attachments/${att.id}/download`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 border rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                download
              >
                <span className="truncate max-w-[150px]">{att.filename}</span>
                <span className="text-xs text-gray-500">({formatSize(att.size)})</span>
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
          <div className="text-gray-500 italic">(no content)</div>
        )}
      </div>
    </div>
  );
}
```

### 5. Create InboxViewer.tsx page

```tsx
// services/web/src/pages/InboxViewer.tsx
import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { SearchForm } from "../components/inbox-viewer/search-form";
import { MessageList } from "../components/inbox-viewer/message-list";
import { MessageDetail } from "../components/inbox-viewer/message-detail";
import { TelegramLinkModal } from "../components/telegram-link-modal";
import { api } from "../utils/api";

const API_URL = import.meta.env.VITE_API_URL || "";

interface Message {
  id: string;
  fromAddress: string | null;
  subject: string | null;
  receivedAt: string;
  isRead: boolean;
  preview: string;
  _count: { attachments: number };
}

interface FullMessage {
  id: string;
  fromAddress: string | null;
  toAddress: string | null;
  subject: string | null;
  receivedAt: string;
  htmlBody: string | null;
  textBody: string | null;
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string | null;
    size: number | null;
  }>;
}

export function InboxViewer() {
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<FullMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);

  const fetchMessages = useCallback(async (emailAddr: string, pageNum: number) => {
    setLoading(true);
    try {
      const offset = (pageNum - 1) * 20;
      const res = await fetch(
        `${API_URL}/api/public/inbox/${encodeURIComponent(emailAddr)}/messages?limit=20&offset=${offset}`
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch messages");
      }

      const data = await res.json();
      setMessages(data.data);
      setTotal(data.meta.total);
      setEmail(emailAddr);
      setPage(pageNum);
      setSelectedMessage(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = async (emailAddr: string) => {
    // First validate inbox exists
    try {
      const res = await fetch(`${API_URL}/api/public/inbox/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddr }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Inbox not found");
      }

      // Fetch messages
      await fetchMessages(emailAddr, 1);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSelectMessage = async (messageId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/public/inbox/${encodeURIComponent(email)}/messages/${messageId}`
      );

      if (!res.ok) {
        throw new Error("Failed to load message");
      }

      const data = await res.json();
      setSelectedMessage(data.message);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchMessages(email, newPage);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Public Inbox Viewer
          </h1>
          {email && (
            <button
              onClick={() => setShowTelegramModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
            >
              Link to Telegram
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!email ? (
          <div className="py-20">
            <SearchForm onSearch={handleSearch} loading={loading} />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)]">
            {/* Message List */}
            <div className="lg:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center">
                <span className="text-sm font-medium">{email}</span>
                <button
                  onClick={() => setEmail("")}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Change
                </button>
              </div>
              <MessageList
                messages={messages}
                selectedId={selectedMessage?.id || null}
                onSelect={handleSelectMessage}
                total={total}
                page={page}
                onPageChange={handlePageChange}
              />
            </div>

            {/* Message Detail */}
            <div className="lg:w-2/3 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <MessageDetail
                message={selectedMessage}
                loading={detailLoading}
                apiUrl={API_URL}
              />
            </div>
          </div>
        )}
      </main>

      {/* Telegram Modal */}
      {showTelegramModal && (
        <TelegramLinkModal
          inboxEmail={email}
          onClose={() => setShowTelegramModal(false)}
        />
      )}
    </div>
  );
}
```

### 6. Add route in App.tsx

```tsx
// Add import at top
const InboxViewer = lazy(() => import("./pages/InboxViewer").then(m => ({ default: m.InboxViewer })));

// Add route inside Routes (under PublicLayout or standalone)
<Route path="/inbox-viewer" element={<InboxViewer />} />
```

## Todo Checklist

- [ ] Install `dompurify` and `@types/dompurify`
- [ ] Create `components/inbox-viewer/search-form.tsx`
- [ ] Create `components/inbox-viewer/message-list.tsx`
- [ ] Create `components/inbox-viewer/message-detail.tsx`
- [ ] Create `pages/InboxViewer.tsx`
- [ ] Add route in App.tsx
- [ ] Test search flow
- [ ] Test pagination
- [ ] Test message detail view
- [ ] Test attachment download
- [ ] Verify dark mode styling

## Success Criteria

1. `/inbox-viewer` route accessible without login
2. Email search finds valid inboxes
3. Messages paginate correctly (20/page)
4. Message detail shows sanitized HTML
5. Attachments download via API
6. "Link to Telegram" button visible when inbox loaded
7. Responsive on mobile

## Conflict Prevention

- Only this phase creates `InboxViewer.tsx` and `inbox-viewer/` folder
- Phase 05 creates separate `telegram-link-modal.tsx`
- 2 lines added to App.tsx (import + route)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| XSS via email HTML | Medium | High | DOMPurify sanitization |
| API URL misconfiguration | Low | Medium | Env variable fallback |
| Large email rendering slow | Low | Medium | Lazy load DOMPurify |

## Security Considerations

1. **XSS Prevention** - DOMPurify sanitizes all HTML
2. **No auth tokens** - Public endpoints only
3. **Rate limit handled by API** - Frontend shows error on 429
4. **No sensitive data** - Only displays what API provides
