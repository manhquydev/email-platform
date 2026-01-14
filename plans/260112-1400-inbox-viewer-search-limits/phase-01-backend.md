# Phase 01: Backend System Settings

**Status:** Pending
**Priority:** High

## Context

- SystemSetting model already exists in Prisma schema
- Admin routes for settings already exist at `/admin/system/settings`
- Need to add helper to fetch settings with defaults

## Implementation Steps

1. Create `services/api/src/utils/system-settings.ts` - Helper to get settings with defaults
2. Add default settings seed (optional, settings created on first access)
3. Update `public-inbox.ts` to use settings (Phase 03)

## Code Changes

### File: `services/api/src/utils/system-settings.ts`

```typescript
// System settings helper with defaults
import { prisma } from "../lib/prisma";

export type InboxLimitMode = "none" | "count" | "days" | "both";

export interface PublicInboxSettings {
  limitMode: InboxLimitMode;
  maxEmails: number;
  maxDays: number;
}

const DEFAULTS: Record<string, string> = {
  PUBLIC_INBOX_LIMIT_MODE: "none",
  PUBLIC_INBOX_MAX_EMAILS: "100",
  PUBLIC_INBOX_MAX_DAYS: "7",
};

export async function getSystemSetting(key: string): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value ?? DEFAULTS[key] ?? "";
}

export async function getPublicInboxSettings(): Promise<PublicInboxSettings> {
  const [mode, maxEmails, maxDays] = await Promise.all([
    getSystemSetting("PUBLIC_INBOX_LIMIT_MODE"),
    getSystemSetting("PUBLIC_INBOX_MAX_EMAILS"),
    getSystemSetting("PUBLIC_INBOX_MAX_DAYS"),
  ]);

  return {
    limitMode: (mode as InboxLimitMode) || "none",
    maxEmails: parseInt(maxEmails, 10) || 100,
    maxDays: parseInt(maxDays, 10) || 7,
  };
}
```

## Success Criteria

- [ ] Helper function created
- [ ] Can fetch settings with defaults
- [ ] No database migration needed (uses existing SystemSetting)
