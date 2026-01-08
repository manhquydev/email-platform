import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import { getFriendlyErrorMessage } from "../../utils/errorMapping";
import toast from "react-hot-toast";
import {
    GlassCard, SectionHeader, StatusBadge, PremiumSelect,
    EmptyState, LoadingSpinner
} from "./AdminUIComponents";

interface AbuseReport {
    id: string;
    messageId: string | null;
    reporter: string | null;
    reason: string;
    status: "OPEN" | "REVIEWING" | "CLOSED";
    createdAt: string;
    message?: {
        subject: string;
        fromAddress: string;
        inbox: {
            localPart: string;
            domain: { name: string };
        };
    } | null;
}

export function AdminReports({ token }: { token: string }) {
    const [reports, setReports] = useState<AbuseReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("");
    const [updating, setUpdating] = useState<string | null>(null);

    const loadReports = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api<{ data: AbuseReport[] }>("/abuse/reports", { token });
            setReports(res.data);
        } catch {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { loadReports(); }, [loadReports]);

    const handleStatusChange = async (reportId: string, newStatus: string) => {
        setUpdating(reportId);
        try {
            await api(`/abuse/reports/${reportId}`, { method: "PATCH", token, body: { status: newStatus } });
            toast.success("Đã cập nhật");
            await loadReports();
        } catch {
            toast.error(getFriendlyErrorMessage((err as Error).message));
        } finally {
            setUpdating(null);
        }
    };

    const filteredReports = filterStatus ? reports.filter((r) => r.status === filterStatus) : reports;

    const getStatusVariant = (status: string): "danger" | "warning" | "success" => {
        switch (status) {
            case "OPEN": return "danger";
            case "REVIEWING": return "warning";
            case "CLOSED": return "success";
            default: return "warning";
        }
    };

    const getStatusLabel = (status: string): string => {
        switch (status) {
            case "OPEN": return "Mở";
            case "REVIEWING": return "Đang xem";
            case "CLOSED": return "Đã đóng";
            default: return status;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <SectionHeader
                title="Báo cáo vi phạm"
                subtitle="Quản lý các báo cáo từ người dùng"
                action={
                    <PremiumSelect
                        value={filterStatus}
                        onChange={setFilterStatus}
                        options={[
                            { value: "", label: "Tất cả" },
                            { value: "OPEN", label: "Mở" },
                            { value: "REVIEWING", label: "Đang xem" },
                            { value: "CLOSED", label: "Đã đóng" },
                        ]}
                        className="w-40"
                    />
                }
            />

            {loading ? (
                <LoadingSpinner />
            ) : filteredReports.length === 0 ? (
                <GlassCard hover={false}>
                    <EmptyState title="Không có báo cáo nào" description="Chưa có báo cáo vi phạm nào được gửi" />
                </GlassCard>
            ) : (
                <div className="space-y-4">
                    {filteredReports.map((report) => (
                        <GlassCard key={report.id} hover={false} padding="p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-3">
                                        <StatusBadge status={getStatusLabel(report.status)} variant={getStatusVariant(report.status)} />
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {new Date(report.createdAt).toLocaleString("vi-VN")}
                                        </span>
                                    </div>

                                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{report.reason}</p>

                                    {report.message && (
                                        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mt-3 space-y-1.5">
                                            <div>
                                                <span className="text-slate-500 dark:text-slate-500">Email:</span>{" "}
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {report.message.inbox.localPart}@{report.message.inbox.domain.name}
                                                </span>
                                            </div>
                                            <div><span className="text-slate-500 dark:text-slate-500">Từ:</span> {report.message.fromAddress}</div>
                                            <div><span className="text-slate-500 dark:text-slate-500">Chủ đề:</span> {report.message.subject || "(trống)"}</div>
                                        </div>
                                    )}

                                    {report.reporter && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                                            Người báo cáo: <span className="text-slate-700 dark:text-slate-300">{report.reporter}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="w-32">
                                    <PremiumSelect
                                        value={report.status}
                                        onChange={(val) => handleStatusChange(report.id, val)}
                                        disabled={updating === report.id}
                                        options={[
                                            { value: "OPEN", label: "Mở" },
                                            { value: "REVIEWING", label: "Đang xem" },
                                            { value: "CLOSED", label: "Đã đóng" },
                                        ]}
                                    />
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
}
