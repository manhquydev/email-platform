import { useState, useMemo } from "react";
import DOMPurify from "dompurify";
import toast from "react-hot-toast";
import type { Message } from "../types";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { API_BASE, formatBytes } from "../utils/api";
import { extractOTP } from "../utils/otpExtractor";
import { useCopyOTP } from "../hooks/useCopyToClipboard";


interface MessageDetailProps {
    message: Message | null;
    onComposeReply?: () => void;
    onForward?: () => void;
    onBack?: () => void;
}

export function MessageDetail({ message, onComposeReply, onForward, onBack }: MessageDetailProps) {
    const [viewMode, setViewMode] = useState<"html" | "text">("html");
    const { copy: copyOTP, copied: otpCopied } = useCopyOTP();

    // Extract OTP from email content
    const detectedOTP = useMemo(() => {
        if (!message) return null;
        const content = message.textBody || message.htmlBody?.replace(/<[^>]*>/g, '') || '';
        return extractOTP(content);
    }, [message]);

    if (!message) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-bg text-muted animate-fade-in">
                {/* Mobile empty state */}
                <div className="md:hidden w-full h-full flex items-center justify-center">
                    <p className="text-sm">Chạm vào một email để xem nội dung</p>
                </div>

                <div className="hidden md:flex flex-col items-center">
                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center shadow-md mb-4 hover-glow">
                        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <h3 className="text-lg font-semibold text-text-main mb-1">Chưa chọn email</h3>
                    <p className="text-sm">Vui lòng chọn một email từ danh sách để xem nội dung.</p>
                </div>
            </div>
        );
    }

    const handleCopyContent = () => {
        const content = message.textBody || message.htmlBody?.replace(/<[^>]*>/g, '') || '';
        navigator.clipboard.writeText(content).then(() => {
            toast.success('Đã sao chép nội dung email');
        }).catch(() => {
            toast.error('Không thể sao chép');
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        const link = document.createElement('a');
        link.href = `${API_BASE}/messages/${message.id}/export`;
        link.download = `email_${message.id.slice(0, 8)}.eml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Đang tải xuống file .eml');
    };

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
                    <div className="flex gap-1.5">
                        {/* Reply */}
                        <button
                            className="btn btn-secondary text-sm h-8 tooltip transition-colors hover-lift"
                            title="Trả lời"
                            data-tooltip="Trả lời"
                            onClick={onComposeReply}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <span className="hidden sm:inline">Trả lời</span>
                        </button>
                        {/* Forward */}
                        <button
                            className="btn btn-secondary text-sm h-8 tooltip transition-colors hover-lift"
                            title="Chuyển tiếp"
                            data-tooltip="Chuyển tiếp"
                            onClick={onForward}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        {/* Export */}
                        <button
                            className="btn btn-secondary text-sm h-8 tooltip transition-colors hover-lift"
                            title="Tải xuống (.eml)"
                            data-tooltip="Tải xuống"
                            onClick={handleExport}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        {/* Copy */}
                        <button
                            className="btn btn-secondary text-sm h-8 tooltip transition-colors hover-lift"
                            title="Sao chép nội dung"
                            data-tooltip="Sao chép"
                            onClick={handleCopyContent}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        {/* Print */}
                        <button
                            className="btn btn-secondary text-sm h-8 tooltip transition-colors hover-lift"
                            title="In email"
                            data-tooltip="In"
                            onClick={handlePrint}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        {/* Delete */}
                        <button className="btn btn-secondary text-sm h-8 text-danger hover:bg-danger-bg hover:border-danger tooltip transition-colors" title="Xóa" data-tooltip="Xóa">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
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

            {/* OTP Detection Banner */}
            {detectedOTP && (
                <div className="px-6 py-3 border-b border-border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
                                    Mã xác thực được phát hiện
                                </div>
                                <div className="text-2xl font-mono font-bold text-green-800 dark:text-green-300 tracking-widest">
                                    {detectedOTP.code}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => copyOTP(detectedOTP.code)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${otpCopied
                                ? 'bg-green-600 text-white'
                                : 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-800 dark:hover:bg-green-700 dark:text-green-300'
                                }`}
                        >
                            {otpCopied ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Đã copy!
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy OTP
                                </>
                            )}
                        </button>
                    </div>
                    {detectedOTP.confidence !== 'high' && (
                        <div className="mt-2 text-xs text-green-600 dark:text-green-500">
                            * Xin kiểm tra lại mã trước khi sử dụng
                        </div>
                    )}
                </div>
            )}

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
