/**
 * UI components for AdminLogs
 */
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";
import { GlassCard, PremiumButton, PremiumSelect } from "../AdminUIComponents";
import { type AuditLog, ACTION_LABELS, AVAILABLE_ACTIONS } from "./admin-logs-utils";

/** Filters panel */
interface LogsFiltersProps {
    filterAction: string;
    onFilterActionChange: (val: string) => void;
    startDate: string;
    onStartDateChange: (val: string) => void;
    endDate: string;
    onEndDateChange: (val: string) => void;
    onClearFilters: () => void;
}

export function LogsFilters({
    filterAction,
    onFilterActionChange,
    startDate,
    onStartDateChange,
    endDate,
    onEndDateChange,
    onClearFilters
}: LogsFiltersProps) {
    const hasFilters = filterAction || startDate || endDate;

    return (
        <GlassCard className="mb-6" padding="p-4" hover={false}>
            <div className="flex flex-wrap items-end gap-4">
                <div>
                    <label className="block text-xs text-nebula-text-muted mb-1.5 font-medium">Hành động</label>
                    <PremiumSelect
                        value={filterAction}
                        onChange={onFilterActionChange}
                        options={[
                            { value: "", label: "Tất cả" },
                            ...AVAILABLE_ACTIONS.map(a => ({ value: a, label: ACTION_LABELS[a] || a }))
                        ]}
                        className="w-48"
                    />
                </div>
                <div>
                    <label className="block text-xs text-nebula-text-muted mb-1.5 font-medium">Từ ngày</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => onStartDateChange(e.target.value)}
                        className="px-4 py-2.5 text-sm w-40 rounded-xl border border-nebula-border bg-nebula-elevated text-nebula-text"
                    />
                </div>
                <div>
                    <label className="block text-xs text-nebula-text-muted mb-1.5 font-medium">Đến ngày</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => onEndDateChange(e.target.value)}
                        className="px-4 py-2.5 text-sm w-40 rounded-xl border border-nebula-border bg-nebula-elevated text-nebula-text"
                    />
                </div>
                {hasFilters && (
                    <PremiumButton variant="ghost" size="sm" onClick={onClearFilters}>
                        Xóa bộ lọc
                    </PremiumButton>
                )}
            </div>
        </GlassCard>
    );
}

/** Single log entry row */
export function LogEntry({ log }: { log: AuditLog }) {
    return (
        <div className="flex items-start gap-4 p-4 hover:bg-nebula-elevated transition-colors">
            <div className="w-2.5 h-2.5 rounded-full bg-primary mt-2 shrink-0 ring-4 ring-primary/20" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-nebula-text">
                        {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <span className="text-xs text-nebula-text-muted">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: vi })}
                    </span>
                    <span className="text-xs text-nebula-text-muted">
                        ({format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })})
                    </span>
                </div>
                {log.user && (
                    <div className="text-xs text-nebula-text-secondary">
                        {log.user.email}
                    </div>
                )}
                {log.meta && Object.keys(log.meta).length > 0 && (
                    <div className="text-xs text-nebula-text-muted bg-nebula-elevated rounded-lg p-2.5 mt-2 font-mono overflow-x-auto">
                        {JSON.stringify(log.meta)}
                    </div>
                )}
            </div>
        </div>
    );
}

/** Header actions (export, refresh) */
interface HeaderActionsProps {
    onExport: () => void;
    onRefresh: () => void;
}

export function HeaderActions({ onExport, onRefresh }: HeaderActionsProps) {
    return (
        <div className="flex items-center gap-2">
            <PremiumButton variant="secondary" onClick={onExport}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Xuất CSV
            </PremiumButton>
            <PremiumButton variant="secondary" onClick={onRefresh}>
                ↻ Làm mới
            </PremiumButton>
        </div>
    );
}
