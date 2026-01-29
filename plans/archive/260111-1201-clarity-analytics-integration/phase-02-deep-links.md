# Phase 2: Deep Links to Clarity Dashboard

**Effort:** 1.5h | **Priority:** P2 | **Dependencies:** Phase 1 (for user identification)

## Objective

Add "View in Clarity" buttons that link admins directly to filtered views in the Clarity dashboard.

## Clarity URL Patterns

Base URL: `https://clarity.microsoft.com/projects/uzly2516v2`

| View | URL Pattern |
|------|-------------|
| All Recordings | `/recordings` |
| Filter by User ID | `/recordings?filter=custom:userId:USER_ID` |
| Filter by Custom Tag | `/recordings?filter=custom:user_role:admin` |
| Heatmaps for URL | `/heatmaps?url=ENCODED_URL` |
| Dashboard | `/dashboard` |

## Implementation Steps

### Step 1: Create Clarity Link Utility (20 min)

**File:** `services/web/src/utils/clarityLinks.ts` (NEW)

```typescript
const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || "uzly2516v2";
const BASE_URL = `https://clarity.microsoft.com/projects/${CLARITY_PROJECT_ID}`;

export const clarityLinks = {
  dashboard: () => `${BASE_URL}/dashboard`,

  recordings: (filters?: { userId?: string; tag?: string }) => {
    let url = `${BASE_URL}/recordings`;
    if (filters?.userId) {
      url += `?filter=custom:userId:${encodeURIComponent(filters.userId)}`;
    } else if (filters?.tag) {
      url += `?filter=custom:${encodeURIComponent(filters.tag)}`;
    }
    return url;
  },

  heatmaps: (pageUrl?: string) => {
    let url = `${BASE_URL}/heatmaps`;
    if (pageUrl) {
      url += `?url=${encodeURIComponent(pageUrl)}`;
    }
    return url;
  },
};
```

### Step 2: Add Button Component (20 min)

**File:** `services/web/src/components/admin/ClarityLinkButton.tsx` (NEW)

```typescript
interface ClarityLinkButtonProps {
  type: "dashboard" | "recordings" | "heatmaps";
  userId?: string;
  pageUrl?: string;
  label?: string;
}

export function ClarityLinkButton({ type, userId, pageUrl, label }: ClarityLinkButtonProps) {
  const getUrl = () => {
    switch (type) {
      case "dashboard": return clarityLinks.dashboard();
      case "recordings": return clarityLinks.recordings({ userId });
      case "heatmaps": return clarityLinks.heatmaps(pageUrl);
    }
  };

  return (
    <a
      href={getUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-nebula-secondary inline-flex items-center gap-2 text-sm"
    >
      <span className="material-symbols-outlined text-[18px]">analytics</span>
      {label || "View in Clarity"}
    </a>
  );
}
```

### Step 3: Add to AnalyticsPage (30 min)

**File:** `services/web/src/pages/admin/AnalyticsPage.tsx`

Add header action buttons:
```tsx
<div className="flex items-center gap-4">
  <ClarityLinkButton type="dashboard" label="Clarity Dashboard" />
  <ClarityLinkButton type="recordings" label="All Recordings" />
  <ClarityLinkButton
    type="heatmaps"
    pageUrl={`${window.location.origin}/inbox`}
    label="Inbox Heatmap"
  />
</div>
```

Add per-session recording links in sessions table:
```tsx
// In TableRow for sessions:
<TableCell>
  <a
    href={clarityLinks.recordings({ tag: `sessionId:${session.sessionId}` })}
    target="_blank"
    className="text-primary hover:underline text-sm"
  >
    View Recording
  </a>
</TableCell>
```

### Step 4: Add to AdminDashboard (20 min)

**File:** `services/web/src/components/admin/AdminDashboard.tsx`

Add quick link card:
```tsx
<GlassCard className="p-5">
  <h3 className="text-base font-semibold mb-4">Clarity Analytics</h3>
  <div className="flex flex-wrap gap-2">
    <ClarityLinkButton type="dashboard" label="Dashboard" />
    <ClarityLinkButton type="recordings" label="Recordings" />
    <ClarityLinkButton type="heatmaps" label="Heatmaps" />
  </div>
</GlassCard>
```

## Todo List

- [ ] Create `clarityLinks.ts` utility with URL builders
- [ ] Create `ClarityLinkButton.tsx` component
- [ ] Add Clarity links header to AnalyticsPage
- [ ] Add per-session recording links in sessions table
- [ ] Add Clarity quick links card to AdminDashboard
- [ ] Test all deep links open correct Clarity views

## Success Criteria

- [ ] "View in Clarity" buttons visible on admin pages
- [ ] Clicking opens Clarity dashboard in new tab
- [ ] Session-specific links filter to correct recordings
- [ ] Heatmap links target correct page URLs

## Notes

- Clarity uses `custom:key:value` filter syntax
- Session filtering requires Phase 1 identify/setTag implementation
- Links work without authentication if user is logged into Clarity
