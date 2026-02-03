/**
 * Overview Tab - Quick start guide, usage chart, rate limit status
 */
import { useState, useEffect } from 'react';
import { developerService, type UsageStats, type RateLimitStatus } from '../../services/developerService';

export function OverviewTab() {
    const [usage, setUsage] = useState<UsageStats | null>(null);
    const [rateLimits, setRateLimits] = useState<RateLimitStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const [usageData, limitsData] = await Promise.all([
                developerService.getUsage(startDate, endDate),
                developerService.getRateLimits(),
            ]);
            setUsage(usageData);
            setRateLimits(limitsData);
        } catch {
            // Use mock data for demo
            setUsage({
                period: { start: '2026-01-01', end: '2026-01-26' },
                totalCalls: 12847,
                successCalls: 12654,
                errorCalls: 193,
                bandwidth: { sent: 52428800, received: 157286400 },
                byEndpoint: [
                    { endpoint: '/api/emails', calls: 5420, avgLatency: 45 },
                    { endpoint: '/api/aliases', calls: 3210, avgLatency: 32 },
                    { endpoint: '/api/breach-monitor', calls: 2105, avgLatency: 120 },
                ],
                dailyData: Array.from({ length: 7 }, (_, i) => ({
                    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    calls: Math.floor(Math.random() * 500) + 300,
                    errors: Math.floor(Math.random() * 20),
                })),
            });
            setRateLimits({
                tier: 'GUARD',
                limits: { requestsPerMinute: 100, requestsPerDay: 10000, bandwidthPerMonth: 1073741824 },
                current: { requestsThisMinute: 12, requestsToday: 847, bandwidthThisMonth: 209715200 },
                resetAt: new Date(Date.now() + 60000).toISOString(),
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadingState />;
    }

    return (
        <div className="space-y-6">
            {/* Quick Start */}
            <QuickStartSection />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="api" label="Tổng requests" value={usage?.totalCalls.toLocaleString() || '0'} />
                <StatCard icon="check_circle" label="Thành công" value={usage?.successCalls.toLocaleString() || '0'} color="green" />
                <StatCard icon="error" label="Lỗi" value={usage?.errorCalls.toLocaleString() || '0'} color="red" />
                <StatCard icon="speed" label="Avg latency" value={`${Math.round((usage?.byEndpoint.reduce((a, b) => a + b.avgLatency, 0) || 0) / 3)}ms`} color="blue" />
            </div>

            {/* Usage Chart */}
            {usage && <UsageChart data={usage.dailyData} />}

            {/* Rate Limits */}
            {rateLimits && <RateLimitCard limits={rateLimits} />}

            {/* Top Endpoints */}
            {usage && usage.byEndpoint.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-white mb-4">Endpoints phổ biến</h2>
                    <div className="neo-glass rounded-xl divide-y divide-white/10">
                        {usage.byEndpoint.map((ep) => (
                            <div key={ep.endpoint} className="p-4 flex items-center justify-between">
                                <div>
                                    <code className="text-sm text-[var(--nebula-violet)]">{ep.endpoint}</code>
                                    <p className="text-xs text-[var(--nebula-text-muted)] mt-1">{ep.avgLatency}ms avg</p>
                                </div>
                                <span className="text-white font-medium">{ep.calls.toLocaleString()} calls</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function QuickStartSection() {
    const [copied, setCopied] = useState<string | null>(null);

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    const curlExample = `curl -X GET "https://api.ephemera.email/v1/emails" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;

    const jsExample = `import { Ephemera } from '@ephemera/sdk';

const client = new Ephemera({ apiKey: 'YOUR_API_KEY' });
const emails = await client.emails.list();`;

    return (
        <div className="neo-glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">🚀 Quick Start</h2>
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--nebula-text-secondary)]">cURL</span>
                        <button
                            onClick={() => copyToClipboard(curlExample, 'curl')}
                            className="text-xs text-[var(--nebula-violet)] hover:underline"
                        >
                            {copied === 'curl' ? '✓ Copied' : 'Copy'}
                        </button>
                    </div>
                    <pre className="bg-black/30 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">
                        {curlExample}
                    </pre>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--nebula-text-secondary)]">JavaScript</span>
                        <button
                            onClick={() => copyToClipboard(jsExample, 'js')}
                            className="text-xs text-[var(--nebula-violet)] hover:underline"
                        >
                            {copied === 'js' ? '✓ Copied' : 'Copy'}
                        </button>
                    </div>
                    <pre className="bg-black/30 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">
                        {jsExample}
                    </pre>
                </div>
            </div>
            <div className="flex gap-3 mt-4">
                <a href="/docs" className="text-sm text-[var(--nebula-violet)] hover:underline">📖 Xem tài liệu đầy đủ</a>
                <span className="text-white/20">|</span>
                <span className="text-sm text-slate-500">📦 Source: packages/sdk-js</span>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color = 'violet' }: { icon: string; label: string; value: string; color?: string }) {
    const colors: Record<string, string> = {
        violet: 'bg-[var(--nebula-violet)]/10 text-[var(--nebula-violet)]',
        green: 'bg-green-500/10 text-green-400',
        blue: 'bg-blue-500/10 text-blue-400',
        red: 'bg-red-500/10 text-red-400',
    };
    return (
        <div className="neo-glass rounded-xl p-4">
            <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined !text-[20px]">{icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-[var(--nebula-text-secondary)]">{label}</p>
        </div>
    );
}

function UsageChart({ data }: { data: Array<{ date: string; calls: number; errors: number }> }) {
    const maxCalls = Math.max(...data.map(d => d.calls), 1);

    return (
        <div className="neo-glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">API Calls (7 ngày)</h2>
            <div className="flex items-end gap-2 h-32">
                {data.map((day) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col justify-end h-24">
                            <div
                                className="w-full bg-[var(--nebula-violet)] rounded-t"
                                style={{ height: `${(day.calls / maxCalls) * 100}%` }}
                                title={`${day.calls} calls`}
                            />
                        </div>
                        <span className="text-[10px] text-[var(--nebula-text-muted)]">
                            {new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short' })}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RateLimitCard({ limits }: { limits: RateLimitStatus }) {
    const minutePercent = (limits.current.requestsThisMinute / limits.limits.requestsPerMinute) * 100;
    const dayPercent = (limits.current.requestsToday / limits.limits.requestsPerDay) * 100;
    const bandwidthPercent = (limits.current.bandwidthThisMonth / limits.limits.bandwidthPerMonth) * 100;

    const formatBytes = (bytes: number) => {
        if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(1)} KB`;
    };

    return (
        <div className="neo-glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Rate Limits</h2>
                <span className="px-3 py-1 bg-[var(--nebula-violet)]/20 text-[var(--nebula-violet)] rounded-full text-sm font-medium">
                    {limits.tier}
                </span>
            </div>
            <div className="space-y-4">
                <LimitBar label="Requests/phút" current={limits.current.requestsThisMinute} max={limits.limits.requestsPerMinute} percent={minutePercent} />
                <LimitBar label="Requests/ngày" current={limits.current.requestsToday} max={limits.limits.requestsPerDay} percent={dayPercent} />
                <LimitBar label="Bandwidth/tháng" current={formatBytes(limits.current.bandwidthThisMonth)} max={formatBytes(limits.limits.bandwidthPerMonth)} percent={bandwidthPercent} isString />
            </div>
        </div>
    );
}

function LimitBar({ label, current, max, percent, isString = false }: { label: string; current: number | string; max: number | string; percent: number; isString?: boolean }) {
    const getColor = () => {
        if (percent >= 90) return 'bg-red-500';
        if (percent >= 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--nebula-text-secondary)]">{label}</span>
                <span className="text-white">
                    {isString ? current : current.toLocaleString()} / {isString ? max : (max as number).toLocaleString()}
                </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getColor()}`} style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-6">
            <div className="neo-glass rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/4 mb-4"></div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="h-24 bg-white/10 rounded"></div>
                    <div className="h-24 bg-white/10 rounded"></div>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="neo-glass rounded-xl p-4 animate-pulse">
                        <div className="w-10 h-10 bg-white/10 rounded-lg mb-3"></div>
                        <div className="h-6 bg-white/10 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default OverviewTab;
