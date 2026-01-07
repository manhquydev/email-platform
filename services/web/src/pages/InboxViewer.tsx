// services/web/src/pages/InboxViewer.tsx
import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { SearchForm } from "../components/inbox-viewer/search-form";
import { MessageList } from "../components/inbox-viewer/message-list";
import { MessageDetail } from "../components/inbox-viewer/message-detail";
import { TelegramLinkModal } from "../components/telegram-link-modal";

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
