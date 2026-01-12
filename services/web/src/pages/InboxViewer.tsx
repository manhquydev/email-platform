// services/web/src/pages/InboxViewer.tsx
import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  attachmentCount: number;
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

interface AccessError {
  type: "not_found" | "private" | "rate_limit" | "error";
  message: string;
  suggestion?: string;
}

export function InboxViewer() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<FullMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [accessError, setAccessError] = useState<AccessError | null>(null);

  const parseApiError = (status: number, data: { error?: string; code?: string }): AccessError => {
    if (status === 404) {
      return {
        type: "not_found",
        message: "Không tìm thấy hộp thư",
        suggestion: "Vui lòng kiểm tra lại địa chỉ email và thử lại.",
      };
    }
    if (status === 403) {
      if (data.code === "INBOX_PRIVATE") {
        return {
          type: "private",
          message: data.error || "Hộp thư này ở chế độ riêng tư.",
          suggestion: "Nếu bạn là chủ sở hữu, vui lòng đăng nhập để truy cập.",
        };
      }
      return {
        type: "error",
        message: data.error || "Truy cập bị từ chối",
      };
    }
    if (status === 429) {
      return {
        type: "rate_limit",
        message: "Quá nhiều yêu cầu",
        suggestion: "Vui lòng đợi một lát rồi thử lại.",
      };
    }
    return {
      type: "error",
      message: data.error || "Không thể truy cập hộp thư",
    };
  };

  const fetchMessages = useCallback(async (emailAddr: string, pageNum: number) => {
    setLoading(true);
    setAccessError(null);
    try {
      const offset = (pageNum - 1) * 20;
      const res = await fetch(
        `${API_URL}/api/public/inbox/${encodeURIComponent(emailAddr)}/messages?limit=20&offset=${offset}`
      );

      if (!res.ok) {
        const data = await res.json();
        const error = parseApiError(res.status, data);
        setAccessError(error);
        throw new Error(error.message);
      }

      const data = await res.json();
      setMessages(data.data);
      setTotal(data.meta.total);
      setEmail(emailAddr);
      setPage(pageNum);
      setSelectedMessage(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load inbox from URL query param
  useEffect(() => {
    if (initialLoadDone) return;
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setInitialLoadDone(true);
      handleSearch(emailParam);
    }
  }, [searchParams, initialLoadDone]);

  const handleSearch = async (emailAddr: string) => {
    setAccessError(null);
    // First validate inbox exists
    try {
      const res = await fetch(`${API_URL}/api/public/inbox/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddr }),
      });

      if (!res.ok) {
        const data = await res.json();
        const error = parseApiError(res.status, data);
        setAccessError(error);
        throw new Error(error.message);
      }

      // Fetch messages
      await fetchMessages(emailAddr, 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        const data = await res.json();
        const error = parseApiError(res.status, data);
        throw new Error(error.message);
      }

      const data = await res.json();
      setSelectedMessage(data.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchMessages(email, newPage);
  };

  const handleClearError = () => {
    setAccessError(null);
    setEmail("");
  };

  const renderAccessError = () => {
    if (!accessError) return null;

    const iconMap = {
      not_found: (
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      private: (
        <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      rate_limit: (
        <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      error: (
        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    };

    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <div className="mb-4">{iconMap[accessError.type]}</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {accessError.message}
        </h2>
        {accessError.suggestion && (
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            {accessError.suggestion}
          </p>
        )}
        <button
          onClick={handleClearError}
          className="px-6 py-2 bg-nebula-violet text-white rounded-lg hover:bg-nebula-violet-dark"
        >
          Thử hộp thư khác
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Xem hộp thư công khai
          </h1>
          {email && !accessError && (
            <button
              onClick={() => setShowTelegramModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
            >
              Liên kết Telegram
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {accessError ? (
          renderAccessError()
        ) : !email ? (
          <div className="py-20">
            <SearchForm onSearch={handleSearch} loading={loading} />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)]">
            {/* Message List */}
            <div className="lg:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center">
                <span className="text-sm font-medium truncate flex-1">{email}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchMessages(email, page)}
                    disabled={loading}
                    className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                    title="Tải lại"
                  >
                    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setEmail("")}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Đổi
                  </button>
                </div>
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
