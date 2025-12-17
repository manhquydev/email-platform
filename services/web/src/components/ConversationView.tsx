import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import type { Message } from "../types";

interface ConversationThread {
    id: string;
    subject: string;
    messages: Message[];
    latestMessage: Message;
    participantCount: number;
    unreadCount: number;
    hasAttachments: boolean;
}

interface ConversationViewProps {
    messages: Message[];
    selectedThreadId?: string;
    onSelectThread: (thread: ConversationThread) => void;
    onSelectMessage: (msg: Message) => void;
}

// Group messages by subject/thread
function groupIntoThreads(messages: Message[]): ConversationThread[] {
    const threadMap = new Map<string, Message[]>();

    messages.forEach(msg => {
        // Normalize subject for grouping (remove Re:, Fwd:, etc.)
        const normalizedSubject = normalizeSubject(msg.subject || "(Không có tiêu đề)");

        if (!threadMap.has(normalizedSubject)) {
            threadMap.set(normalizedSubject, []);
        }
        threadMap.get(normalizedSubject)!.push(msg);
    });

    const threads: ConversationThread[] = [];

    threadMap.forEach((msgs, subject) => {
        // Sort messages by date (newest first for latest, oldest first for thread)
        const sortedMsgs = [...msgs].sort((a, b) =>
            new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
        );

        const participants = new Set<string>();
        let hasAttachments = false;
        let unreadCount = 0;

        msgs.forEach(m => {
            if (m.fromAddress) participants.add(m.fromAddress);
            if (m.attachments && m.attachments.length > 0) hasAttachments = true;
            if (!m.isRead) unreadCount++;
        });

        threads.push({
            id: sortedMsgs[0].id, // Use latest message ID as thread ID
            subject,
            messages: sortedMsgs,
            latestMessage: sortedMsgs[0],
            participantCount: participants.size,
            unreadCount,
            hasAttachments,
        });
    });

    // Sort threads by latest message date
    return threads.sort((a, b) =>
        new Date(b.latestMessage.receivedAt).getTime() - new Date(a.latestMessage.receivedAt).getTime()
    );
}

function normalizeSubject(subject: string): string {
    return subject
        .replace(/^(Re|Fwd|Fw|RE|FW|re|fw):\s*/gi, '')
        .trim()
        .toLowerCase();
}

export function ConversationView({
    messages,
    selectedThreadId,
    onSelectThread,
    onSelectMessage,
}: ConversationViewProps) {
    const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);

    const threads = useMemo(() => groupIntoThreads(messages), [messages]);

    if (threads.length === 0) {
        return (
            <div className="empty-state">
                <svg className="empty-state-icon" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                    <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-lg font-medium mb-1">Không có cuộc hội thoại</div>
                <div className="text-sm text-text-light">Hộp thư này hiện đang trống</div>
            </div>
        );
    }

    return (
        <div className="divide-y divide-border">
            {threads.map((thread, idx) => {
                const isExpanded = expandedThreadId === thread.id;
                const isSelected = selectedThreadId === thread.id;
                const hasMultipleMessages = thread.messages.length > 1;

                return (
                    <div
                        key={thread.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${idx * 30}ms` }}
                    >
                        {/* Thread Header */}
                        <div
                            onClick={() => {
                                if (hasMultipleMessages) {
                                    setExpandedThreadId(isExpanded ? null : thread.id);
                                }
                                onSelectThread(thread);
                            }}
                            className={`
                                group p-3 cursor-pointer list-item-interactive
                                ${isSelected ? 'bg-primary-light ring-1 ring-inset ring-primary-border' : ''}
                            `}
                        >
                            {/* Unread Indicator */}
                            {thread.unreadCount > 0 && (
                                <span className="absolute left-1 top-4 w-2 h-2 rounded-full bg-primary unread-dot" />
                            )}

                            <div className="flex justify-between items-start gap-2 pl-2">
                                {/* Sender & Count */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-sm truncate ${thread.unreadCount > 0 ? 'font-bold text-text-main' : 'font-medium text-text-main'}`}>
                                            {thread.latestMessage.fromAddress || 'Không rõ'}
                                        </span>
                                        {thread.participantCount > 1 && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/10 text-muted font-medium">
                                                {thread.participantCount}
                                            </span>
                                        )}
                                        {hasMultipleMessages && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                                {thread.messages.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Subject */}
                                    <div className={`text-xs truncate mb-1 ${thread.unreadCount > 0 ? 'font-semibold text-text-main' : 'text-text-main'}`}>
                                        {thread.subject}
                                    </div>

                                    {/* Preview */}
                                    <div className="text-[11px] text-muted truncate line-clamp-1">
                                        {thread.latestMessage.textBody?.substring(0, 80) || 'Không có nội dung...'}
                                    </div>
                                </div>

                                {/* Meta */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className="text-[10px] text-muted whitespace-nowrap">
                                        {formatDistanceToNow(new Date(thread.latestMessage.receivedAt), { addSuffix: true, locale: vi })}
                                    </span>

                                    <div className="flex items-center gap-1">
                                        {thread.hasAttachments && (
                                            <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                        {hasMultipleMessages && (
                                            <svg
                                                className={`w-3 h-3 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                                            >
                                                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Expanded Thread Messages */}
                        {isExpanded && hasMultipleMessages && (
                            <div className="bg-bg border-l-2 border-primary/30 ml-4 animate-fade-in-up">
                                {thread.messages.slice(1).map((msg, msgIdx) => (
                                    <div
                                        key={msg.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectMessage(msg);
                                        }}
                                        className="p-2 pl-4 border-b border-border/50 hover:bg-primary-light/50 cursor-pointer transition-colors"
                                        style={{ animationDelay: `${msgIdx * 50}ms` }}
                                    >
                                        <div className="flex items-center justify-between text-xs">
                                            <span className={`truncate ${!msg.isRead ? 'font-semibold' : ''}`}>
                                                {msg.fromAddress}
                                            </span>
                                            <span className="text-[10px] text-muted">
                                                {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true, locale: vi })}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-muted truncate mt-0.5">
                                            {msg.textBody?.substring(0, 60) || 'Không có nội dung...'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// Hook for conversation mode toggle
export function useConversationMode() {
    const [isConversationMode, setIsConversationMode] = useState(() => {
        return localStorage.getItem('email-conversation-mode') === 'true';
    });

    const toggleMode = () => {
        const newMode = !isConversationMode;
        setIsConversationMode(newMode);
        localStorage.setItem('email-conversation-mode', String(newMode));
    };

    return { isConversationMode, toggleMode };
}
