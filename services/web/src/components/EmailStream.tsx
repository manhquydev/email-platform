
import { useMemo } from "react";
import type { Message } from "../types";
import { extractOTP } from "../utils/otpExtractor";
import toast from "react-hot-toast";
import { cn } from "../utils/cn";

interface EmailStreamProps {
    messages: Message[];
    selectedMessageId: string | null;
    onSelectMessage: (message: Message) => void;
    onCopyOTP?: (otp: string) => void;
    className?: string;
}

interface GroupedMessages {
    today: Message[];
    yesterday: Message[];
    thisWeek: Message[];
    earlier: Message[];
}

function getTimeGroup(date: Date): keyof GroupedMessages {
    const now = new Date();
    const messageDate = new Date(date);

    // Reset time to compare dates only
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    if (messageDate >= todayStart) return 'today';
    if (messageDate >= yesterdayStart) return 'yesterday';
    if (messageDate >= weekStart) return 'thisWeek';
    return 'earlier';
}

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'vừa xong';
    if (minutes < 60) return `${minutes} phút`;
    if (hours < 24) return `${hours} giờ`;
    if (days < 7) return `${days} ngày`;
    return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

export function EmailStream({ messages, selectedMessageId, onSelectMessage, onCopyOTP, className }: EmailStreamProps) {
    // Group messages by time
    const groupedMessages = useMemo(() => {
        const groups: GroupedMessages = {
            today: [],
            yesterday: [],
            thisWeek: [],
            earlier: []
        };

        messages.forEach(msg => {
            const group = getTimeGroup(new Date(msg.receivedAt));
            groups[group].push(msg);
        });

        return groups;
    }, [messages]);

    const handleCopyOTP = (otp: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(otp);
        toast.success(`Đã copy OTP: ${otp}`);
        onCopyOTP?.(otp);
    };

    const renderGroup = (label: string, groupMessages: Message[], groupKey: string) => {
        if (groupMessages.length === 0) return null;

        return (
            <div className="mb-6 last:mb-0" key={groupKey}>
                <div className="flex items-center gap-2 mb-2 px-4 sticky top-0 bg-white/80 dark:bg-background/80 backdrop-blur-md z-10 py-2 border-b border-slate-200 dark:border-white/5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-text-secondary uppercase tracking-wider">{label}</span>
                    <span className="text-xs text-slate-400 dark:text-text-tertiary">({groupMessages.length})</span>
                </div>

                <div className="flex flex-col">
                    {groupMessages.map(message => {
                        const otpResult = extractOTP(message.textBody || message.subject || '');
                        const otp = typeof otpResult === 'string' ? otpResult : otpResult?.code;
                        const isUnread = !message.isRead;
                        const isSelected = message.id === selectedMessageId;

                        return (
                            <div
                                key={message.id}
                                className={cn(
                                    "group relative p-4 cursor-pointer transition-all duration-200 border-b border-slate-200 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-600 dark:hover:border-l-4 dark:hover:border-l-cyan-400",
                                    isUnread && "bg-primary/5",
                                    isSelected && "bg-primary/5 dark:bg-blue-600/25 dark:border-l-4 dark:border-l-blue-500 shadow-[inset_3px_0_0_0_#9333EA] z-10"
                                )}
                                onClick={() => onSelectMessage(message)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && onSelectMessage(message)}
                            >
                                {/* Unread Indicator */}
                                {isUnread && !isSelected && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                )}

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={cn(
                                            "text-sm truncate max-w-[70%]",
                                            isUnread || isSelected ? "text-slate-900 dark:text-text-primary font-medium" : "text-slate-600 dark:text-text-secondary"
                                        )}>
                                            {message.fromAddress}
                                        </span>
                                        <span className="text-xs text-slate-400 dark:text-text-tertiary whitespace-nowrap">
                                            {formatRelativeTime(new Date(message.receivedAt))}
                                        </span>
                                    </div>

                                    <div className={cn(
                                        "text-sm truncate",
                                        isUnread || isSelected ? "text-slate-900 dark:text-text-primary font-medium" : "text-slate-600 dark:text-text-secondary"
                                    )}>
                                        {message.subject || '(Không có tiêu đề)'}
                                    </div>

                                    <div className="text-xs text-slate-500 dark:text-text-tertiary line-clamp-2">
                                        {message.textBody?.substring(0, 100) || 'Không có nội dung xem trước'}
                                    </div>

                                    {otp && (
                                        <button
                                            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors border border-primary/20"
                                            onClick={(e) => handleCopyOTP(otp, e)}
                                            title="Nhấn để sao chép OTP"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                            </svg>
                                            OTP: {otp}
                                        </button>
                                    )}

                                    {/* Labels Display */}
                                    {message.labels && message.labels.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {message.labels.map(label => (
                                                <span
                                                    key={label.id}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                                    style={{
                                                        backgroundColor: `${label.color}20`,
                                                        color: label.color,
                                                        border: `1px solid ${label.color}40`
                                                    }}
                                                >
                                                    <span
                                                        className="w-1.5 h-1.5 rounded-full"
                                                        style={{ backgroundColor: label.color }}
                                                    />
                                                    {label.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-64 text-slate-500 dark:text-text-secondary">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-surface-glass border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 opacity-50 text-slate-400 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-text-primary mb-2">Chưa có email</h3>
                <p className="text-sm max-w-[200px]">Chọn một hộp thư từ thanh bên hoặc tạo mới để bắt đầu.</p>
                <p className="mt-4 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-blue-600/25 dark:border-l-4 dark:border-l-blue-500 font-mono text-slate-700 dark:text-text-primary border border-slate-300 dark:border-white/10">⌘K</span> để tìm kiếm hoặc tạo mới
                </p>
            </div>
        );
    }

    return (
        <div className={cn("h-full overflow-y-auto custom-scrollbar", className)}>
            {renderGroup('Hôm nay', groupedMessages.today, 'today')}
            {renderGroup('Hôm qua', groupedMessages.yesterday, 'yesterday')}
            {renderGroup('Tuần này', groupedMessages.thisWeek, 'week')}
            {renderGroup('Trước đó', groupedMessages.earlier, 'earlier')}
        </div>
    );
}
