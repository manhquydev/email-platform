/**
 * Types for InboxViewer page
 */

export interface Message {
    id: string;
    fromAddress: string | null;
    subject: string | null;
    receivedAt: string;
    isRead: boolean;
    preview: string;
    attachmentCount: number;
}

export interface FullMessage {
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

export interface AccessError {
    type: "not_found" | "private" | "rate_limit" | "error";
    message: string;
    suggestion?: string;
}

const rawApiBase = (
    window.env?.API_BASE ||
    import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:3001"
).replace(/\/$/, "");

// Normalize to API gateway root so viewer routes always resolve to /api/public/*
export const API_URL = rawApiBase.endsWith("/api") ? rawApiBase : `${rawApiBase}/api`;
