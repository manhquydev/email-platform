/**
 * Analytics Charts
 * Recharts-based visualizations for notification analytics
 */

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import type { DailyVolume, ChannelBreakdown, FailureReason, TemplatePerformance } from './analytics-hooks';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface DeliveryVolumeChartProps {
    data: DailyVolume[];
}

export function DeliveryVolumeChart({ data }: DeliveryVolumeChartProps) {
    // Format date for display
    const formattedData = data.map(d => ({
        ...d,
        dateLabel: new Date(d.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    }));

    return (
        <div className="bg-nebula-surface rounded-lg border border-nebula-border p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Khối lượng gửi theo ngày</h3>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={formattedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="dateLabel" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1f2937',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="delivered"
                        stackId="1"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.6}
                        name="Thành công"
                    />
                    <Area
                        type="monotone"
                        dataKey="failed"
                        stackId="1"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.6}
                        name="Thất bại"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

interface ChannelBreakdownChartProps {
    data: ChannelBreakdown[];
}

export function ChannelBreakdownChart({ data }: ChannelBreakdownChartProps) {
    const chartData = data.map(d => ({
        name: d.channel === 'TELEGRAM' ? 'Telegram' : d.channel === 'WEB' ? 'Web' : d.channel,
        value: d.count,
    }));

    return (
        <div className="bg-nebula-surface rounded-lg border border-nebula-border p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Phân bổ kênh gửi</h3>
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                        {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

interface FailureReasonsChartProps {
    data: FailureReason[];
}

export function FailureReasonsChart({ data }: FailureReasonsChartProps) {
    const chartData = data.slice(0, 5).map(d => ({
        name: d.reason.length > 20 ? d.reason.substring(0, 20) + '...' : d.reason,
        value: d.count,
    }));

    if (chartData.length === 0) {
        return (
            <div className="bg-nebula-surface rounded-lg border border-nebula-border p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Lý do thất bại</h3>
                <div className="h-[250px] flex items-center justify-center text-gray-500">
                    Không có lỗi trong khoảng thời gian này
                </div>
            </div>
        );
    }

    return (
        <div className="bg-nebula-surface rounded-lg border border-nebula-border p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Lý do thất bại</h3>
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                        {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                        ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

interface TemplatePerformanceTableProps {
    data: TemplatePerformance[];
}

export function TemplatePerformanceTable({ data }: TemplatePerformanceTableProps) {
    if (data.length === 0) {
        return (
            <div className="bg-nebula-surface rounded-lg border border-nebula-border p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Hiệu suất mẫu</h3>
                <div className="text-center py-8 text-gray-500">
                    Chưa có dữ liệu mẫu trong khoảng thời gian này
                </div>
            </div>
        );
    }

    return (
        <div className="bg-nebula-surface rounded-lg border border-nebula-border p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Hiệu suất mẫu</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">Tên mẫu</th>
                            <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Đã gửi</th>
                            <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Tỷ lệ gửi</th>
                            <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Tỷ lệ đọc</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(t => (
                            <tr key={t.templateId} className="border-b border-gray-100 dark:border-gray-800">
                                <td className="py-2 px-3 text-gray-900 dark:text-white">{t.templateName}</td>
                                <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{t.sent}</td>
                                <td className="py-2 px-3 text-right">
                                    <span className={t.deliveryRate >= 80 ? 'text-green-600' : 'text-yellow-600'}>
                                        {t.deliveryRate}%
                                    </span>
                                </td>
                                <td className="py-2 px-3 text-right text-blue-600">{t.acknowledgeRate}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
