import { useState } from "react";
import DOMPurify from "dompurify";
import type { Message } from "../types";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { API_BASE, formatBytes } from "../utils/api";

interface MessageDetailProps {
    message: Message | null;
    onComposeReply?: () => void;
    onBack?: () => void;
}

export function MessageDetail({ message, onComposeReply, onBack }: MessageDetailProps) {
    const [viewMode, setViewMode] = useState<"html" | "text">("html");

    if (!message) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-bg text-muted">
                {/* Mobile empty state: show nothing or hint */}
                <div className="md:hidden w-full h-full flex items-center justify-center">
                    <p className="text-sm">Chạm vào một email để xem nội dung</p>
                </div>

                <div className="hidden md:flex flex-col items-center">
                    <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center shadow-sm mb-4">
                        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <h3 className="text-lg font-semibold text-text-main mb-1">Chưa chọn email</h3>
                    <p className="text-sm">Vui lòng chọn một email từ danh sách để xem nội dung.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-surface overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border flex-shrink-0">
                <div className="flex justify-between items-start mb-4 gap-2">
                    {onBack && (
                        <button onClick={onBack} className="md:hidden mt-0.5 text-muted hover:text-text-main flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                    )}
                    <h1 className="text-xl font-bold text-text-main leading-snug flex-1">{message.subject || "(Không có tiêu đề)"}</h1>
                    <div className="flex gap-2">
                        {/* Actions Stub */}
                        <button className="btn btn-secondary text-sm h-8" title="Trả lời" onClick={onComposeReply}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <span className="hidden sm:inline">Trả lời</span>
                        </button>
                        <button className="btn btn-secondary text-sm h-8" title="Chuyển tiếp">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        <button className="btn btn-secondary text-sm h-8 text-danger hover:bg-danger-bg hover:border-danger" title="Xóa">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                            {(message.fromAddress?.charAt(0) || "?").toUpperCase()}
                        </div>
                        <div>
                            <div className="font-semibold text-text-main">
                                {message.fromAddress}
                            </div>
                            <div className="text-xs text-muted">
                                đến <span className="text-text-main">{message.toAddress}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium text-text-main">
                            {format(new Date(message.receivedAt), "p, dd/MM/yyyy", { locale: vi })}
                        </div>
                        <div className="text-xs text-muted">
                            {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: true, locale: vi })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Attachments Area */}
            {message.attachments && message.attachments.length > 0 && (
                <div className="px-6 py-3 border-b border-border bg-bg/50">
                    <div className="text-xs font-semibold uppercase text-muted mb-2 tracking-wider">Tệp đính kèm ({message.attachments.length})</div>
                    <div className="flex flex-wrap gap-2">
                        {message.attachments.map((a: any) => (
                            <a
                                key={a.id}
                                href={`${API_BASE}/attachments/${a.id}/download`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg hover:border-primary hover:shadow-sm transition-all text-sm group no-underline"
                            >
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                <div>
                                    <div className="font-medium text-text-main group-hover:text-primary leading-tight">{a.filename}</div>
                                    <div className="text-[10px] text-muted">{formatBytes(a.size)}</div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 relative">
                <div className="absolute top-4 right-6 bg-surface border border-border rounded-lg flex p-0.5 shadow-sm z-10">
                    <button
                        onClick={() => setViewMode("html")}
                        className={`text-xs px-2 py-1 rounded ${viewMode === 'html' ? 'bg-primary-light text-primary font-bold' : 'text-muted hover:text-text-main'}`}
                    >
                        HTML
                    </button>
                    <button
                        onClick={() => setViewMode("text")}
                        className={`text-xs px-2 py-1 rounded ${viewMode === 'text' ? 'bg-primary-light text-primary font-bold' : 'text-muted hover:text-text-main'}`}
                    >
                        Text
                    </button>
                </div>

                <div className="prose prose-sm max-w-none mt-2">
                    {viewMode === "text" || !message.htmlBody ? (
                        <pre className="whitespace-pre-wrap font-mono text-sm text-text-main bg-bg p-4 rounded-lg border border-border">
                            {message.textBody || "(Không có nội dung văn bản)"}
                        </pre>
                    ) : (
                        <div
                            className="email-content"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.htmlBody) }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
