# Phase 2: Notification History & Logs UI

## Context Links
- [Parent Plan](./plan.md)
- [UI Research](./research/researcher-02-notification-ui-patterns.md)
- [Current Page](../../services/web/src/pages/admin/AdminNotificationPage.tsx)
- [Phase 1 - API](./phase-01-database-schema-api.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 6h
- **Description:** Build notification history table with faceted filters, status badges, and delivery details drawer.

## Key Insights
- Use TanStack Table for high-density data handling
- Faceted filters in popover (not cluttering main UI)
- Drawer for full notification details + delivery logs
- Status badges color-coded (Green=Sent, Red=Failed, Yellow=Pending)

## Requirements

### Functional
- Paginated notification history table
- Filter by: status, type, channel, date range
- Search by title/recipient
- View delivery details (per channel status)
- Resend failed notifications
- Export logs (CSV)

### Non-Functional
- Load < 500ms for 1000 records
- Skeleton loading states
- Dark mode support
- Mobile responsive (stacked cards view)

## Architecture

```
AdminNotificationPage (Tabs)
├── Tab: Compose (existing form)
├── Tab: History (NEW)
│   ├── FilterBar (popover filters)
│   ├── NotificationTable (TanStack Table)
│   └── NotificationDrawer (details + logs)
├── Tab: Templates (Phase 3)
└── Tab: Analytics (Phase 6)
```

## Related Code Files

### Modify
- `services/web/src/pages/admin/AdminNotificationPage.tsx` - Add tabs

### Create
- `services/web/src/pages/admin/admin-notification-modules/notification-history-tab.tsx`
- `services/web/src/pages/admin/admin-notification-modules/notification-history-table.tsx`
- `services/web/src/pages/admin/admin-notification-modules/notification-history-filters.tsx`
- `services/web/src/pages/admin/admin-notification-modules/notification-detail-drawer.tsx`
- `services/web/src/pages/admin/admin-notification-modules/notification-history-hooks.ts`

## Implementation Steps

### 1. Install Dependencies
```bash
cd services/web && pnpm add @tanstack/react-table date-fns
```

### 2. Add Tab Navigation
```tsx
// AdminNotificationPage.tsx
const tabs = [
  { id: 'compose', label: 'Gửi Thông Báo' },
  { id: 'history', label: 'Lịch Sử' },
  { id: 'templates', label: 'Mẫu' },
  { id: 'analytics', label: 'Thống Kê' },
];
```

### 3. Create History Table Columns
```tsx
const columns: ColumnDef<NotificationLog>[] = [
  { accessorKey: 'createdAt', header: 'Thời gian' },
  { accessorKey: 'title', header: 'Tiêu đề' },
  { accessorKey: 'type', header: 'Loại', cell: TypeBadge },
  { accessorKey: 'targetMode', header: 'Đối tượng' },
  { accessorKey: 'deliveryStatus', header: 'Trạng thái', cell: StatusBadge },
  { id: 'actions', cell: ActionsMenu },
];
```

### 4. Create Filter Components
```tsx
interface Filters {
  status: DeliveryStatus[];
  type: NotificationType[];
  channel: NotificationChannel[];
  dateRange: { from: Date; to: Date };
  search: string;
}
```

### 5. Create Detail Drawer
- Show full notification content
- List delivery logs per channel with timestamps
- Resend button for failed channels
- Copy notification ID

### 6. Add API Hooks
```tsx
// notification-history-hooks.ts
export function useNotificationHistory(filters: Filters, page: number);
export function useNotificationDetail(id: string);
export function useResendNotification();
```

## Todo List
- [ ] Install TanStack Table dependency
- [ ] Add tab navigation to AdminNotificationPage
- [ ] Create NotificationHistoryTab component
- [ ] Create NotificationHistoryTable with columns
- [ ] Create NotificationHistoryFilters popover
- [ ] Create NotificationDetailDrawer
- [ ] Create useNotificationHistory hook
- [ ] Add status/type badge components
- [ ] Implement resend functionality
- [ ] Add CSV export button
- [ ] Add skeleton loading states
- [ ] Test mobile responsive layout
- [ ] Test dark mode

## Success Criteria
- [ ] Table loads and paginates correctly
- [ ] All filters work (status, type, date, search)
- [ ] Drawer shows delivery details per channel
- [ ] Resend works for failed notifications
- [ ] Mobile view shows stacked cards
- [ ] Dark mode renders correctly

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Large dataset performance | Virtual scrolling, pagination |
| Complex filter state | Use URL params for shareable links |

## Security Considerations
- Sanitize search input
- Rate limit resend endpoint

## Next Steps
- Phase 3: Templates tab uses similar table pattern
