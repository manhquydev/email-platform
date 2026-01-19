/**
 * AdminSystem - System monitoring and configuration
 * Modules extracted to admin-system-modules/
 */
import { LoadingSpinner, SectionHeader } from "./AdminUIComponents";
import {
    useAdminSystemData,
    ResourceChart,
    ServerInfoCard,
    RetentionPolicyCard,
    InboxLimitsCard,
    QuickActionsCard
} from "./admin-system-modules";

export function AdminSystem({ token }: { token: string }) {
    const {
        stats,
        loading,
        history,
        saving,
        retentionDays,
        inboxLimitMode,
        inboxMaxEmails,
        inboxMaxDays,
        setLocalLimitMode,
        loadData,
        handleUpdateSetting,
        handleSaveInboxLimits,
        handleCleanup,
        handleCheckDb
    } = useAdminSystemData(token);

    if (loading && !stats) return <LoadingSpinner />;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <SectionHeader
                title="Hệ thống"
                subtitle="Theo dõi tài nguyên và cấu hình chính sách"
            />

            {/* Resource Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResourceChart
                    title="Tải CPU (%)"
                    data={history}
                    dataKey="cpu"
                    color="#8b5cf6"
                    gradientId="colorCpu"
                />
                <ResourceChart
                    title="Sử dụng Memory (%)"
                    data={history}
                    dataKey="mem"
                    color="#ec4899"
                    gradientId="colorMem"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Server Status & Settings */}
                <div className="lg:col-span-2 space-y-6">
                    <ServerInfoCard stats={stats} />
                    <RetentionPolicyCard
                        retentionDays={retentionDays}
                        saving={saving}
                        onSave={handleUpdateSetting}
                    />
                    <InboxLimitsCard
                        inboxLimitMode={inboxLimitMode}
                        inboxMaxEmails={inboxMaxEmails}
                        inboxMaxDays={inboxMaxDays}
                        saving={saving}
                        onModeChange={setLocalLimitMode}
                        onSave={handleSaveInboxLimits}
                    />
                </div>

                {/* Quick Actions */}
                <QuickActionsCard
                    saving={saving}
                    onCleanup={handleCleanup}
                    onCheckDb={handleCheckDb}
                    onRefresh={loadData}
                />
            </div>
        </div>
    );
}
