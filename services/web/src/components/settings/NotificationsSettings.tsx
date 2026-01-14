import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import toast from "react-hot-toast";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";

interface TelegramStatus {
    linked: boolean;
    linkedAt?: string;
    notifyOnEmail: boolean;
}

interface InboxTelegramLink {
    id: string;
    inboxEmail: string;
    telegramUsername?: string;
    createdAt: string;
}

export function NotificationsSettings() {
    const { token } = useAuth();
    const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
    const [telegramLinkToken, setTelegramLinkToken] = useState<string | null>(null);
    const [telegramBotLink, setTelegramBotLink] = useState<string | null>(null);
    const [telegramBusy, setTelegramBusy] = useState(false);
    const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

    // Inbox telegram links
    const [inboxLinks, setInboxLinks] = useState<InboxTelegramLink[]>([]);
    const [inboxLinksLoading, setInboxLinksLoading] = useState(false);
    const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

    // Browser Push
    const { isSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

    const loadTelegramStatus = useCallback(async () => {
        if (!token) return;
        try {
            const status = await api<TelegramStatus>("/telegram/status", { token });
            setTelegramStatus(status);
        } catch {
            // Telegram not configured, ignore
        }
    }, [token]);

    const loadInboxLinks = useCallback(async () => {
        if (!token) return;
        setInboxLinksLoading(true);
        try {
            const res = await api<{ links: InboxTelegramLink[] }>("/telegram/inbox-links", { token });
            setInboxLinks(res.links || []);
        } catch {
            // Ignore errors
        } finally {
            setInboxLinksLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadTelegramStatus();
        loadInboxLinks();
    }, [loadTelegramStatus, loadInboxLinks]);

    const unlinkInbox = async (linkId: string) => {
        setUnlinkingId(linkId);
        try {
            await api(`/telegram/inbox-links/${linkId}`, { method: "DELETE", token });
            setInboxLinks(prev => prev.filter(l => l.id !== linkId));
            toast.success("Đã hủy liên kết hộp thư");
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setUnlinkingId(null);
        }
    };

    const generateTelegramLink = async () => {
        setTelegramBusy(true);
        try {
            const res = await api<{ token: string; botLink: string }>(
                "/telegram/link-token",
                { method: "POST", token }
            );
            setTelegramLinkToken(res.token);
            setTelegramBotLink(res.botLink);
            toast.success("Đã tạo mã liên kết!");
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTelegramBusy(false);
        }
    };

    const toggleTelegramNotify = async () => {
        if (!telegramStatus) return;
        setTelegramBusy(true);
        try {
            await api("/telegram/preferences", {
                method: "PATCH",
                token,
                body: { notifyOnEmail: !telegramStatus.notifyOnEmail }
            });
            setTelegramStatus(prev => prev ? { ...prev, notifyOnEmail: !prev.notifyOnEmail } : null);
            toast.success(telegramStatus.notifyOnEmail ? "Đã tắt thông báo" : "Đã bật thông báo");
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTelegramBusy(false);
        }
    };

    const confirmUnlinkTelegram = async () => {
        setTelegramBusy(true);
        try {
            await api("/telegram/unlink", { method: "DELETE", token });
            setTelegramStatus({ linked: false, notifyOnEmail: true });
            toast.success("Đã hủy liên kết Telegram");
            setShowUnlinkConfirm(false);
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message));
        } finally {
            setTelegramBusy(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-nebula-text mb-2 tracking-tight">Thông báo</h2>
                <p className="text-nebula-text-muted font-body">Quản lý cách bạn nhận cảnh báo và tin nhắn.</p>
            </div>

            {/* Browser Push Notifications */}
            {isSupported && (
                <GlassCard className="p-6 bg-nebula-surface/80 border border-nebula-border shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="material-symbols-outlined text-nebula-violet">notifications_active</span>
                        <h3 className="text-lg font-semibold text-nebula-text">Thông báo trình duyệt</h3>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-nebula-elevated border border-nebula-border">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-nebula-violet/10">
                                <span className="material-symbols-outlined text-nebula-violet text-sm">desktop_windows</span>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-nebula-text">Nhận thông báo trên thiết bị này</span>
                                <p className="text-xs text-nebula-text-muted">
                                    {isSubscribed ? 'Đang bật' : 'Đang tắt'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={isSubscribed ? unsubscribe : subscribe}
                            disabled={pushLoading}
                            className={`relative w-11 h-6 rounded-full transition-colors ${isSubscribed ? 'bg-success' : 'bg-nebula-border'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${isSubscribed ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>
                </GlassCard>
            )}

            {/* Account Telegram Link */}
            <GlassCard className="p-6 bg-nebula-surface/80 border border-nebula-border shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-info">send</span>
                    <h3 className="text-lg font-semibold text-nebula-text">Thông báo Telegram (Tài khoản)</h3>
                </div>

                <div>
                    {telegramStatus?.linked ? (
                        <div className="space-y-4">
                            {/* Linked Status Banner */}
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/30">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-success/20">
                                    <span className="material-symbols-outlined text-success">check_circle</span>
                                </div>
                                <div>
                                    <p className="font-medium text-success">Đã liên kết Telegram</p>
                                    {telegramStatus.linkedAt && (
                                        <p className="text-xs text-nebula-text-muted">
                                            Liên kết vào ngày: {new Date(telegramStatus.linkedAt).toLocaleDateString("vi-VN")}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Notification Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-nebula-elevated border border-nebula-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-info/10">
                                        <span className="material-symbols-outlined text-info text-sm">notifications</span>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-nebula-text">Thông báo email mới</span>
                                        <p className="text-xs text-nebula-text-muted">
                                            {telegramStatus.notifyOnEmail ? 'Bật' : 'Tắt'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleTelegramNotify}
                                    disabled={telegramBusy}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${telegramStatus.notifyOnEmail ? 'bg-success' : 'bg-nebula-border'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${telegramStatus.notifyOnEmail ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>

                            {/* Unlink Button */}
                            {showUnlinkConfirm ? (
                                <div className="p-4 border border-danger/30 rounded-xl bg-danger/5">
                                    <p className="text-sm text-danger mb-3">Bạn có chắc chắn muốn hủy liên kết Telegram không?</p>
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
                                    className="w-full flex items-center justify-center gap-2 text-danger hover:bg-danger/10"
                                >
                                    <span className="material-symbols-outlined text-[18px]">link_off</span>
                                    {telegramBusy ? "Đang xử lý..." : "Hủy liên kết Telegram"}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-nebula-elevated border border-nebula-border">
                                <p className="text-sm font-medium mb-1 text-nebula-text">Nhận cảnh báo tức thì</p>
                                <p className="text-xs text-nebula-text-muted">
                                    Nhận email mới, OTP và các thông báo quan trọng trực tiếp qua Telegram của bạn.
                                </p>
                            </div>

                            {telegramLinkToken ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-info/10 border border-info/30">
                                        <p className="text-sm mb-2 text-info">Mã liên kết của bạn:</p>
                                        <div className="flex items-center gap-3">
                                            <code className="text-2xl font-mono font-bold tracking-widest text-info">
                                                {telegramLinkToken}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(telegramLinkToken);
                                                    toast.success("Đã sao chép!");
                                                }}
                                                className="p-2 hover:bg-nebula-elevated rounded-lg text-info transition-colors"
                                            >
                                                <span className="material-symbols-outlined">content_copy</span>
                                            </button>
                                        </div>
                                    </div>
                                    <a
                                        href={telegramBotLink || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-nebula w-full flex justify-center items-center gap-2"
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
                    )}
                </div>
            </GlassCard>

            {/* Inbox Telegram Links */}
            <GlassCard className="p-6 bg-nebula-surface/80 border border-nebula-border shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-info">inbox</span>
                    <h3 className="text-lg font-semibold text-nebula-text">Liên kết Telegram theo hộp thư</h3>
                </div>

                <p className="text-sm text-nebula-text-muted mb-4">
                    Các hộp thư đang được liên kết với Telegram để nhận thông báo riêng.
                </p>

                {inboxLinksLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <span className="material-symbols-outlined animate-spin text-nebula-text-muted">progress_activity</span>
                    </div>
                ) : inboxLinks.length === 0 ? (
                    <div className="text-center py-8">
                        <span className="material-symbols-outlined text-4xl text-nebula-text-muted mb-2">inbox</span>
                        <p className="text-sm text-nebula-text-muted">Chưa có hộp thư nào được liên kết</p>
                        <p className="text-xs text-nebula-text-muted mt-1">
                            Truy cập Public Inbox Viewer và liên kết Telegram cho từng hộp thư
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {inboxLinks.map(link => (
                            <div
                                key={link.id}
                                className="flex items-center justify-between p-4 rounded-xl bg-nebula-elevated border border-nebula-border"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-info/10">
                                        <span className="material-symbols-outlined text-info">mail</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-nebula-text">{link.inboxEmail}</p>
                                        <p className="text-xs text-nebula-text-muted">
                                            {link.telegramUsername ? `@${link.telegramUsername}` : 'Telegram'}
                                            {' • '}
                                            {new Date(link.createdAt).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => unlinkInbox(link.id)}
                                    disabled={unlinkingId === link.id}
                                    className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                    title="Hủy liên kết"
                                >
                                    {unlinkingId === link.id ? (
                                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-sm">link_off</span>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
