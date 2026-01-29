# Phase 03: Billing Snapshot Cron Job

## Context Links
- [Plan Overview](./plan.md)
- [Codebase Analysis](./research/researcher-02-codebase-analysis.md)
- Usage Service: `services/api/src/services/hosting-provider.service.ts` (getUsage method)
- Prisma Schema: `ProviderUsageLog` model exists but not populated

## Overview
| Field | Value |
|-------|-------|
| Priority | P2 - Important |
| Status | Pending |
| Effort | 2 days |
| Owner | TBD |

Implement nightly cron job to snapshot provider usage metrics into `ProviderUsageLog` for historical billing data. Current `getUsage()` calculates on-the-fly which doesn't scale.

## Key Insights
- `ProviderUsageLog` schema exists in Prisma but never populated
- Current `getUsage()` runs `count()` queries per request - O(n) per tenant
- Billing requires historical snapshots, not just real-time
- WHMCS billing cycle: monthly, needs daily/hourly granularity for proration

## Requirements

### Functional
- FR1: Nightly job snapshots usage for all active providers
- FR2: Store: tenant count, mailbox count, message count, storage used
- FR3: Admin can view historical usage per provider
- FR4: Support billing period aggregation (daily/monthly)

### Non-Functional
- NFR1: Job runs during off-peak hours (2-4 AM UTC)
- NFR2: Job completes within 30 minutes for 1000 providers
- NFR3: Idempotent - re-running same day doesn't duplicate

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cron Scheduler                           │
│                   (node-cron / Bull)                         │
└────────────────────────┬────────────────────────────────────┘
                         │ 2:00 AM UTC daily
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              UsageSnapshotJob                                │
│  - Iterate active providers                                  │
│  - Calculate metrics per provider                            │
│  - Batch insert to ProviderUsageLog                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   ProviderUsageLog                           │
│  providerId, period, tenants, mailboxes, messages, storage  │
└─────────────────────────────────────────────────────────────┘
```

## Related Code Files

### Files to CREATE
| File | Purpose |
|------|---------|
| `services/api/src/jobs/usage-snapshot.job.ts` | Main job logic |
| `services/api/src/jobs/index.ts` | Job scheduler setup |

### Files to MODIFY
| File | Change |
|------|--------|
| `services/api/src/server.ts` | Initialize job scheduler |
| `services/api/src/services/hosting-provider.service.ts` | Add batch usage method |
| `services/api/src/routes/admin-providers.ts` | Add usage history endpoint |
| `services/api/prisma/schema.prisma` | Verify ProviderUsageLog model |

## Implementation Steps

### Backend (Day 1)

1. **Verify/Update ProviderUsageLog model**
```prisma
model ProviderUsageLog {
  id          String   @id @default(cuid())
  providerId  String
  period      DateTime // Start of day (00:00:00 UTC)
  tenantCount Int
  mailboxCount Int
  messageCount Int
  storageBytes BigInt   @default(0)
  createdAt   DateTime @default(now())

  provider    HostingProvider @relation(fields: [providerId], references: [id])

  @@unique([providerId, period])
  @@index([providerId, period])
}
```

2. **Create usage-snapshot.job.ts**
```typescript
// services/api/src/jobs/usage-snapshot.job.ts
import { prisma } from '../lib/prisma';
import { HostingProviderService } from '../services/hosting-provider.service';

export class UsageSnapshotJob {
  /**
   * Run daily usage snapshot for all active providers
   */
  static async run(): Promise<{ processed: number; errors: string[] }> {
    const period = new Date();
    period.setUTCHours(0, 0, 0, 0); // Start of day

    const providers = await prisma.hostingProvider.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
    });

    const errors: string[] = [];
    let processed = 0;

    for (const provider of providers) {
      try {
        await this.snapshotProvider(provider.id, period);
        processed++;
      } catch (error) {
        const msg = `Provider ${provider.id}: ${error instanceof Error ? error.message : 'Unknown'}`;
        errors.push(msg);
        console.error(`[UsageSnapshot] ${msg}`);
      }
    }

    console.log(`[UsageSnapshot] Completed: ${processed}/${providers.length}`);
    return { processed, errors };
  }

  /**
   * Snapshot single provider (idempotent via upsert)
   */
  private static async snapshotProvider(providerId: string, period: Date) {
    const usage = await HostingProviderService.getUsage(providerId);

    await prisma.providerUsageLog.upsert({
      where: {
        providerId_period: { providerId, period },
      },
      create: {
        providerId,
        period,
        tenantCount: usage.summary.tenants,
        mailboxCount: usage.summary.mailboxes,
        messageCount: usage.summary.messages,
        storageBytes: BigInt(0), // TODO: Calculate actual storage
      },
      update: {
        tenantCount: usage.summary.tenants,
        mailboxCount: usage.summary.mailboxes,
        messageCount: usage.summary.messages,
      },
    });
  }

  /**
   * Get usage history for provider
   */
  static async getHistory(providerId: string, options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}) {
    const { limit = 30 } = options;
    const now = new Date();
    const startDate = options.startDate || new Date(now.setDate(now.getDate() - 30));
    const endDate = options.endDate || new Date();

    return prisma.providerUsageLog.findMany({
      where: {
        providerId,
        period: { gte: startDate, lte: endDate },
      },
      orderBy: { period: 'desc' },
      take: limit,
    });
  }
}
```

3. **Create job scheduler (jobs/index.ts)**
```typescript
// services/api/src/jobs/index.ts
import cron from 'node-cron';
import { UsageSnapshotJob } from './usage-snapshot.job';
import { ProviderSsoService } from '../services/provider-sso.service';

export function initializeJobs() {
  // Usage snapshot: 2:00 AM UTC daily
  cron.schedule('0 2 * * *', async () => {
    console.log('[Jobs] Running usage snapshot...');
    await UsageSnapshotJob.run();
  });

  // SSO token cleanup: Every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Jobs] Cleaning expired SSO tokens...');
    await ProviderSsoService.cleanupExpired();
  });

  console.log('[Jobs] Scheduled jobs initialized');
}
```

4. **Initialize in server.ts**
```typescript
import { initializeJobs } from './jobs';

// After server.listen()
if (process.env.ENABLE_JOBS !== 'false') {
  initializeJobs();
}
```

### Admin API & UI (Day 2)

5. **Add usage history endpoint**
```typescript
// In admin-providers.ts
app.get('/v1/admin/providers/:id/usage/history', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { days = 30 } = req.query as { days?: number };

  const history = await UsageSnapshotJob.getHistory(id, {
    limit: days,
  });

  return { history };
});
```

6. **Add manual trigger endpoint (admin only)**
```typescript
app.post('/v1/admin/jobs/usage-snapshot', async (req, reply) => {
  const result = await UsageSnapshotJob.run();
  return result;
});
```

7. **Update provider-detail-drawer.tsx** to show usage chart
```typescript
// Add usage history chart using recharts
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

const UsageChart = ({ data }) => (
  <LineChart width={400} height={200} data={data}>
    <XAxis dataKey="period" tickFormatter={formatDate} />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="mailboxCount" stroke="#8884d8" />
    <Line type="monotone" dataKey="tenantCount" stroke="#82ca9d" />
  </LineChart>
);
```

## Todo List
- [ ] Verify ProviderUsageLog model in Prisma schema
- [ ] Run migration if schema changes needed
- [ ] Create usage-snapshot.job.ts
- [ ] Create jobs/index.ts scheduler
- [ ] Initialize jobs in server.ts
- [ ] Add usage history endpoint to admin-providers.ts
- [ ] Add manual trigger endpoint
- [ ] Update provider-detail-drawer with usage chart
- [ ] Add node-cron to dependencies
- [ ] Write tests for snapshot job
- [ ] Test idempotency (run twice, verify no duplicates)

## Success Criteria
- [ ] Cron job runs at 2 AM UTC daily
- [ ] Usage logs stored in ProviderUsageLog table
- [ ] Admin can view 30-day usage history
- [ ] Job is idempotent (upsert behavior)
- [ ] Job completes in < 30 min for 1000 providers

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Job timeout | Medium | Batch processing, chunked queries |
| Database load | Medium | Run during off-peak, use read replica |
| Missing data | Low | Upsert ensures no gaps |
| Storage calculation | Medium | Phase 2: implement actual storage metrics |

## Security Considerations
- Job runs internally, no external trigger
- Admin-only manual trigger endpoint
- No sensitive data in usage logs
- Rate limit manual trigger (1/hour)

## Next Steps
After completion:
1. Monitor job execution in logs
2. Verify data in ProviderUsageLog table
3. Proceed to Phase 04: Pilot Partner Onboarding
4. Future: Add storage calculation (attachment sizes)
