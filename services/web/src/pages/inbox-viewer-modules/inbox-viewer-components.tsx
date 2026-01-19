/**
 * UI components for InboxViewer page
 * Header, AccessError display, MessageListPane
 */
import type { AccessError, Message, FullMessage } from "./types";
import { API_URL } from "./types";
import { MessageList } from "../../components/inbox-viewer/message-list";
import { MessageDetail } from "../../components/inbox-viewer/message-detail";

// --- Access Error Display ---
export interface AccessErrorDisplayProps {
    error: AccessError;
    onClear: () => void;
}

const errorIcons = {
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

export function AccessErrorDisplay({ error, onClear }: AccessErrorDisplayProps) {
    return (
        <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="mb-4">{errorIcons[error.type]}</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {error.message}
            </h2>
            {error.suggestion && (
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                    {error.suggestion}
                </p>
            )}
            <button
                onClick={onClear}
                className="px-6 py-2 bg-nebula-violet text-white rounded-lg hover:bg-nebula-violet-dark"
            >
                Thử hộp thư khác
            </button>
        </div>
    );
}

// --- Page Header ---
export interface InboxViewerHeaderProps {
    email: string;
    hasError: boolean;
    onCopyShareLink: () => void;
    onOpenTelegram: () => void;
}

export function InboxViewerHeader({ email, hasError, onCopyShareLink, onOpenTelegram }: InboxViewerHeaderProps) {
    return (
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow relative z-10">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Xem hộp thư công khai
                </h1>
                {email && !hasError && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onCopyShareLink}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm flex items-center gap-2"
                            title="Sao chép link chia sẻ"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Chia sẻ
                        </button>
                        <button
                            onClick={onOpenTelegram}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                        >
                            Liên kết Telegram
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}

// --- Message List Pane with Toolbar ---
export interface MessageListPaneProps {
    email: string;
    messages: Message[];
    selectedMessage: FullMessage | null;
    total: number;
    page: number;
    loading: boolean;
    onSelect: (id: string) => void;
    onPageChange: (page: number) => void;
    onCopyEmail: () => void;
    onCopyShareLink: () => void;
    onRefresh: () => void;
    onChangeEmail: () => void;
}

export function MessageListPane({
    email, messages, selectedMessage, total, page, loading,
    onSelect, onPageChange, onCopyEmail, onCopyShareLink, onRefresh, onChangeEmail
}: MessageListPaneProps) {
    return (
        <div className="lg:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center">
                <button
                    onClick={onCopyEmail}
                    className="text-sm font-medium truncate flex-1 text-left cursor-pointer hover:text-nebula-violet transition-colors"
                    title="Nhấn để sao chép email"
                >
                    {email}
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCopyEmail}
                        className="p-1.5 text-gray-500 hover:text-nebula-violet hover:bg-nebula-violet/10 dark:hover:bg-nebula-violet/20 rounded transition-colors"
                        title="Sao chép email"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                    <button
                        onClick={onCopyShareLink}
                        className="p-1.5 text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                        title="Sao chép link chia sẻ"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                        title="Tải lại"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <button
                        onClick={onChangeEmail}
                        className="text-sm text-blue-500 hover:underline"
                    >
                        Đổi
                    </button>
                </div>
            </div>
            <MessageList
                messages={messages}
                selectedId={selectedMessage?.id || null}
                onSelect={onSelect}
                total={total}
                page={page}
                onPageChange={onPageChange}
                loading={loading}
            />
        </div>
    );
}

// --- Message Detail Pane ---
export interface MessageDetailPaneProps {
    message: FullMessage | null;
    loading: boolean;
}

export function MessageDetailPane({ message, loading }: MessageDetailPaneProps) {
    return (
        <div className="lg:w-2/3 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <MessageDetail
                message={message}
                loading={loading}
                apiUrl={API_URL}
            />
        </div>
    );
}
