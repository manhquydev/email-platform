# Phase 3: Clarity Data Export API Integration

**Effort:** 2.5h | **Priority:** P2 | **Dependencies:** Clarity JWT token from dashboard

## Objective

Fetch live insights from Clarity API via backend proxy and display in AdminDashboard.

## API Reference

**Endpoint:** `GET https://www.clarity.ms/export-data/api/v1/project-live-insights`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Response (sample):**
```json
{
  "activeUsers": 42,
  "totalSessions": 1234,
  "topPages": [
    { "url": "/inbox", "views": 500 },
    { "url": "/dashboard", "views": 300 }
  ],
  "avgScrollDepth": 68.5,
  "avgEngagementTime": 245
}
```

## Implementation Steps

### Step 1: Add Environment Variable (10 min)

**File:** `.env.example` and deployment configs

```env
CLARITY_API_TOKEN=your_jwt_token_here
CLARITY_PROJECT_ID=uzly2516v2
```

Generate token: Clarity Dashboard > Settings > Data Export > Generate Token

### Step 2: Create Backend Proxy Route (45 min)

**File:** `services/api/src/routes/admin/analytics.ts`

Add new endpoint:

```typescript
import { env } from "../../lib/env";

// Cache for rate limit protection
let clarityCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /admin/analytics/clarity/live-insights
 * Proxy to Clarity Data Export API
 */
app.get("/admin/analytics/clarity/live-insights", { preHandler: app.requireAdmin }, async (request, reply) => {
  // Check cache first
  if (clarityCache && Date.now() - clarityCache.timestamp < CACHE_TTL) {
    return { ...clarityCache.data, cached: true };
  }

  const token = env.CLARITY_API_TOKEN;
  if (!token) {
    return reply.status(503).send({
      error: "Clarity API not configured",
      message: "CLARITY_API_TOKEN environment variable not set"
    });
  }

  try {
    const response = await fetch(
      "https://www.clarity.ms/export-data/api/v1/project-live-insights",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Clarity API error:", response.status, errorText);
      return reply.status(response.status).send({
        error: "Clarity API error",
        status: response.status
      });
    }

    const data = await response.json();

    // Update cache
    clarityCache = { data, timestamp: Date.now() };

    return { ...data, cached: false };
  } catch (error) {
    console.error("Clarity API fetch error:", error);
    return reply.status(500).send({ error: "Failed to fetch Clarity data" });
  }
});
```

### Step 3: Add Type Definitions (15 min)

**File:** `services/web/src/types/clarity.ts` (NEW)

```typescript
export interface ClarityLiveInsights {
  activeUsers: number;
  totalSessions: number;
  topPages: Array<{ url: string; views: number }>;
  avgScrollDepth: number;
  avgEngagementTime: number;
  cached: boolean;
}
```

### Step 4: Create Clarity Insights Widget (45 min)

**File:** `services/web/src/components/admin/ClarityInsightsWidget.tsx` (NEW)

```typescript
import { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { ClarityLiveInsights } from "../../types/clarity";

export function ClarityInsightsWidget() {
  const { token } = useAuth();
  const [insights, setInsights] = useState<ClarityLiveInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const data = await api<ClarityLiveInsights>(
          "/admin/analytics/clarity/live-insights",
          { token }
        );
        setInsights(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, [token]);

  if (loading) return <div className="animate-pulse h-32 bg-white/5 rounded-xl" />;
  if (error) return <div className="text-sm text-danger">{error}</div>;
  if (!insights) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <InsightCard label="Active Users" value={insights.activeUsers} icon="person" />
      <InsightCard label="Sessions (24h)" value={insights.totalSessions} icon="timeline" />
      <InsightCard label="Avg Scroll" value={`${insights.avgScrollDepth.toFixed(0)}%`} icon="swap_vert" />
      <InsightCard label="Avg Time" value={formatSeconds(insights.avgEngagementTime)} icon="schedule" />
    </div>
  );
}

function InsightCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="glass-card-elevated p-4 text-center">
      <span className="material-symbols-outlined text-2xl text-primary/60 mb-2">{icon}</span>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-nebula-text-muted">{label}</p>
    </div>
  );
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}
```

### Step 5: Integrate into AdminDashboard (25 min)

**File:** `services/web/src/components/admin/AdminDashboard.tsx`

Add import and component:

```tsx
import { ClarityInsightsWidget } from "./ClarityInsightsWidget";
import { ClarityLinkButton } from "./ClarityLinkButton";

// In the grid, add new section after revenue stats:
<div className="col-span-12">
  <GlassCard className="p-6" hover={false}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold text-nebula-text">
        Clarity Live Insights
      </h3>
      <ClarityLinkButton type="dashboard" label="Open Dashboard" />
    </div>
    <ClarityInsightsWidget />
  </GlassCard>
</div>
```

### Step 6: Add Environment Validation (10 min)

**File:** `services/api/src/lib/env.ts`

Add optional Clarity config:

```typescript
// In env schema (optional, not required for startup)
CLARITY_API_TOKEN: z.string().optional(),
CLARITY_PROJECT_ID: z.string().default("uzly2516v2"),
```

## Todo List

- [ ] Add CLARITY_API_TOKEN to .env.example
- [ ] Generate JWT token from Clarity dashboard
- [ ] Create `/admin/analytics/clarity/live-insights` endpoint
- [ ] Add 5-min cache layer to prevent rate limits
- [ ] Create ClarityLiveInsights TypeScript interface
- [ ] Create ClarityInsightsWidget component
- [ ] Add widget to AdminDashboard grid
- [ ] Add env validation for CLARITY_API_TOKEN
- [ ] Test API proxy returns valid data
- [ ] Test widget displays metrics correctly

## Success Criteria

- [ ] Backend proxy fetches Clarity data without CORS errors
- [ ] Widget shows active users, sessions, scroll depth, engagement time
- [ ] Cache prevents excessive API calls (5-min TTL)
- [ ] Graceful error handling when API token not configured
- [ ] "Open Dashboard" button links to Clarity

## Unresolved Questions

- Clarity API rate limits not documented; 5-min cache is conservative estimate
- Historical data requires Power BI integration (out of scope)
- Recording share links cannot be generated via API (manual only)

## Rollback Plan

If Clarity API unavailable or token issues:
1. Widget shows "Clarity not configured" message
2. Deep links (Phase 2) still work
3. Event tracking (Phase 1) still works
4. No impact on existing analytics functionality
