/**
 * Subscription Stats Cards component
 * Displays current plan, daily email limit, domain usage, storage usage
 */
import { GlassCard } from "../../ui/GlassCard";

interface UserProfile {
    tier: string;
    subscriptionEndsAt?: string | null;
    usage?: { domains: number; inboxes: number; storage: number };
    limits?: { domains: number; inboxes: number; storageGB: number; dailyEmails: number };
}

interface SubscriptionStatsCardsProps {
    profile: UserProfile | null;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function SubscriptionStatsCards({ profile }: SubscriptionStatsCardsProps) {
    // Calculate usage percentages
    const domainUsage = profile?.usage?.domains || 0;
    const domainLimit = profile?.limits?.domains || 1;
    const domainLimitDisplay = domainLimit === -1 ? "Vô hạn" : domainLimit;
    const domainPercent = domainLimit === -1 ? 0 : Math.min(100, (domainUsage / domainLimit) * 100);

    const storageUsage = profile?.usage?.storage || 0;
    const storageLimitGB = profile?.limits?.storageGB || 0.1;
    const storageLimitBytes = storageLimitGB * 1024 * 1024 * 1024;
    const storagePercent = storageLimitGB === -1 ? 0 : Math.min(100, (storageUsage / storageLimitBytes) * 100);

    return (
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Current Plan */}
            <GlassCard className="p-6 flex flex-col justify-between h-full gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-6xl text-semantic-text-main">diamond</span>
                </div>
                <div>
                    <p className="text-semantic-text-muted text-sm font-medium uppercase tracking-wider">Gói hiện tại</p>
                    <p className="text-3xl font-bold mt-1 text-semantic-text-main">{profile?.tier === 'FREE' ? 'MIỄN PHÍ' : profile?.tier || 'MIỄN PHÍ'}</p>
                </div>
                <div className="w-full bg-semantic-bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-semantic-accent h-full rounded-full w-[40%]"></div>
                </div>
                <p className="text-xs text-semantic-text-muted">
                    {profile?.subscriptionEndsAt
                        ? `Gia hạn vào ${new Date(profile.subscriptionEndsAt).toLocaleDateString("vi-VN")}`
                        : 'Miễn phí mãi mãi'}
                </p>
            </GlassCard>

            {/* Daily Email Limit */}
            <GlassCard className="p-6 flex flex-col justify-between h-full gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-6xl text-semantic-text-main">mail</span>
                </div>
                <div>
                    <p className="text-semantic-text-muted text-sm font-medium uppercase tracking-wider">Email/Ngày</p>
                    <p className="text-3xl font-bold mt-1 text-semantic-success">
                        {profile?.limits?.dailyEmails === -1 ? 'Vô hạn' : profile?.limits?.dailyEmails || 5}
                    </p>
                </div>
                <p className="text-sm text-semantic-text-muted font-medium flex items-center gap-1">
                    Giới hạn gửi email mỗi ngày
                </p>
            </GlassCard>

            {/* Domain Usage */}
            <GlassCard className="p-6 flex flex-col justify-between h-full gap-2">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-semantic-text-muted text-sm font-medium uppercase tracking-wider">Tên miền riêng</p>
                        <p className="text-2xl font-bold mt-1 text-semantic-text-main">{domainUsage} <span className="text-lg text-semantic-text-muted font-normal">/ {domainLimitDisplay}</span></p>
                    </div>
                    <span className="material-symbols-outlined text-semantic-text-muted">dns</span>
                </div>
                <div className="w-full bg-semantic-bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-semantic-success h-full rounded-full" style={{ width: `${domainPercent}%` }}></div>
                </div>
            </GlassCard>

            {/* Storage Usage */}
            <GlassCard className="p-6 flex flex-col justify-between h-full gap-2">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-semantic-text-muted text-sm font-medium uppercase tracking-wider">Dung lượng</p>
                        <p className="text-2xl font-bold mt-1 text-semantic-text-main">{Math.round((storageUsage / storageLimitBytes) * 100)}% <span className="text-lg text-semantic-text-muted font-normal">({formatBytes(storageUsage)})</span></p>
                    </div>
                    <span className="material-symbols-outlined text-semantic-text-muted">cloud_done</span>
                </div>
                <div className="w-full bg-semantic-bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-semantic-warning h-full rounded-full" style={{ width: `${storagePercent}%` }}></div>
                </div>
            </GlassCard>
        </div>
    );
}
