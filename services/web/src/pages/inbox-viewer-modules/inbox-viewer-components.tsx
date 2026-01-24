/**
 * UI components for InboxViewer page
 * Header, AccessError display, MessageListPane
 */
import type { AccessError, Message, FullMessage } from "./types";
import { API_URL } from "./types";
import { MessageList } from "../../components/inbox-viewer/message-list";
import { MessageDetail } from "../../components/inbox-viewer/message-detail";
import { HeroEmailAddress } from "../../components/inbox-viewer/hero-email-address";
import { RefreshIndicator } from "../../components/inbox-viewer/skeletons";

// --- Access Error Display ---
export interface AccessErrorDisplayProps {
    error: AccessError;
    onClear: () => void;
}

const errorIcons = {
    not_found: (
        <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <h2 className="text-xl font-semibold text-white mb-2">
                {error.message}
            </h2>
            {error.suggestion && (
                <p className="text-zinc-400 mb-6 max-w-md">
                    {error.suggestion}
                </p>
            )}
            <button
                onClick={onClear}
                className="px-6 py-2 bg-white text-black rounded-md font-medium hover:bg-zinc-200 transition-colors duration-100"
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
        <header className="bg-black border-b border-zinc-800 relative z-10">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">
                    Xem hộp thư công khai
                </h1>
                {email && !hasError && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onCopyShareLink}
                            className="px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-200 text-sm flex items-center gap-2 font-medium transition-colors duration-100"
                            title="Sao chép link chia sẻ"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Chia sẻ
                        </button>
                        <button
                            onClick={onOpenTelegram}
                            className="px-4 py-2 border border-zinc-800 text-zinc-300 rounded-md hover:border-zinc-700 hover:text-white text-sm transition-colors duration-100"
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
    focusedIndex: number;
    onSelect: (id: string) => void;
    onPageChange: (page: number) => void;
    onCopyEmail: () => void;
    onCopyShareLink: () => void;
    onRefresh: () => void;
    onChangeEmail: () => void;
    onFocusChange: (index: number) => void;
}

export function MessageListPane({
    email, messages, selectedMessage, total, page, loading, focusedIndex,
    onSelect, onPageChange, onCopyShareLink, onRefresh, onChangeEmail, onFocusChange
}: MessageListPaneProps) {
    return (
        <div className="w-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden relative">
            {/* Refresh progress indicator */}
            {loading && <RefreshIndicator />}

            {/* Hero Email Address - Prominent display with copy */}
            <HeroEmailAddress email={email} />

            {/* Simplified Toolbar - Share, Refresh, Change */}
            <div className="px-3 py-2 border-b border-zinc-800 flex justify-end gap-2">
                <button
                    onClick={onCopyShareLink}
                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-md transition-colors duration-100"
                    title="Sao chép link chia sẻ"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                </button>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-md transition-colors duration-100 disabled:opacity-50"
                    title="Tải lại"
                >
                    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
                <button
                    onClick={onChangeEmail}
                    className="px-2 py-1 text-sm text-zinc-500 hover:text-white transition-colors duration-100"
                >
                    Đổi
                </button>
            </div>

            {/* Keyboard shortcuts hint - Always visible per validated decision */}
            <div className="px-3 py-1.5 border-b border-zinc-900 flex items-center gap-3 text-xs text-zinc-600">
                <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono">j</kbd>
                    <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono">k</kbd>
                    <span>navigate</span>
                </span>
                <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono">Enter</kbd>
                    <span>open</span>
                </span>
                <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono">r</kbd>
                    <span>refresh</span>
                </span>
            </div>

            <MessageList
                messages={messages}
                selectedId={selectedMessage?.id || null}
                onSelect={onSelect}
                total={total}
                page={page}
                onPageChange={onPageChange}
                loading={loading}
                focusedIndex={focusedIndex}
                onFocusChange={onFocusChange}
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
        <div className="hidden md:block w-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
            <MessageDetail
                message={message}
                loading={loading}
                apiUrl={API_URL}
            />
        </div>
    );
}
