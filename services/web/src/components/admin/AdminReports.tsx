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
            toast.error("Không thể tải danh sách báo cáo");
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
            toast.success("Đã cập nhật trạng thái");
            await loadReports();
        } catch (err) {
            toast.error("Lỗi: " + (err as Error).message);
        } finally {
            setUpdating(null);
        }
    };

    const filteredReports = filterStatus
        ? reports.filter((r) => r.status === filterStatus)
        : reports;

    const statusColors: Record<string, string> = {
        OPEN: "bg-red-100 text-red-700",
        REVIEWING: "bg-yellow-100 text-yellow-700",
        CLOSED: "bg-green-100 text-green-700",
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Báo cáo vi phạm</h2>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="text-sm"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="OPEN">Mở</option>
                    <option value="REVIEWING">Đang xem xét</option>
                    <option value="CLOSED">Đã đóng</option>
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReports.map((report) => (
                        <div
                            key={report.id}
                            className="bg-surface border border-border rounded-xl p-4 hover:shadow-sm transition-shadow"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${statusColors[report.status]}`}>
                                            {report.status === "OPEN" ? "MỞ" : report.status === "REVIEWING" ? "ĐANG XEM" : "ĐÃ ĐÓNG"}
                                        </span>
                                        <span className="text-xs text-muted">
                                            {new Date(report.createdAt).toLocaleString("vi-VN")}
                                        </span>
                                    </div>

                                    <div className="text-sm mb-2">
                                        <strong>Lý do:</strong> {report.reason}
                                    </div>

                                    {report.message && (
                                        <div className="text-xs text-muted bg-bg rounded p-2 mt-2">
                                            <div><strong>Email:</strong> {report.message.inbox.localPart}@{report.message.inbox.domain.name}</div>
                                            <div><strong>Từ:</strong> {report.message.fromAddress}</div>
                                            <div><strong>Chủ đề:</strong> {report.message.subject || "(không có)"}</div>
                                        </div>
                                    )}

                                    {report.reporter && (
                                        <div className="text-xs text-muted mt-2">
                                            Người báo cáo: {report.reporter}
                                        </div>
                                    )}
                                </div>

                                <div className="shrink-0">
                                    <select
                                        value={report.status}
                                        onChange={(e) => handleStatusChange(report.id, e.target.value)}
                                        disabled={updating === report.id}
                                        className="text-xs py-1 px-2"
                                    >
                                        <option value="OPEN">Mở</option>
                                        <option value="REVIEWING">Đang xem xét</option>
                                        <option value="CLOSED">Đã đóng</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredReports.length === 0 && (
                        <div className="text-center py-12 text-muted">
                            {filterStatus ? "Không có báo cáo với trạng thái này" : "Không có báo cáo vi phạm nào"}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
