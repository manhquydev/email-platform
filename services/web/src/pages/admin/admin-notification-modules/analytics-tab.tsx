/**
 * Analytics Tab
 * Main analytics dashboard component with date range selector
 */

import { useState } from 'react';
import { useNotificationAnalytics } from './analytics-hooks';
import { AnalyticsKPICards } from './analytics-kpi-cards';
import {
    DeliveryVolumeChart,
    ChannelBreakdownChart,
    FailureReasonsChart,
    TemplatePerformanceTable,
} from './analytics-charts';

type DateRange = 7 | 30;

export function AnalyticsTab() {
    const [days, setDays] = useState<DateRange>(7);
    const { data, loading, error, refetch } = useNotificationAnalytics(days);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Đang tải dữ liệu...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-red-500 mb-4">❌ {error}</div>
                <button
                    onClick={refetch}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12 text-gray-500">
                Không có dữ liệu phân tích
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Thống kê thông báo
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setDays(7)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            days === 7
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        7 ngày
                    </button>
                    <button
                        onClick={() => setDays(30)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            days === 30
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        30 ngày
                    </button>
                    <button
                        onClick={refetch}
                        className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        title="Làm mới"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <AnalyticsKPICards summary={data.summary} />

            {/* Delivery Volume Chart */}
            <DeliveryVolumeChart data={data.dailyVolume} />

            {/* Channel & Failure Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChannelBreakdownChart data={data.channelBreakdown} />
                <FailureReasonsChart data={data.failureReasons} />
            </div>

            {/* Template Performance Table */}
            <TemplatePerformanceTable data={data.templatePerformance} />
        </div>
    );
}
