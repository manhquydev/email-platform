import { useState, useEffect } from "react";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
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

    useEffect(() => {
        loadTelegramStatus();
        loadInboxLinks();
    }, [token]);

    const loadTelegramStatus = async () => {
        if (!token) return;
        try {
            const status = await api<TelegramStatus>("/telegram/status", { token });
            setTelegramStatus(status);
        } catch {
            // Telegram not configured, ignore
        }
    };

    const loadInboxLinks = async () => {
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
    };

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
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Thông báo</h2>
                <p className="text-slate-500 dark:text-gray-400 font-body">Quản lý cách bạn nhận cảnh báo và tin nhắn.</p>
            </div>

            {/* Account Telegram Link */}
            <GlassCard className="p-6 dark:!bg-white/[0.08] border border-slate-200 dark:border-white/15 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-[#0088cc]">send</span>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Thông báo Telegram (Tài khoản)</h3>
                </div>

                <div>
                    {telegramStatus?.linked ? (
                        <div className="space-y-4">
                            {/* Linked Status Banner */}
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-500/20">
                                    <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                                </div>
                                <div>
                                    <p className="font-medium text-green-700 dark:text-green-400">Đã liên kết Telegram</p>
                                    {telegramStatus.linkedAt && (
                                        <p className="text-xs text-slate-500 dark:text-gray-400">
                                            Liên kết vào ngày: {new Date(telegramStatus.linkedAt).toLocaleDateString("vi-VN")}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Notification Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-surface border border-slate-200 dark:border-white/15">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-100 dark:bg-cyan-500/10">
                                        <span className="material-symbols-outlined text-cyan-600 dark:text-cyan-400 text-sm">notifications</span>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-slate-900 dark:text-white">Thông báo email mới</span>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">
                                            {telegramStatus.notifyOnEmail ? 'Bật' : 'Tắt'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleTelegramNotify}
                                    disabled={telegramBusy}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${telegramStatus.notifyOnEmail ? 'bg-green-500' : 'bg-slate-300 dark:bg-gray-700'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${telegramStatus.notifyOnEmail ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>

                            {/* Unlink Button */}
                            {showUnlinkConfirm ? (
                                <div className="p-4 border border-red-200 dark:border-red-500/30 rounded-xl bg-red-50 dark:bg-red-500/5">
                                    <p className="text-sm text-red-600 dark:text-red-400 mb-3">Bạn có chắc chắn muốn hủy liên kết Telegram không?</p>
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
                                    className="w-full flex items-center justify-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-100 dark:hover:text-red-500 dark:hover:bg-red-500/10"
                                >
                                    <span className="material-symbols-outlined text-[18px]">link_off</span>
                                    {telegramBusy ? "Đang xử lý..." : "Hủy liên kết Telegram"}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface border border-slate-200 dark:border-white/15">
                                <p className="text-sm font-medium mb-1 text-slate-900 dark:text-white">Nhận cảnh báo tức thì</p>
                                <p className="text-xs text-slate-500 dark:text-gray-400">
                                    Nhận email mới, OTP và các thông báo quan trọng trực tiếp qua Telegram của bạn.
                                </p>
                            </div>

                            {telegramLinkToken ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30">
                                        <p className="text-sm mb-2 text-cyan-700 dark:text-cyan-400">Mã liên kết của bạn:</p>
                                        <div className="flex items-center gap-3">
                                            <code className="text-2xl font-mono font-bold tracking-widest text-cyan-600 dark:text-cyan-400">
                                                {telegramLinkToken}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(telegramLinkToken);
                                                    toast.success("Đã sao chép!");
                                                }}
                                                className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-cyan-600 dark:text-cyan-400 transition-colors"
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
            <GlassCard className="p-6 dark:!bg-white/[0.08] border border-slate-200 dark:border-white/15 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-[#0088cc]">inbox</span>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Liên kết Telegram theo hộp thư</h3>
                </div>

                <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">
                    Các hộp thư đang được liên kết với Telegram để nhận thông báo riêng.
                </p>

                {inboxLinksLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <span className="material-symbols-outlined animate-spin text-slate-400">progress_activity</span>
                    </div>
                ) : inboxLinks.length === 0 ? (
                    <div className="text-center py-8">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-gray-600 mb-2">inbox</span>
                        <p className="text-sm text-slate-500 dark:text-gray-400">Chưa có hộp thư nào được liên kết</p>
                        <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                            Truy cập Public Inbox Viewer và liên kết Telegram cho từng hộp thư
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {inboxLinks.map(link => (
                            <div
                                key={link.id}
                                className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-surface border border-slate-200 dark:border-white/15"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-500/10">
                                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">mail</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{link.inboxEmail}</p>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">
                                            {link.telegramUsername ? `@${link.telegramUsername}` : 'Telegram'}
                                            {' • '}
                                            {new Date(link.createdAt).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => unlinkInbox(link.id)}
                                    disabled={unlinkingId === link.id}
                                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-lg transition-colors"
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
