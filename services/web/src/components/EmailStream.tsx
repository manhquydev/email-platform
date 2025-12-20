import { useMemo } from "react";
import type { Message } from "../types";
import { extractOTP } from "../utils/otpExtractor";
import toast from "react-hot-toast";

interface EmailStreamProps {
    messages: Message[];
    selectedMessageId: string | null;
    onSelectMessage: (message: Message) => void;
    onCopyOTP?: (otp: string) => void;
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

export function EmailStream({ messages, selectedMessageId, onSelectMessage, onCopyOTP }: EmailStreamProps) {
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
            <div className="stream-group" key={groupKey}>
                <div className="stream-group-header">
                    <span className="stream-group-label">{label}</span>
                    <span className="stream-group-count">({groupMessages.length})</span>
                    <div className="stream-group-line" />
                </div>

                {groupMessages.map(message => {
                    const otpResult = extractOTP(message.textBody || message.subject || '');
                    const otp = typeof otpResult === 'string' ? otpResult : otpResult?.code;
                    const isUnread = !message.isRead;
                    const isSelected = message.id === selectedMessageId;

                    return (
                        <div
                            key={message.id}
                            className={`stream-card ${isUnread ? 'unread' : ''} ${isSelected ? 'selected' : ''}`}
                            onClick={() => onSelectMessage(message)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && onSelectMessage(message)}
                        >
                            <div className={`stream-card-indicator ${isUnread ? 'unread' : ''}`} />

                            <div className="stream-card-content">
                                <div className="stream-card-header">
                                    <span className="stream-card-sender">
                                        {message.fromAddress}
                                    </span>
                                    <span className="stream-card-time">
                                        {formatRelativeTime(new Date(message.receivedAt))}
                                    </span>
                                </div>

                                <div className="stream-card-subject">
                                    {message.subject || '(Không có tiêu đề)'}
                                </div>

                                <div className="stream-card-preview">
                                    {message.textBody?.substring(0, 100) || 'Không có nội dung xem trước'}
                                </div>

                                {otp && (
                                    <button
                                        className="stream-card-otp"
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
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (messages.length === 0) {
        return (
            <div className="stream-empty">
                <div className="stream-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                </div>
                <h3>Chưa có email</h3>
                <p>Chọn một hộp thư từ thanh bên hoặc tạo mới để bắt đầu.</p>
                <p style={{ marginTop: 16 }}>
                    <span className="shortcut-hint">⌘K</span> để tìm kiếm hoặc tạo mới
                </p>
            </div>
        );
    }

    return (
        <div className="email-stream">
            {renderGroup('Hôm nay', groupedMessages.today, 'today')}
            {renderGroup('Hôm qua', groupedMessages.yesterday, 'yesterday')}
            {renderGroup('Tuần này', groupedMessages.thisWeek, 'week')}
            {renderGroup('Trước đó', groupedMessages.earlier, 'earlier')}
        </div>
    );
}
