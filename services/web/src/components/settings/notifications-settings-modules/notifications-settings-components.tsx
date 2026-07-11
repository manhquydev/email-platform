/**
 * UI components for NotificationsSettings
 */
import { GlassCard } from "../../ui/GlassCard";
import { Button } from "../../ui/Button";
import type { TelegramStatus, InboxTelegramLink } from "./types";

// --- Browser Push Section ---
interface BrowserPushSectionProps {
    isSubscribed: boolean;
    pushLoading: boolean;
    subscribe: () => void;
    unsubscribe: () => void;
}

export function BrowserPushSection({ isSubscribed, pushLoading, subscribe, unsubscribe }: BrowserPushSectionProps) {
    return (
        <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-semantic-accent">notifications_active</span>
                <h3 className="text-lg font-semibold text-semantic-text-main">Thông báo trình duyệt</h3>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-semantic-bg-secondary border border-semantic-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-semantic-accent-subtle">
                        <span className="material-symbols-outlined text-semantic-accent text-sm">desktop_windows</span>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-semantic-text-main">Nhận thông báo trên thiết bị này</span>
                        <p className="text-xs text-semantic-text-muted">
                            {isSubscribed ? 'Đang bật' : 'Đang tắt'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={isSubscribed ? unsubscribe : subscribe}
                    disabled={pushLoading}
                    className={`relative w-11 h-6 rounded-full transition-colors ${isSubscribed ? 'bg-semantic-success' : 'bg-semantic-border'}`}
                >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${isSubscribed ? 'translate-x-5' : ''}`} />
                </button>
            </div>
        </GlassCard>
    );
}

// --- Account Telegram Section ---
interface AccountTelegramSectionProps {
    telegramStatus: TelegramStatus | null;
    telegramLinkToken: string | null;
    telegramBotLink: string | null;
    telegramBusy: boolean;
    showUnlinkConfirm: boolean;
    setShowUnlinkConfirm: (show: boolean) => void;
    generateTelegramLink: () => void;
    toggleTelegramNotify: () => void;
    confirmUnlinkTelegram: () => void;
    copyLinkToken: () => void;
}

export function AccountTelegramSection({
    telegramStatus,
    telegramLinkToken,
    telegramBotLink,
    telegramBusy,
    showUnlinkConfirm,
    setShowUnlinkConfirm,
    generateTelegramLink,
    toggleTelegramNotify,
    confirmUnlinkTelegram,
    copyLinkToken
}: AccountTelegramSectionProps) {
    return (
        <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-semantic-info">send</span>
                <h3 className="text-lg font-semibold text-semantic-text-main">Thông báo Telegram (Tài khoản)</h3>
            </div>

            <div>
                {telegramStatus?.linked ? (
                    <LinkedTelegramContent
                        telegramStatus={telegramStatus}
                        telegramBusy={telegramBusy}
                        showUnlinkConfirm={showUnlinkConfirm}
                        setShowUnlinkConfirm={setShowUnlinkConfirm}
                        toggleTelegramNotify={toggleTelegramNotify}
                        confirmUnlinkTelegram={confirmUnlinkTelegram}
                    />
                ) : (
                    <UnlinkedTelegramContent
                        telegramLinkToken={telegramLinkToken}
                        telegramBotLink={telegramBotLink}
                        telegramBusy={telegramBusy}
                        generateTelegramLink={generateTelegramLink}
                        copyLinkToken={copyLinkToken}
                    />
                )}
            </div>
        </GlassCard>
    );
}

function LinkedTelegramContent({
    telegramStatus,
    telegramBusy,
    showUnlinkConfirm,
    setShowUnlinkConfirm,
    toggleTelegramNotify,
    confirmUnlinkTelegram
}: {
    telegramStatus: TelegramStatus;
    telegramBusy: boolean;
    showUnlinkConfirm: boolean;
    setShowUnlinkConfirm: (show: boolean) => void;
    toggleTelegramNotify: () => void;
    confirmUnlinkTelegram: () => void;
}) {
    return (
        <div className="space-y-4">
            {/* Linked Status Banner */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-semantic-success-subtle border border-semantic-success/30">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-semantic-success-subtle">
                    <span className="material-symbols-outlined text-semantic-success">check_circle</span>
                </div>
                <div>
                    <p className="font-medium text-semantic-success">Đã liên kết Telegram</p>
                    {telegramStatus.linkedAt && (
                        <p className="text-xs text-semantic-text-muted">
                            Liên kết vào ngày: {new Date(telegramStatus.linkedAt).toLocaleDateString("vi-VN")}
                        </p>
                    )}
                </div>
            </div>

            {/* Notification Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-semantic-bg-secondary border border-semantic-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-semantic-info-subtle">
                        <span className="material-symbols-outlined text-semantic-info text-sm">notifications</span>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-semantic-text-main">Thông báo email mới</span>
                        <p className="text-xs text-semantic-text-muted">
                            {telegramStatus.notifyOnEmail ? 'Bật' : 'Tắt'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={toggleTelegramNotify}
                    disabled={telegramBusy}
                    className={`relative w-11 h-6 rounded-full transition-colors ${telegramStatus.notifyOnEmail ? 'bg-semantic-success' : 'bg-semantic-border'}`}
                >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${telegramStatus.notifyOnEmail ? 'translate-x-5' : ''}`} />
                </button>
            </div>

            {/* Unlink Button */}
            {showUnlinkConfirm ? (
                <div className="p-4 border border-semantic-danger/30 rounded-xl bg-semantic-danger-subtle">
                    <p className="text-sm text-semantic-danger mb-3">Bạn có chắc chắn muốn hủy liên kết Telegram không?</p>
                    <div className="flex gap-3">
                        <Button onClick={confirmUnlinkTelegram} variant="danger" disabled={telegramBusy}>Xác nhận hủy</Button>
                        <Button onClick={() => setShowUnlinkConfirm(false)} variant="secondary">Hủy</Button>
                    </div>
                </div>
            ) : (
                <Button
                    onClick={() => setShowUnlinkConfirm(true)}
                    disabled={telegramBusy}
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-2 text-semantic-danger hover:bg-semantic-danger-subtle"
                >
                    <span className="material-symbols-outlined text-[18px]">link_off</span>
                    {telegramBusy ? "Đang xử lý..." : "Hủy liên kết Telegram"}
                </Button>
            )}
        </div>
    );
}

function UnlinkedTelegramContent({
    telegramLinkToken,
    telegramBotLink,
    telegramBusy,
    generateTelegramLink,
    copyLinkToken
}: {
    telegramLinkToken: string | null;
    telegramBotLink: string | null;
    telegramBusy: boolean;
    generateTelegramLink: () => void;
    copyLinkToken: () => void;
}) {
    return (
        <div className="space-y-4">
            <div className="p-4 rounded-xl bg-semantic-bg-secondary border border-semantic-border">
                <p className="text-sm font-medium mb-1 text-semantic-text-main">Nhận cảnh báo tức thì</p>
                <p className="text-xs text-semantic-text-muted">
                    Nhận email mới, OTP và các thông báo quan trọng trực tiếp qua Telegram của bạn.
                </p>
            </div>

            {telegramLinkToken ? (
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-semantic-info-subtle border border-semantic-info/30">
                        <p className="text-sm mb-2 text-semantic-info">Mã liên kết của bạn:</p>
                        <div className="flex items-center gap-3">
                            <code className="text-2xl font-mono font-bold tracking-widest text-semantic-info">
                                {telegramLinkToken}
                            </code>
                            <button
                                onClick={copyLinkToken}
                                className="p-2 hover:bg-semantic-bg-hover rounded-lg text-semantic-info transition-colors"
                            >
                                <span className="material-symbols-outlined">content_copy</span>
                            </button>
                        </div>
                    </div>
                    <a
                        href={telegramBotLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-semantic-accent to-semantic-accent-active text-white shadow-semantic-md hover:shadow-semantic-lg transition-all"
                    >
                        Mở Bot Telegram
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </a>
                </div>
            ) : (
                <Button onClick={generateTelegramLink} disabled={telegramBusy} className="w-full">
                    {telegramBusy ? "Đang tạo..." : "Kết nối Telegram"}
                </Button>
            )}
        </div>
    );
}

// --- Inbox Telegram Links Section ---
interface InboxTelegramLinksSectionProps {
    inboxLinks: InboxTelegramLink[];
    inboxLinksLoading: boolean;
    unlinkingId: string | null;
    unlinkInbox: (linkId: string) => void;
}

export function InboxTelegramLinksSection({ inboxLinks, inboxLinksLoading, unlinkingId, unlinkInbox }: InboxTelegramLinksSectionProps) {
    return (
        <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-semantic-info">inbox</span>
                <h3 className="text-lg font-semibold text-semantic-text-main">Liên kết Telegram theo hộp thư</h3>
            </div>

            <p className="text-sm text-semantic-text-muted mb-4">
                Các hộp thư đang được liên kết với Telegram để nhận thông báo riêng.
            </p>

            {inboxLinksLoading ? (
                <div className="flex items-center justify-center py-8">
                    <span className="material-symbols-outlined animate-spin text-semantic-text-muted">progress_activity</span>
                </div>
            ) : inboxLinks.length === 0 ? (
                <div className="text-center py-8">
                    <span className="material-symbols-outlined text-4xl text-semantic-text-muted mb-2">inbox</span>
                    <p className="text-sm text-semantic-text-muted">Chưa có hộp thư nào được liên kết</p>
                    <p className="text-xs text-semantic-text-muted mt-1">
                        Truy cập Public Inbox Viewer và liên kết Telegram cho từng hộp thư
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {inboxLinks.map(link => (
                        <InboxLinkItem
                            key={link.id}
                            link={link}
                            isUnlinking={unlinkingId === link.id}
                            onUnlink={() => unlinkInbox(link.id)}
                        />
                    ))}
                </div>
            )}
        </GlassCard>
    );
}

function InboxLinkItem({ link, isUnlinking, onUnlink }: { link: InboxTelegramLink; isUnlinking: boolean; onUnlink: () => void }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-semantic-bg-secondary border border-semantic-border">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-semantic-info-subtle">
                    <span className="material-symbols-outlined text-semantic-info">mail</span>
                </div>
                <div>
                    <p className="text-sm font-medium text-semantic-text-main">{link.inboxEmail}</p>
                    <p className="text-xs text-semantic-text-muted">
                        {link.telegramUsername ? `@${link.telegramUsername}` : 'Telegram'}
                        {' • '}
                        {new Date(link.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                </div>
            </div>
            <button
                onClick={onUnlink}
                disabled={isUnlinking}
                className="p-2 text-semantic-danger hover:bg-semantic-danger-subtle rounded-lg transition-colors"
                title="Hủy liên kết"
            >
                {isUnlinking ? (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                ) : (
                    <span className="material-symbols-outlined text-sm">link_off</span>
                )}
            </button>
        </div>
    );
}
