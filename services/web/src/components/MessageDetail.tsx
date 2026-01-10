import { useState, useMemo, useEffect } from "react";
import DOMPurify from "dompurify";
import toast from "react-hot-toast";
import type { Message } from "../types";
import { format } from "date-fns";
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
    const [timeLeft, setTimeLeft] = useState<string>("59:59");

    // Mock Timer Logic
    useEffect(() => {
        if (!message) return;
        // Simulate a countdown based on message ID hash or random
        const duration = 60 * 60 * 1000; // 1 hour
        const endTime = new Date(message.receivedAt).getTime() + duration;

        const timer = setInterval(() => {
            const now = Date.now();
            const diff = endTime - now;
            if (diff <= 0) {
                setTimeLeft("Expired");
                clearInterval(timer);
            } else {
                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [message]);

    // Extract OTP from email content
    const detectedOTP = useMemo(() => {
        if (!message) return null;
        const content = message.textBody || message.htmlBody?.replace(/<[^>]*>/g, '') || '';
        return extractOTP(content);
    }, [message]);

    if (!message) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in text-center text-[var(--nebula-text-muted)]">
                {/* Mobile empty state */}
                <div className="md:hidden w-full h-full flex items-center justify-center">
                    <p className="text-sm">Chạm vào một email để xem nội dung</p>
                </div>

                <div className="hidden md:flex flex-col items-center">
                    <div className="w-24 h-24 bg-surface-elevated rounded-3xl flex items-center justify-center shadow-2xl mb-6 hover-glow transition-all">
                        <span className="material-symbols-outlined text-5xl text-[var(--nebula-text-muted)] opacity-50">mail</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Chưa chọn email</h3>
                    <p className="text-sm max-w-xs mx-auto opacity-70">Chọn một email từ danh sách để xem nội dung được bảo mật.</p>
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
            {/* Top Security Bar */}
            <div className="h-14 px-6 border-b border-border bg-surface-elevated/50 flex items-center justify-between shrink-0 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="md:hidden text-muted hover:text-white">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 border border-white/5 group cursor-pointer hover:border-primary/50 transition-colors">
                        <span className="material-symbols-outlined text-nebula-text-muted text-[18px]">alternate_email</span>
                        <span className="text-xs text-white font-mono tracking-wide">{message.toAddress}</span>
                        <span className="material-symbols-outlined text-nebula-text-muted text-[14px] group-hover:text-white transition-colors ml-2">content_copy</span>
                    </div>
                    <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
                    <div className="hidden sm:flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-1 rounded border border-success/20">
                        <span className="material-symbols-outlined text-[14px]">timer</span>
                        <span className="font-mono">{timeLeft} remaining</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={handleCopyContent} className="p-2 hover:bg-white/10 rounded text-nebula-text-muted hover:text-white transition-colors" title="Sao chép nội dung">
                        <span className="material-symbols-outlined text-[20px]">content_copy</span>
                    </button>
                    <button onClick={handlePrint} className="p-2 hover:bg-white/10 rounded text-nebula-text-muted hover:text-white transition-colors" title="In email">
                        <span className="material-symbols-outlined text-[20px]">print</span>
                    </button>
                    <button onClick={handleExport} className="p-2 hover:bg-white/10 rounded text-nebula-text-muted hover:text-white transition-colors" title="Download Source">
                        <span className="material-symbols-outlined text-[20px]">code</span>
                    </button>
                    <button className="p-2 hover:bg-danger/20 rounded text-nebula-text-muted hover:text-danger transition-colors" title="Delete">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </div>

            {/* Email Content Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
                <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-20">

                    {/* Header Info */}
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{message.subject || "(Không có tiêu đề)"}</h1>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={onComposeReply} className="size-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-nebula-text-muted hover:text-white hover:bg-primary/20 hover:border-primary/50 transition-all" title="Trả lời">
                                    <span className="material-symbols-outlined">reply</span>
                                </button>
                                <button onClick={onForward} className="size-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-nebula-text-muted hover:text-white hover:bg-primary/20 hover:border-primary/50 transition-all" title="Chuyển tiếp">
                                    <span className="material-symbols-outlined">forward</span>
                                </button>
                                <button className="size-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-nebula-text-muted hover:text-white hover:bg-warning/20 hover:border-warning/50 transition-all text-warning" title="Đánh dấu sao">
                                    <span className="material-symbols-outlined filled">star</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-elevated border border-border">
                            <div className="size-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                                {(message.fromAddress?.charAt(0) || "?").toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-white text-lg">{message.fromAddress}</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/20 uppercase tracking-wider flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">verified</span> Verified
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-nebula-text-muted mt-1">
                                    <span>To: <span className="text-nebula-text-secondary">Me</span></span>
                                    <span className="size-1 rounded-full bg-nebula-border"></span>
                                    <span>{format(new Date(message.receivedAt), "PPP p", { locale: vi })}</span>
                                    <span className="size-1 rounded-full bg-nebula-border"></span>
                                    <span className="flex items-center gap-1 text-nebula-text-muted"><span className="material-symbols-outlined text-[12px]">lock</span> TLS 1.3 Encrypted</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* OTP Banner */}
                    {detectedOTP && (
                        <div className="p-1 rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
                            <div className="bg-background-dark/80 backdrop-blur rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                                        <span className="material-symbols-outlined">key</span>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-success uppercase tracking-wider">Mã xác thực</div>
                                        <div className="text-3xl font-mono font-bold text-white tracking-widest">{detectedOTP.code}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => copyOTP(detectedOTP.code)}
                                    className="px-6 py-2 rounded-lg bg-success text-black font-bold hover:bg-success/80 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
                                >
                                    {otpCopied ? <span className="material-symbols-outlined text-[20px]">check</span> : <span className="material-symbols-outlined text-[20px]">content_copy</span>}
                                    {otpCopied ? "Đã chép" : "Sao chép"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Security Grid (Mock Data from Wireframe) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-nebula-elevated border border-nebula-border flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <span className="material-symbols-outlined">vpn_key</span>
                            </div>
                            <div>
                                <div className="text-[10px] text-nebula-text-muted uppercase tracking-wider font-bold">Encryption Standard</div>
                                <div className="text-sm font-medium text-white">AES-256-GCM</div>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-nebula-elevated border border-nebula-border flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-nebula-violet/10 text-nebula-violet">
                                <span className="material-symbols-outlined">dns</span>
                            </div>
                            <div>
                                <div className="text-[10px] text-nebula-text-muted uppercase tracking-wider font-bold">Server Region</div>
                                <div className="text-sm font-medium text-white">Zurich, CH (Protected)</div>
                            </div>
                        </div>
                    </div>

                    {/* Email Body */}
                    <div className="relative group min-h-[200px]">
                        <div className="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button
                                onClick={() => setViewMode("html")}
                                className={`text-xs px-3 py-1.5 rounded-full border backdrop-blur-md ${viewMode === 'html' ? 'bg-primary/20 border-primary text-primary' : 'bg-nebula-elevated border-nebula-border text-nebula-text-muted'}`}
                            >
                                HTML
                            </button>
                            <button
                                onClick={() => setViewMode("text")}
                                className={`text-xs px-3 py-1.5 rounded-full border backdrop-blur-md ${viewMode === 'text' ? 'bg-primary/20 border-primary text-primary' : 'bg-nebula-elevated border-nebula-border text-nebula-text-muted'}`}
                            >
                                Text
                            </button>
                        </div>

                        <div className="prose prose-invert max-w-none text-nebula-text-secondary">
                            {viewMode === "text" || !message.htmlBody ? (
                                <pre className="whitespace-pre-wrap font-mono text-sm bg-nebula-elevated p-6 rounded-xl border border-nebula-border text-nebula-text-secondary">
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

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="pt-8 border-t border-white/5">
                            <h4 className="text-xs font-bold text-nebula-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">attachment</span>
                                Tệp đính kèm ({message.attachments.length})
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {message.attachments.map((att: any, idx: number) => (
                                    <a
                                        key={idx}
                                        href={`${API_BASE}/attachments/${att.storageKey}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated border border-nebula-border hover:border-primary/50 hover:bg-white/5 transition-all group no-underline"
                                    >
                                        <div className="p-2 bg-white/5 rounded-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors text-nebula-text-muted">
                                            <span className="material-symbols-outlined">description</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-white truncate">{att.filename || `Tệp ${idx + 1}`}</div>
                                            <div className="text-[10px] text-nebula-text-muted">{formatBytes(att.size)}</div>
                                        </div>
                                        <span className="material-symbols-outlined text-nebula-text-muted group-hover:text-primary">download</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
