/**
 * UI components for RetentionSettings
 */
import { Button } from "../../ui/Button";
import type { Inbox } from "../../../types";
import type { RetentionOption, InboxWithRetention } from "./retention-settings-hooks";

/** Tier info banner */
interface TierInfoBannerProps {
    tierLabel: string;
    tierMax: number;
    userTier: string;
}

export function TierInfoBanner({ tierLabel, tierMax, userTier }: TierInfoBannerProps) {
    return (
        <div className="p-4 rounded-xl bg-gradient-to-r from-nebula-violet/10 to-nebula-violet-dark/10 border border-nebula-violet/20">
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-nebula-violet text-2xl">schedule</span>
                <div>
                    <p className="font-medium text-nebula-text">
                        Gói {tierLabel} - Tối đa {tierMax} ngày
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
    );
}

/** Retention select dropdown */
interface RetentionSelectProps {
    value: number | null;
    onChange: (value: number | null) => void;
    options: RetentionOption[];
    className?: string;
}

export function RetentionSelect({ value, onChange, options, className = "" }: RetentionSelectProps) {
    return (
        <select
            value={value === null ? "null" : value.toString()}
            onChange={(e) => onChange(e.target.value === "null" ? null : parseInt(e.target.value))}
            className={`px-3 py-2 rounded-lg border border-nebula-border bg-nebula-surface text-nebula-text ${className}`}
        >
            {options.map(opt => (
                <option key={opt.value ?? "null"} value={opt.value === null ? "null" : opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

/** Default retention section */
interface DefaultRetentionSectionProps {
    defaultRetention: number | null;
    setDefaultRetention: (value: number | null) => void;
    retentionOptions: RetentionOption[];
    tierInfo: { max: number; label: string };
    saving: boolean;
    onSave: () => void;
}

export function DefaultRetentionSection({
    defaultRetention,
    setDefaultRetention,
    retentionOptions,
    tierInfo,
    saving,
    onSave
}: DefaultRetentionSectionProps) {
    return (
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
                <RetentionSelect
                    value={defaultRetention}
                    onChange={setDefaultRetention}
                    options={retentionOptions}
                    className="flex-1 max-w-xs"
                />
                <Button onClick={onSave} disabled={saving}>
                    {saving ? "Đang lưu..." : "Lưu"}
                </Button>
            </div>

            <p className="text-xs text-nebula-text-muted mt-2">
                Mặc định theo gói: {tierInfo.max} ngày ({tierInfo.label})
            </p>
        </section>
    );
}

/** Single inbox item in the list */
interface InboxItemProps {
    inbox: Inbox;
    isSelected: boolean;
    onSelect: () => void;
}

export function InboxItem({ inbox, isSelected, onSelect }: InboxItemProps) {
    const inboxWithRetention = inbox as InboxWithRetention;
    return (
        <div
            onClick={onSelect}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                isSelected
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
                    {inboxWithRetention.retentionDays
                        ? `${inboxWithRetention.retentionDays} ngày`
                        : "Mặc định"
                    }
                </span>
            </div>
        </div>
    );
}

/** Empty inbox state */
export function EmptyInboxState() {
    return (
        <div className="text-center py-8 bg-nebula-elevated/50 rounded-lg border border-nebula-border border-dashed">
            <span className="material-symbols-outlined text-nebula-text-muted text-3xl mb-2">inbox</span>
            <p className="text-nebula-text-muted text-sm">Chưa có inbox nào.</p>
        </div>
    );
}

/** Selected inbox edit panel */
interface InboxEditPanelProps {
    inbox: InboxWithRetention;
    inboxRetention: number | null;
    setInboxRetention: (value: number | null) => void;
    retentionOptions: RetentionOption[];
    saving: boolean;
    onSave: () => void;
    onCancel: () => void;
}

export function InboxEditPanel({
    inbox,
    inboxRetention,
    setInboxRetention,
    retentionOptions,
    saving,
    onSave,
    onCancel
}: InboxEditPanelProps) {
    return (
        <div className="mt-4 p-4 bg-nebula-elevated rounded-lg border border-nebula-border">
            <h4 className="font-medium text-nebula-text mb-3">
                Cấu hình cho: {inbox.localPart}@{inbox.domain?.name}
            </h4>
            <div className="flex items-center gap-4">
                <RetentionSelect
                    value={inboxRetention}
                    onChange={setInboxRetention}
                    options={retentionOptions}
                    className="flex-1 max-w-xs"
                />
                <Button onClick={onSave} disabled={saving}>
                    {saving ? "Đang lưu..." : "Áp dụng"}
                </Button>
                <Button variant="ghost" onClick={onCancel}>
                    Hủy
                </Button>
            </div>
        </div>
    );
}

/** Info box explaining how retention works */
interface InfoBoxProps {
    tierMax: number;
}

export function InfoBox({ tierMax }: InfoBoxProps) {
    return (
        <div className="p-4 rounded-lg bg-nebula-elevated border border-nebula-border">
            <h4 className="font-medium text-nebula-text mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">info</span>
                Cách hoạt động
            </h4>
            <ul className="text-sm text-nebula-text-secondary space-y-1">
                <li>• <strong>Inbox riêng</strong> được ưu tiên cao nhất</li>
                <li>• Nếu không có, dùng <strong>mặc định tài khoản</strong></li>
                <li>• Nếu không có, dùng <strong>mặc định gói</strong> ({tierMax} ngày)</li>
                <li>• Email hết hạn sẽ bị xóa tự động trong vòng 24 giờ</li>
            </ul>
        </div>
    );
}
