/**
 * Types and utilities for ConversationView
 */
import { useState } from "react";
import type { Message } from "../../types";

export interface ConversationThread {
    id: string;
    subject: string;
    messages: Message[];
    latestMessage: Message;
    participantCount: number;
    unreadCount: number;
    hasAttachments: boolean;
}

export interface ConversationViewProps {
    messages: Message[];
    selectedThreadId?: string;
    onSelectThread: (thread: ConversationThread) => void;
    onSelectMessage: (msg: Message) => void;
}

/** Normalize subject for grouping (remove Re:, Fwd:, etc.) */
export function normalizeSubject(subject: string): string {
    return subject
        .replace(/^(Re|Fwd|Fw|RE|FW|re|fw):\s*/gi, '')
        .trim()
        .toLowerCase();
}

/** Group messages by subject/thread */
export function groupIntoThreads(messages: Message[]): ConversationThread[] {
    const threadMap = new Map<string, Message[]>();

    messages.forEach(msg => {
        const normalizedSubject = normalizeSubject(msg.subject || "(Không có tiêu đề)");

        if (!threadMap.has(normalizedSubject)) {
            threadMap.set(normalizedSubject, []);
        }
        threadMap.get(normalizedSubject)!.push(msg);
    });

    const threads: ConversationThread[] = [];

    threadMap.forEach((msgs, subject) => {
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
            id: sortedMsgs[0].id,
            subject,
            messages: sortedMsgs,
            latestMessage: sortedMsgs[0],
            participantCount: participants.size,
            unreadCount,
            hasAttachments,
        });
    });

    return threads.sort((a, b) =>
        new Date(b.latestMessage.receivedAt).getTime() - new Date(a.latestMessage.receivedAt).getTime()
    );
}

/** Hook for conversation mode toggle */
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
