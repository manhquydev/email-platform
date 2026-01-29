# Phase 6: Analytics Dashboard

## Context Links
- [Parent Plan](./plan.md)
- [UI Research](./research/researcher-02-notification-ui-patterns.md)
- [Phase 1 - Logs API](./phase-01-database-schema-api.md)

## Overview
- **Priority:** P3
- **Status:** pending
- **Effort:** 4h
- **Description:** Build analytics dashboard with KPI cards, delivery charts, and per-template performance metrics.

## Key Insights
- KPI cards: Delivery rate, Total sent, Engagement (acknowledges)
- Line chart: Delivery volume over time (success vs failed)
- Donut chart: Failure reasons breakdown
- Per-template stats table

## Requirements

### Functional
- KPI cards with trend indicators
- Delivery volume chart (7d/30d toggle)
- Channel breakdown (Web vs Telegram)
- Failure reasons chart
- Template performance table
- Date range selector

### Non-Functional
- Charts render < 500ms
- Data aggregated server-side
- Cached stats (5 min TTL)

## Architecture

```
AnalyticsTab
├── DateRangeSelector
├── KPICards
│   ├── TotalSent
│   ├── DeliveryRate
│   └── AcknowledgeRate
├── DeliveryChart (line/area)
├── ChannelBreakdown (donut)
├── FailureReasons (donut)
└── TemplatePerformanceTable
```

## Related Code Files

### Modify
- `services/api/src/routes/notifications.ts` - Add analytics endpoint

### Create
- `services/web/src/pages/admin/admin-notification-modules/analytics-tab.tsx`
- `services/web/src/pages/admin/admin-notification-modules/analytics-kpi-cards.tsx`
- `services/web/src/pages/admin/admin-notification-modules/analytics-charts.tsx`
- `services/web/src/pages/admin/admin-notification-modules/analytics-hooks.ts`
- `services/api/src/services/notification-analytics-service.ts`

## Implementation Steps

### 1. Install Recharts
```bash
cd services/web && pnpm add recharts
```

### 2. Analytics API Endpoint
```typescript
// GET /admin/notifications/analytics
interface AnalyticsResponse {
  summary: {
    totalSent: number;
    deliveryRate: number;    // %
    acknowledgeRate: number; // %
    trend: { sent: number; rate: number }; // vs previous period
  };
  dailyVolume: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
  channelBreakdown: Array<{
    channel: string;
    count: number;
    rate: number;
  }>;
  failureReasons: Array<{
    reason: string;
    count: number;
  }>;
  templatePerformance: Array<{
    templateId: string;
    templateName: string;
    sent: number;
    deliveryRate: number;
    acknowledgeRate: number;
  }>;
}
```

### 3. Analytics Service
```typescript
// notification-analytics-service.ts
export async function getNotificationAnalytics(
  dateRange: { from: Date; to: Date }
) {
  const [summary, daily, channels, failures, templates] = await Promise.all([
    getSummaryStats(dateRange),
    getDailyVolume(dateRange),
    getChannelBreakdown(dateRange),
    getFailureReasons(dateRange),
    getTemplatePerformance(dateRange),
  ]);

  return { summary, dailyVolume: daily, channelBreakdown: channels, failureReasons: failures, templatePerformance: templates };
}
```

### 4. KPI Cards Component
```tsx
<div className="grid grid-cols-3 gap-4">
  <KPICard
    title="Đã gửi"
    value={analytics.summary.totalSent}
    trend={analytics.summary.trend.sent}
    icon={<SendIcon />}
  />
  <KPICard
    title="Tỷ lệ gửi thành công"
    value={`${analytics.summary.deliveryRate}%`}
    trend={analytics.summary.trend.rate}
    icon={<CheckIcon />}
    color="green"
  />
  <KPICard
    title="Đã xác nhận"
    value={`${analytics.summary.acknowledgeRate}%`}
    icon={<EyeIcon />}
    color="blue"
  />
</div>
```

### 5. Delivery Volume Chart
```tsx
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={analytics.dailyVolume}>
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Area type="monotone" dataKey="delivered" stackId="1" fill="#22c55e" />
    <Area type="monotone" dataKey="failed" stackId="1" fill="#ef4444" />
  </AreaChart>
</ResponsiveContainer>
```

### 6. Channel & Failure Charts
```tsx
<div className="grid grid-cols-2 gap-4">
  <PieChart data={analytics.channelBreakdown} title="Kênh gửi" />
  <PieChart data={analytics.failureReasons} title="Lý do thất bại" />
</div>
```

### 7. Template Performance Table
- Columns: Template Name, Sent, Delivery Rate, Acknowledge Rate
- Sortable columns
- Click to view template details

## Todo List
- [ ] Install Recharts
- [ ] Create analytics service
- [ ] Add analytics API endpoint
- [ ] Create AnalyticsTab component
- [ ] Create KPICards component
- [ ] Create DeliveryVolumeChart
- [ ] Create ChannelBreakdownChart
- [ ] Create FailureReasonsChart
- [ ] Create TemplatePerformanceTable
- [ ] Add date range selector
- [ ] Add 7d/30d toggle
- [ ] Add loading states
- [ ] Cache analytics data (5 min)
- [ ] Test with real data

## Success Criteria
- [ ] KPI cards show correct stats
- [ ] Charts render with date range filter
- [ ] Trend arrows show comparison to previous period
- [ ] Template table sorts correctly
- [ ] Data refreshes on date change
- [ ] Loading states display properly

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Slow queries on large datasets | Pre-aggregate, add indexes |
| Chart performance | Limit data points to 30 |

## Security Considerations
- Admin-only access
- No PII in analytics (only aggregate counts)

## Next Steps
- Future: Export analytics as PDF/CSV
- Future: Email weekly digest to admins
