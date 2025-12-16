import { useState, useEffect, useCallback } from "react";
import { api } from "../../utils/api";
import toast from "react-hot-toast";

interface Stats {
    totalUsers: number;
    totalDomains: number;
    verifiedDomains: number;
    totalInboxes: number;
    totalMessages: number;
    totalRules: number;
    openReports: number;
}

interface StatCard {
    label: string;
    value: number | string;
    subLabel?: string;
    color: string;
}

export function AdminDashboard({ token }: { token: string }) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    const loadStats = useCallback(async () => {
        try {
            const res = await api<{ stats: Stats }>("/admin/stats", { token });
            setStats(res.stats);
        } catch (err) {
            toast.error("Không thể tải thống kê");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!stats) {
        return <div className="text-muted text-center p-8">Không có dữ liệu</div>;
    }

    const cards: StatCard[] = [
        { label: "Người dùng", value: stats.totalUsers, color: "border-l-blue-500" },
        { label: "Tên miền", value: stats.verifiedDomains, subLabel: `/ ${stats.totalDomains} tổng`, color: "border-l-green-500" },
        { label: "Hộp thư", value: stats.totalInboxes, color: "border-l-purple-500" },
        { label: "Email", value: stats.totalMessages, color: "border-l-indigo-500" },
        { label: "Quy tắc", value: stats.totalRules, color: "border-l-amber-500" },
        { label: "Báo cáo mở", value: stats.openReports, color: "border-l-red-500" },
    ];

    return (
        <div className="p-6 max-w-5xl">
            <div className="mb-6">
                <h1 className="text-xl font-semibold">Tổng quan</h1>
                <p className="text-sm text-muted mt-1">Thống kê hệ thống</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {cards.map((card, i) => (
                    <div
                        key={i}
                        className={`bg-surface border border-border border-l-4 ${card.color} rounded-lg p-4`}
                    >
                        <div className="text-2xl font-bold text-text-main">
                            {card.value}
                            {card.subLabel && <span className="text-sm font-normal text-muted">{card.subLabel}</span>}
                        </div>
                        <div className="text-xs text-muted mt-1">{card.label}</div>
                    </div>
                ))}
            </div>

            <div className="mt-8 bg-surface border border-border rounded-lg p-5">
                <h3 className="text-sm font-medium mb-3">Hướng dẫn nhanh</h3>
                <ul className="text-sm text-muted space-y-2">
                    <li>• <strong>Người dùng:</strong> Quản lý tài khoản và phân quyền</li>
                    <li>• <strong>Quy tắc bảo vệ:</strong> Thiết lập chặn/cho phép email</li>
                    <li>• <strong>Báo cáo:</strong> Xử lý các vấn đề vi phạm</li>
                    <li>• <strong>Nhật ký:</strong> Theo dõi hoạt động hệ thống</li>
                </ul>
            </div>
        </div>
    );
}
