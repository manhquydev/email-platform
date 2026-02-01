import React from 'react';
import { useSystemAnalytics, QueueMetrics } from '../../hooks/useAnalytics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  ArrowPathIcon,
  ServerStackIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  CpuChipIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

function StatCard({ title, value, icon: Icon, color = "blue", subtext }: any) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-green-500/10 text-green-500",
    purple: "bg-purple-500/10 text-purple-500",
    red: "bg-red-500/10 text-red-500",
    orange: "bg-orange-500/10 text-orange-500",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline mt-2">
            <h3 className="text-2xl font-bold text-foreground">{value}</h3>
            {subtext && <span className="ml-2 text-sm text-muted-foreground">{subtext}</span>}
          </div>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function QueueStatus({ name, metrics }: { name: string, metrics: QueueMetrics }) {
  const total = metrics.waiting + metrics.active + metrics.completed + metrics.failed + metrics.delayed;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ServerStackIcon className="w-5 h-5 text-muted-foreground" />
          {name}
        </h3>
        <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">Total: {total}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex justify-between items-center p-2 bg-background/50 rounded">
          <span className="text-muted-foreground">Active</span>
          <span className="font-mono text-green-500 font-bold">{metrics.active}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-background/50 rounded">
          <span className="text-muted-foreground">Waiting</span>
          <span className="font-mono text-yellow-500 font-bold">{metrics.waiting}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-background/50 rounded">
          <span className="text-muted-foreground">Delayed</span>
          <span className="font-mono text-blue-500 font-bold">{metrics.delayed}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-background/50 rounded">
          <span className="text-muted-foreground">Failed</span>
          <span className="font-mono text-red-500 font-bold">{metrics.failed}</span>
        </div>
      </div>

      {/* Mini Progress Bar */}
      <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden flex">
        <div style={{ width: `${(metrics.active / Math.max(total, 1)) * 100}%` }} className="bg-green-500" />
        <div style={{ width: `${(metrics.waiting / Math.max(total, 1)) * 100}%` }} className="bg-yellow-500" />
        <div style={{ width: `${(metrics.failed / Math.max(total, 1)) * 100}%` }} className="bg-red-500" />
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const { data, isLoading, isError, refetch } = useSystemAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <ExclamationTriangleIcon className="w-12 h-12 mb-4 text-red-500" />
        <p>Failed to load analytics data</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">System Analytics</h1>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground"
          title="Refresh Data"
        >
          <ArrowPathIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={data.counts.users}
          icon={CpuChipIcon}
          color="blue"
        />
        <StatCard
          title="Total Emails"
          value={data.counts.totalEmails}
          icon={EnvelopeIcon}
          color="purple"
        />
        <StatCard
          title="Outbound Sent"
          value={data.counts.sentEmails}
          icon={PaperAirplaneIcon}
          color="green"
        />
        <StatCard
          title="Queue Health"
          value={`${data.queues.outbound.failed + data.queues.emailIngest.failed}`}
          subtext="Failed Jobs"
          icon={ExclamationTriangleIcon}
          color={data.queues.outbound.failed > 0 ? "red" : "green"}
        />
      </div>

      {/* Queue Status Grid */}
      <h2 className="text-lg font-semibold text-foreground mt-8">Message Queues</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QueueStatus name="Email Ingest" metrics={data.queues.emailIngest} />
        <QueueStatus name="Outbound Delivery" metrics={data.queues.outbound} />
        <QueueStatus name="Webhooks" metrics={data.queues.webhooks} />
      </div>

      {/* Message Volume Chart */}
      <div className="bg-card border border-border rounded-xl p-6 mt-6">
        <h3 className="font-semibold text-foreground mb-6">Message Volume (7 Days)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timeseries}>
              <defs>
                <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} />
              <XAxis
                dataKey="date"
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="received"
                name="Received"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#colorReceived)"
              />
              <Area
                type="monotone"
                dataKey="sent"
                name="Sent"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorSent)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
