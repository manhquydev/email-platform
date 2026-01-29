# Phase 4: Scheduled Notifications

## Context Links
- [Parent Plan](./plan.md)
- [Phase 1 - API](./phase-01-database-schema-api.md)
- [Phase 3 - Templates](./phase-03-template-management.md)

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 5h
- **Description:** Add scheduling capability with date/time picker, scheduled list view, and backend cron execution.

## Key Insights
- Use node-cron for reliable scheduling
- Store scheduled time in UTC, display in local timezone
- Allow cancel/edit until 5 minutes before execution
- Show countdown timer for upcoming notifications

## Requirements

### Functional
- Schedule picker (date + time)
- List of scheduled notifications
- Cancel scheduled notification
- Edit scheduled (if not executed)
- Timezone display (server UTC, user local)

### Non-Functional
- Cron checks every minute
- Graceful handling if server restarts
- Logging for scheduled executions

## Architecture

```
Compose Form
└── ScheduleToggle
    └── DateTimePicker
         ↓
    ScheduledNotification (DB)
         ↓
    CronJob (every minute)
         ↓
    NotificationService.send()
         ↓
    NotificationLog
```

## Related Code Files

### Modify
- `services/api/src/routes/notifications.ts` - Add schedule endpoints
- Compose form UI - Add schedule toggle

### Create
- `services/api/src/services/scheduled-notification-service.ts`
- `services/api/src/jobs/notification-scheduler-cron.ts`
- `services/web/src/pages/admin/admin-notification-modules/schedule-picker.tsx`
- `services/web/src/pages/admin/admin-notification-modules/scheduled-list.tsx`

## Implementation Steps

### 1. Install node-cron
```bash
cd services/api && pnpm add node-cron && pnpm add -D @types/node-cron
```

### 2. Create Cron Job
```typescript
// notification-scheduler-cron.ts
import cron from 'node-cron';

export function startNotificationScheduler() {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const pending = await prisma.scheduledNotification.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now },
      },
    });

    for (const scheduled of pending) {
      try {
        await sendNotification(scheduled);
        await prisma.scheduledNotification.update({
          where: { id: scheduled.id },
          data: { status: 'EXECUTED', executedAt: now },
        });
      } catch (error) {
        await prisma.scheduledNotification.update({
          where: { id: scheduled.id },
          data: { status: 'FAILED' },
        });
      }
    }
  });
}
```

### 3. API Endpoints
```typescript
// POST /admin/notifications/schedule - Create scheduled
// GET /admin/notifications/scheduled - List pending
// PUT /admin/notifications/scheduled/:id - Update
// DELETE /admin/notifications/scheduled/:id - Cancel
```

### 4. Schedule Picker UI
```tsx
<SchedulePicker>
  <Toggle label="Lên lịch gửi" />
  {isScheduled && (
    <div className="flex gap-2">
      <DatePicker value={date} onChange={setDate} />
      <TimePicker value={time} onChange={setTime} />
      <TimezoneInfo>UTC+7</TimezoneInfo>
    </div>
  )}
</SchedulePicker>
```

### 5. Scheduled List View
- Table: Title, Target, Scheduled Time, Countdown, Actions
- Status badges: Pending (blue), Executed (green), Cancelled (gray)
- Edit button disabled if < 5 min to execution

### 6. Start Cron on Server Boot
```typescript
// In main server file
import { startNotificationScheduler } from './jobs/notification-scheduler-cron';
startNotificationScheduler();
```

## Todo List
- [ ] Install node-cron
- [ ] Create ScheduledNotification service
- [ ] Create cron job file
- [ ] Add schedule endpoints to routes
- [ ] Start cron on server boot
- [ ] Create SchedulePicker component
- [ ] Add schedule toggle to compose form
- [ ] Create ScheduledList table
- [ ] Add cancel/edit functionality
- [ ] Display countdown timer
- [ ] Handle timezone conversion
- [ ] Test cron execution
- [ ] Add logging for scheduled sends

## Success Criteria
- [ ] Can schedule notification for future time
- [ ] Cron executes at scheduled time
- [ ] Can cancel before execution
- [ ] Edit updates scheduled item
- [ ] Executed notifications appear in history
- [ ] Failed executions logged with status

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Missed executions on restart | Query for past-due on boot |
| Timezone confusion | Always store UTC, display local |

## Security Considerations
- Admin-only scheduling
- Validate scheduledFor is future time
- Rate limit scheduled items per admin

## Next Steps
- Phase 5: Scheduled Telegram notifications use inline keyboards
