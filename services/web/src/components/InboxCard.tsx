import toast from "react-hot-toast";
import type { Inbox } from "../types";

interface InboxCardProps {
    inbox: Inbox;
    isSelected: boolean;
    isActive: boolean;
    onSelect: () => void;
    onToggleSelect: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onViewMessages: () => void;
}

export function InboxCard({
    inbox,
    isSelected,
    isActive,
    onSelect,
    onToggleSelect,
    onCopy,
    onDelete,
    onViewMessages
}: InboxCardProps) {
    const email = `${inbox.localPart}@${inbox.domain?.name || 'domain'}`;

    // Calculate TTL status
    const getTTLInfo = () => {
        if (!inbox.expiresAt) {
            return { label: "Vĩnh viễn", status: "permanent" as const, icon: "⚪" };
        }
        const expires = new Date(inbox.expiresAt);
        const now = new Date();
        const diffMs = expires.getTime() - now.getTime();

        if (diffMs <= 0) {
            return { label: "Đã hết hạn", status: "expired" as const, icon: "🔴" };
        }

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 24) {
            return { label: `Còn ${diffHours} giờ`, status: "expiring" as const, icon: "🟡" };
        }
        return { label: `Còn ${diffDays} ngày`, status: "active" as const, icon: "🟢" };
    };

    const ttl = getTTLInfo();

    // Get message count from API
    const messageCount = inbox._count?.messages ?? 0;

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(email);
        toast.success(`Đã sao chép: ${email}`, { icon: "📋" });
        onCopy();
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
    };

    const handleCheckbox = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleSelect();
    };

    return (
        <div
            className={`inbox-card ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''} ${ttl.status}`}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter') onViewMessages();
                if (e.key === ' ') { e.preventDefault(); onToggleSelect(); }
            }}
        >
            {/* Checkbox for batch selection */}
            <div className="inbox-card-checkbox" onClick={handleCheckbox}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => { }}
                    tabIndex={-1}
                />
                <span className="inbox-card-checkbox-custom" />
            </div>

            {/* Main content */}
            <div className="inbox-card-content" onClick={onViewMessages}>
                <div className="inbox-card-header">
                    <span className="inbox-card-email">{email}</span>
                    <span className={`inbox-card-status inbox-card-status--${ttl.status}`}>
                        <span className="inbox-card-status-icon">{ttl.icon}</span>
                        <span className="inbox-card-status-label">{ttl.label}</span>
                    </span>
                </div>

                <div className="inbox-card-meta">
                    <span className="inbox-card-count">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                        {messageCount} email{messageCount !== 1 ? 's' : ''}
                    </span>
                    <span className="inbox-card-domain">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        {inbox.domain?.name}
                    </span>
                    <span className="inbox-card-created">
                        Tạo {new Date(inbox.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="inbox-card-actions">
                <button
                    className="inbox-card-action inbox-card-action--copy"
                    onClick={handleCopy}
                    title="Sao chép địa chỉ"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                </button>
                <button
                    className="inbox-card-action inbox-card-action--view"
                    onClick={(e) => { e.stopPropagation(); onViewMessages(); }}
                    title="Xem tin nhắn"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
                <button
                    className="inbox-card-action inbox-card-action--delete"
                    onClick={handleDelete}
                    title="Xóa hộp thư"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
