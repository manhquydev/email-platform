/**
 * Analytics KPI Cards
 * Displays summary statistics with trend indicators
 */

import type { AnalyticsSummary } from './analytics-hooks';

interface KPICardProps {
    title: string;
    value: string | number;
    trend?: number;
    icon: React.ReactNode;
    color?: 'default' | 'green' | 'blue' | 'red';
}

function KPICard({ title, value, trend, icon, color = 'default' }: KPICardProps) {
    const colorClasses = {
        default: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
        green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    };

    const iconColors = {
        default: 'text-gray-600 dark:text-gray-400',
        green: 'text-green-600 dark:text-green-400',
        blue: 'text-blue-600 dark:text-blue-400',
        red: 'text-red-600 dark:text-red-400',
    };

    return (
        <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
            <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl ${iconColors[color]}`}>{icon}</span>
                {trend !== undefined && trend !== 0 && (
                    <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
        </div>
    );
}

interface AnalyticsKPICardsProps {
    summary: AnalyticsSummary;
}

export function AnalyticsKPICards({ summary }: AnalyticsKPICardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <KPICard
                title="Tổng đã gửi"
                value={summary.totalSent.toLocaleString()}
                trend={summary.trend.sent}
                icon={<span>📤</span>}
            />
            <KPICard
                title="Tỷ lệ gửi thành công"
                value={`${summary.deliveryRate}%`}
                trend={summary.trend.rate}
                icon={<span>✅</span>}
                color="green"
            />
            <KPICard
                title="Tỷ lệ xác nhận đọc"
                value={`${summary.acknowledgeRate}%`}
                icon={<span>👁️</span>}
                color="blue"
            />
        </div>
    );
}
