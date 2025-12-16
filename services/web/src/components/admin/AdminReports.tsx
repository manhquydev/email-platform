import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import toast from "react-hot-toast";

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
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [updating, setUpdating] = useState<string | null>(null);

    const loadReports = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api<{ data: AbuseReport[] }>("/abuse/reports", { token });
            setReports(res.data);
        } catch (err) {
            toast.error("Không thể tải danh sách");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleStatusChange = async (reportId: string, newStatus: string) => {
        setUpdating(reportId);
        try {
            await api(`/abuse/reports/${reportId}`, {
                method: "PATCH",
                token,
                body: { status: newStatus },
            });
            toast.success("Đã cập nhật");
            await loadReports();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setUpdating(null);
        }
    };

    const filteredReports = filterStatus
        ? reports.filter((r) => r.status === filterStatus)
        : reports;

    const statusConfig: Record<string, { label: string; style: string }> = {
        OPEN: { label: "Mở", style: "bg-red-50 text-red-600" },
        REVIEWING: { label: "Đang xem", style: "bg-amber-50 text-amber-600" },
        CLOSED: { label: "Đã đóng", style: "bg-green-50 text-green-600" },
    };

    return (
        <div className="p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold">Báo cáo vi phạm</h1>
                    <p className="text-sm text-muted mt-1">Quản lý các báo cáo từ người dùng</p>
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="text-sm w-40"
                >
                    <option value="">Tất cả</option>
                    <option value="OPEN">Mở</option>
                    <option value="REVIEWING">Đang xem</option>
                    <option value="CLOSED">Đã đóng</option>
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredReports.map((report) => (
                        <div
                            key={report.id}
                            className="bg-surface border border-border rounded-lg p-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${statusConfig[report.status].style}`}>
                                            {statusConfig[report.status].label}
                                        </span>
                                        <span className="text-xs text-muted">
                                            {new Date(report.createdAt).toLocaleString("vi-VN")}
                                        </span>
                                    </div>

                                    <p className="text-sm mb-2">{report.reason}</p>

                                    {report.message && (
                                        <div className="text-xs text-muted bg-bg rounded p-3 mt-2 space-y-1">
                                            <div>Email: <span className="font-medium">{report.message.inbox.localPart}@{report.message.inbox.domain.name}</span></div>
                                            <div>Từ: {report.message.fromAddress}</div>
                                            <div>Chủ đề: {report.message.subject || "(trống)"}</div>
                                        </div>
                                    )}

                                    {report.reporter && (
                                        <div className="text-xs text-muted mt-2">
                                            Người báo cáo: {report.reporter}
                                        </div>
                                    )}
                                </div>

                                <select
                                    value={report.status}
                                    onChange={(e) => handleStatusChange(report.id, e.target.value)}
                                    disabled={updating === report.id}
                                    className="text-xs py-1.5 px-2 w-28"
                                >
                                    <option value="OPEN">Mở</option>
                                    <option value="REVIEWING">Đang xem</option>
                                    <option value="CLOSED">Đã đóng</option>
                                </select>
                            </div>
                        </div>
                    ))}

                    {filteredReports.length === 0 && (
                        <div className="text-center py-12 text-muted text-sm">
                            Không có báo cáo nào
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
