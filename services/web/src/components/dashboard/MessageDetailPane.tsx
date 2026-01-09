/**
 * MessageDetailPane Component
 * Displays full email content with actions (reply, delete, pin, etc.)
 */

import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { GlassCard } from "../ui/GlassCard";
import { OTPHighlight } from "./OTPHighlight";
import { AttachmentList } from "./AttachmentList";
import { extractOTP } from "../../utils/otpExtractor";
import { cn } from "../../utils/cn";
import type { Message } from "../../types";

interface MessageDetailPaneProps {
    message: Message | null;
    onBack: () => void;
    onReply: () => void;
    onMarkUnread: (msgId: string) => void;
    onTogglePin: (msgId: string, isPinned: boolean) => void;
    onDelete: (msgId: string) => void;
    onCopyContent: (content: string) => void;
    onCopyOTP: (otp: string) => void;
    canSendOutbound: boolean;
}

export function MessageDetailPane({
    message,
    onBack,
    onReply,
    onMarkUnread,
    onTogglePin,
    onDelete,
    onCopyContent,
    onCopyOTP,
}: MessageDetailPaneProps) {
    // Extract OTP from message body
    const getOTP = (msg: Message): string | null => {
        const otpResult = extractOTP(msg.textBody || msg.htmlBody || "");
        return typeof otpResult === 'string' ? otpResult : otpResult?.code || null;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={cn(
                "flex-1 bg-white dark:bg-bg flex flex-col h-full overflow-hidden border-l border-slate-200 dark:border-white/5",
                !message ? "hidden md:flex" : "flex fixed inset-0 z-50 md:static bg-white md:bg-transparent dark:bg-bg"
            )}
        >
            {message ? (
                <>
                    {/* Detail Header */}
                    <div className="h-16 px-6 border-b border-slate-200 dark:border-white/15 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden text-slate-700 dark:text-white"
                                onClick={onBack}
                                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>}
                            />
                            <div className="flex flex-col">
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white max-w-[200px] md:max-w-md truncate">
                                    {message.fromAddress}
                                </h3>
                                <span className="text-xs text-slate-500 dark:text-text-tertiary">
                                    {new Date(message.receivedAt).toLocaleString("vi-VN")}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-elevated/50 rounded-lg p-1 border border-slate-200 dark:border-white/15 shadow-lg backdrop-blur-md">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onReply}
                                title="Trả lời"
                                className="text-slate-500 hover:text-slate-900 dark:text-text-secondary dark:hover:text-white"
                                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onMarkUnread(message.id)}
                                title="Đánh dấu chưa đọc"
                                className="text-slate-500 hover:text-slate-900 dark:text-text-secondary dark:hover:text-white"
                                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onTogglePin(message.id, !message.isPinned)}
                                className={message.isPinned ? "text-warning" : "text-slate-500 hover:text-slate-900 dark:text-text-secondary dark:hover:text-white"}
                                title={message.isPinned ? "Bỏ ghim" : "Ghim"}
                                icon={<svg className="w-5 h-5" fill={message.isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>}
                            />

                            <div className="w-px h-5 bg-slate-300 dark:bg-white/10 mx-1"></div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(message.id)}
                                className="text-slate-500 hover:text-red-500 dark:text-text-secondary dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-danger/10"
                                title="Xóa"
                                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onCopyContent(message.textBody || message.htmlBody || "")}
                                className="text-slate-500 hover:text-slate-900 dark:text-text-secondary dark:hover:text-white"
                                title="Sao chép nội dung"
                                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                            />
                        </div>
                    </div>

                    {/* Detail Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-24 md:pb-6">
                        {/* Subject */}
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                            {message.subject || "(Không có chủ đề)"}
                        </h1>

                        {/* OTP Highlight */}
                        {(() => {
                            const otp = getOTP(message);
                            if (otp) return <OTPHighlight otp={otp} onCopy={onCopyOTP} />;
                            return null;
                        })()}

                        {/* Email Body */}
                        <GlassCard className="p-6 md:p-8 rounded-2xl dark:!bg-white/[0.08] border border-slate-200 dark:border-white/15 overflow-hidden shadow-sm">
                            {message.htmlBody ? (
                                <div className="prose dark:prose-invert max-w-none">
                                    <iframe
                                        srcDoc={message.htmlBody}
                                        sandbox="allow-same-origin allow-scripts"
                                        title="Email content"
                                        className="w-full min-h-[400px] border-none bg-white dark:bg-slate-800 rounded-lg"
                                    />
                                </div>
                            ) : (
                                <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-slate-700 dark:text-text-secondary">
                                    {message.textBody || "Không có nội dung"}
                                </pre>
                            )}
                        </GlassCard>

                        {/* Attachments */}
                        {message.attachments && <AttachmentList attachments={message.attachments} />}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-text-secondary">
                    <div className="w-20 h-20 rounded-3xl bg-surface-glass border border-white/5 flex items-center justify-center mb-6 shadow-xl">
                        <svg className="w-10 h-10 text-text-tertiary" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-text-primary mb-2">Chưa chọn tin nhắn</h3>
                    <p className="max-w-xs mx-auto">Chọn một email từ danh sách để xem nội dung.</p>
                </div>
            )}

            {/* Quick Reply Footer */}
            {message && (
                <div className="hidden md:flex p-4 border-t border-white/5 bg-background/50 backdrop-blur-md shrink-0 z-10">
                    <button
                        onClick={onReply}
                        className="flex-1 h-12 rounded-lg bg-[#0a0a14] border border-white/10 hover:border-primary/50 text-left px-4 text-text-tertiary text-sm flex items-center justify-between group transition-all"
                    >
                        <span>Soạn phản hồi nhanh...</span>
                        <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-white/5 border border-white/10 text-xs text-text-tertiary">Ctrl + Enter</span>
                            <span className="material-symbols-outlined text-[20px] group-hover:text-primary transition-colors">send</span>
                        </div>
                    </button>
                </div>
            )}
        </motion.div>
    );
}
