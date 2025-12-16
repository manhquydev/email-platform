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

    const cards = [
        { label: "Tổng người dùng", value: stats.totalUsers, icon: "👥", color: "bg-blue-500" },
        { label: "Tên miền", value: `${stats.verifiedDomains}/${stats.totalDomains}`, icon: "🌐", color: "bg-green-500" },
        { label: "Hộp thư", value: stats.totalInboxes, icon: "📬", color: "bg-purple-500" },
        { label: "Tin nhắn", value: stats.totalMessages, icon: "✉️", color: "bg-indigo-500" },
        { label: "Quy tắc", value: stats.totalRules, icon: "🛡️", color: "bg-yellow-500" },
        { label: "Báo cáo mở", value: stats.openReports, icon: "🚨", color: "bg-red-500" },
    ];

    return (
        <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Tổng quan hệ thống</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {cards.map((card, i) => (
                    <div
                        key={i}
                        className="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                                {card.icon}
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-text-main">{card.value}</div>
                        <div className="text-sm text-muted">{card.label}</div>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-4 bg-surface border border-border rounded-xl">
                <h3 className="font-semibold mb-2">💡 Gợi ý nhanh</h3>
                <ul className="text-sm text-muted space-y-1">
                    <li>• Kiểm tra <strong>Báo cáo vi phạm</strong> để xử lý các vấn đề spam/abuse</li>
                    <li>• Xem <strong>Nhật ký hoạt động</strong> để theo dõi các thao tác trong hệ thống</li>
                    <li>• Quản lý <strong>Người dùng</strong> để cập nhật quyền và trạng thái tài khoản</li>
                </ul>
            </div>
        </div>
    );
}
