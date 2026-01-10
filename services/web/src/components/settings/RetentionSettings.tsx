import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { toast } from "react-hot-toast";
import type { Inbox } from "../../types";

interface RetentionSettingsProps {
    userInboxes?: Inbox[];
    userTier?: string;
    userRetentionDays?: number | null;
    onUserRetentionChange?: (days: number | null) => void;
}

// Tier limits for retention (days)
const TIER_LIMITS: Record<string, { max: number; label: string }> = {
    FREE: { max: 7, label: "Free" },
    STARTER: { max: 30, label: "Starter" },
    PROFESSIONAL: { max: 90, label: "Professional" },
    ENTERPRISE: { max: 365, label: "Enterprise" },
};

export function RetentionSettings({
    userInboxes = [],
    userTier = "FREE",
    userRetentionDays,
    onUserRetentionChange
}: RetentionSettingsProps) {
    const { token } = useAuth();
    const [selectedInbox, setSelectedInbox] = useState<Inbox | null>(null);
    const [inboxRetention, setInboxRetention] = useState<number | null>(null);
    const [defaultRetention, setDefaultRetention] = useState<number | null>(userRetentionDays ?? null);
    const [saving, setSaving] = useState(false);

    const tierInfo = TIER_LIMITS[userTier] || TIER_LIMITS.FREE;

    useEffect(() => {
        setDefaultRetention(userRetentionDays ?? null);
    }, [userRetentionDays]);

    const handleInboxSelect = (inbox: Inbox) => {
        setSelectedInbox(inbox);
        setInboxRetention((inbox as Inbox & { retentionDays?: number }).retentionDays ?? null);
    };

    const handleSaveInboxRetention = async () => {
        if (!selectedInbox) return;
        setSaving(true);
        try {
            await api(`/inboxes/${selectedInbox.id}`, {
                method: "PATCH",
                token,
                body: { retentionDays: inboxRetention }
            });
            toast.success("Đã cập nhật thời gian lưu trữ cho inbox");
            // Update local state
            setSelectedInbox({ ...selectedInbox, retentionDays: inboxRetention } as Inbox & { retentionDays?: number | null });
        } catch (err: unknown) {
            toast.error((err as Error)?.message || "Không thể cập nhật");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveDefaultRetention = async () => {
        setSaving(true);
        try {
            await api("/auth/me", {
                method: "PATCH",
                token,
                body: { retentionDays: defaultRetention }
            });
            toast.success("Đã cập nhật thời gian lưu trữ mặc định");
            onUserRetentionChange?.(defaultRetention);
        } catch (err: unknown) {
            toast.error((err as Error)?.message || "Không thể cập nhật");
        } finally {
            setSaving(false);
        }
    };

    const retentionOptions = [
        { value: null, label: "Mặc định theo gói" },
        { value: 1, label: "1 ngày" },
        { value: 3, label: "3 ngày" },
        { value: 7, label: "7 ngày" },
        { value: 14, label: "14 ngày" },
        { value: 30, label: "30 ngày" },
        { value: 60, label: "60 ngày" },
        { value: 90, label: "90 ngày" },
        { value: 180, label: "180 ngày" },
        { value: 365, label: "365 ngày" },
    ].filter(opt => opt.value === null || opt.value <= tierInfo.max);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-nebula-text mb-2 tracking-tight">Thời gian lưu trữ</h2>
                <p className="text-nebula-text-muted font-body">
                    Cấu hình thời gian lưu giữ email trước khi tự động xóa.
                </p>
            </div>

            {/* Tier Info Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-nebula-violet/10 to-nebula-violet-dark/10 border border-nebula-violet/20">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-nebula-violet text-2xl">schedule</span>
                    <div>
                        <p className="font-medium text-nebula-text">
                            Gói {tierInfo.label} - Tối đa {tierInfo.max} ngày
                        </p>
                        <p className="text-sm text-nebula-text-muted">
                            {userTier === "FREE"
                                ? "Nâng cấp để lưu trữ email lâu hơn"
                                : "Bạn có thể cấu hình thời gian lưu trữ tùy chỉnh"
                            }
                        </p>
                    </div>
                    {userTier === "FREE" && (
                        <Button size="sm" variant="secondary" className="ml-auto" onClick={() => window.location.href = "/settings?tab=subscription"}>
                            Nâng cấp
                        </Button>
                    )}
                </div>
            </div>

            {/* Default Retention Setting */}
            <section className="glass-panel rounded-xl p-6 bg-nebula-surface border border-nebula-border border-l-4 border-l-info/70 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-nebula-text mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-info">settings</span>
                            Mặc định cho tài khoản
                        </h3>
                        <p className="text-sm text-nebula-text-muted">
                            Áp dụng cho tất cả inbox không có cấu hình riêng.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        value={defaultRetention === null ? "null" : defaultRetention.toString()}
                        onChange={(e) => setDefaultRetention(e.target.value === "null" ? null : parseInt(e.target.value))}
                        className="flex-1 max-w-xs px-3 py-2 rounded-lg border border-nebula-border bg-nebula-surface text-nebula-text"
                    >
                        {retentionOptions.map(opt => (
                            <option key={opt.value ?? "null"} value={opt.value === null ? "null" : opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <Button onClick={handleSaveDefaultRetention} disabled={saving}>
                        {saving ? "Đang lưu..." : "Lưu"}
                    </Button>
                </div>

                <p className="text-xs text-nebula-text-muted mt-2">
                    Mặc định theo gói: {tierInfo.max} ngày ({tierInfo.label})
                </p>
            </section>

            {/* Per-Inbox Retention Settings */}
            <section className="glass-panel rounded-xl p-6 bg-nebula-surface border border-nebula-border border-l-4 border-l-success/70 shadow-sm">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-nebula-text mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-success">inbox</span>
                        Cấu hình theo inbox
                    </h3>
                    <p className="text-sm text-nebula-text-muted">
                        Tùy chỉnh thời gian lưu trữ cho từng inbox cụ thể.
                    </p>
                </div>

                {userInboxes.length === 0 ? (
                    <div className="text-center py-8 bg-nebula-elevated/50 rounded-lg border border-nebula-border border-dashed">
                        <span className="material-symbols-outlined text-nebula-text-muted text-3xl mb-2">inbox</span>
                        <p className="text-nebula-text-muted text-sm">Chưa có inbox nào.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {userInboxes.slice(0, 10).map(inbox => (
                            <div
                                key={inbox.id}
                                onClick={() => handleInboxSelect(inbox)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                    selectedInbox?.id === inbox.id
                                        ? "border-success bg-success/10"
                                        : "border-nebula-border bg-nebula-elevated/50 hover:border-nebula-border-highlight"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-success text-[18px]">mail</span>
                                        <span className="font-mono text-sm text-nebula-text">
                                            {inbox.localPart}@{inbox.domain?.name}
                                        </span>
                                    </div>
                                    <span className="text-xs text-nebula-text-muted">
                                        {(inbox as Inbox & { retentionDays?: number }).retentionDays
                                            ? `${(inbox as Inbox & { retentionDays?: number }).retentionDays} ngày`
                                            : "Mặc định"
                                        }
                                    </span>
                                </div>
                            </div>
                        ))}
                        {userInboxes.length > 10 && (
                            <p className="text-xs text-nebula-text-muted text-center">+ {userInboxes.length - 10} inbox khác</p>
                        )}
                    </div>
                )}

                {/* Selected Inbox Edit Panel */}
                {selectedInbox && (
                    <div className="mt-4 p-4 bg-nebula-elevated rounded-lg border border-nebula-border">
                        <h4 className="font-medium text-nebula-text mb-3">
                            Cấu hình cho: {selectedInbox.localPart}@{selectedInbox.domain?.name}
                        </h4>
                        <div className="flex items-center gap-4">
                            <select
                                value={inboxRetention === null ? "null" : inboxRetention.toString()}
                                onChange={(e) => setInboxRetention(e.target.value === "null" ? null : parseInt(e.target.value))}
                                className="flex-1 max-w-xs px-3 py-2 rounded-lg border border-nebula-border bg-nebula-surface text-nebula-text"
                            >
                                {retentionOptions.map(opt => (
                                    <option key={opt.value ?? "null"} value={opt.value === null ? "null" : opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <Button onClick={handleSaveInboxRetention} disabled={saving}>
                                {saving ? "Đang lưu..." : "Áp dụng"}
                            </Button>
                            <Button variant="ghost" onClick={() => setSelectedInbox(null)}>
                                Hủy
                            </Button>
                        </div>
                    </div>
                )}
            </section>

            {/* Info Box */}
            <div className="p-4 rounded-lg bg-nebula-elevated border border-nebula-border">
                <h4 className="font-medium text-nebula-text mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">info</span>
                    Cách hoạt động
                </h4>
                <ul className="text-sm text-nebula-text-secondary space-y-1">
                    <li>• <strong>Inbox riêng</strong> được ưu tiên cao nhất</li>
                    <li>• Nếu không có, dùng <strong>mặc định tài khoản</strong></li>
                    <li>• Nếu không có, dùng <strong>mặc định gói</strong> ({tierInfo.max} ngày)</li>
                    <li>• Email hết hạn sẽ bị xóa tự động trong vòng 24 giờ</li>
                </ul>
            </div>
        </div>
    );
}
