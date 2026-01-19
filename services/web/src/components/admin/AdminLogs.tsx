/**
 * AdminLogs - Audit log viewer for admin panel
 * Modules extracted to admin-logs-modules/
 */
import toast from "react-hot-toast";
import {
    GlassCard, SectionHeader, EmptyState, LoadingSpinner, Pagination
} from "./AdminUIComponents";
import {
    useAdminLogs,
    LogsFilters,
    LogEntry,
    HeaderActions
} from "./admin-logs-modules";

export function AdminLogs({ token }: { token: string }) {
    const {
        logs,
        loading,
        filterAction,
        setFilterAction,
        page,
        setPage,
        total,
        totalPages,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        loadLogs,
        handleExport,
        clearFilters
    } = useAdminLogs({ token });

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <SectionHeader
                title="Nhật ký hoạt động"
                subtitle={`Theo dõi các thao tác trong hệ thống${total > 0 ? ` (${total} tổng)` : ""}`}
                action={
                    <HeaderActions
                        onExport={handleExport}
                        onRefresh={() => { loadLogs(); toast.success("Đã làm mới"); }}
                    />
                }
            />

            {/* Filters */}
            <LogsFilters
                filterAction={filterAction}
                onFilterActionChange={setFilterAction}
                startDate={startDate}
                onStartDateChange={setStartDate}
                endDate={endDate}
                onEndDateChange={setEndDate}
                onClearFilters={clearFilters}
            />

            {loading ? (
                <LoadingSpinner />
            ) : logs.length === 0 ? (
                <GlassCard hover={false}>
                    <EmptyState title="Không có nhật ký nào" description="Thử thay đổi bộ lọc" />
                </GlassCard>
            ) : (
                <GlassCard padding="p-0" hover={false}>
                    <div className="max-h-[600px] overflow-y-auto divide-y divide-nebula-border">
                        {logs.map((log) => (
                            <LogEntry key={log.id} log={log} />
                        ))}
                    </div>
                </GlassCard>
            )}

            {totalPages > 1 && (
                <Pagination currentPage={page + 1} totalPages={totalPages} onPageChange={(p) => setPage(p - 1)} />
            )}
        </div>
    );
}
