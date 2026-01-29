---
title: "Analytics Integration for Ephemera"
description: "Integrate PostHog or Plausible analytics for user behavior tracking"
status: pending
priority: P2
effort: 6h
branch: main
tags: [analytics, tracking, posthog, plausible, frontend, backend]
created: 2026-01-23
---

# Analytics Integration Plan

## Current State
- **Existing:** Microsoft Clarity already integrated (`@microsoft/clarity`)
- **Location:** `services/web/src/main.tsx` (line 14-18)
- **Config:** `VITE_CLARITY_PROJECT_ID` in `.env`

## Problem Statement
Need comprehensive analytics beyond heatmaps/session recordings:
- Product analytics (funnels, retention, user journeys)
- Custom event tracking (inbox created, email read, etc.)
- Backend event tracking (API usage, SMTP events)
- Feature flags capability (optional)

## Research Reports
- [PostHog Research](./research/posthog-research.md)
- [Plausible Research](./research/plausible-research.md)

---

## Approach 1: PostHog Cloud (RECOMMENDED)

### Overview
Full-featured product analytics with React hooks, backend SDK, and feature flags.

### Pros
| Advantage | Detail |
|-----------|--------|
| Free tier | 1M events/month free |
| Full-featured | Funnels, retention, paths, cohorts |
| React hooks | `usePostHog()`, `useFeatureFlagEnabled()` |
| Backend SDK | `posthog-node` for Fastify integration |
| Feature flags | Built-in, no extra cost |
| Autocapture | Automatic click/pageview tracking |
| Session recording | Included (like Clarity) |

### Cons
| Disadvantage | Detail |
|--------------|--------|
| Data offsite | Hosted on PostHog servers (EU option available) |
| Larger SDK | ~45KB vs Plausible's 1KB |
| Cookie-based | Requires consent banner for GDPR |
| Complexity | More setup than Plausible |

### Implementation Effort: ~4h

### Files to Modify
```
services/web/
├── .env.example          # Add VITE_POSTHOG_KEY, VITE_POSTHOG_HOST
├── src/main.tsx          # Add PostHogProvider
├── src/hooks/use-analytics.ts  # NEW: Analytics hook
└── package.json          # Add posthog-js

services/api/
├── .env.example          # Add POSTHOG_API_KEY
├── src/services/analytics-service.ts  # NEW: Backend tracking
└── package.json          # Add posthog-node
```

### Key Events to Track
| Event | Location | Type |
|-------|----------|------|
| `inbox_created` | Frontend + Backend | Custom |
| `email_read` | Frontend | Custom |
| `domain_added` | Backend | Custom |
| `user_signup` | Backend | Custom |
| `user_login` | Frontend | Custom |
| `api_request` | Backend | Custom |

---

## Approach 2: Plausible Cloud (Privacy-First)

### Overview
Lightweight, cookie-less analytics focused on privacy compliance.

### Pros
| Advantage | Detail |
|-----------|--------|
| No cookies | No consent banner needed |
| Tiny SDK | <1KB script |
| GDPR compliant | Out of the box |
| Simple | Minimal setup |
| Fast | No performance impact |
| Affordable | $9/mo for 10k pageviews |

### Cons
| Disadvantage | Detail |
|--------------|--------|
| Limited events | Basic custom events only |
| No funnels | No user journey analysis |
| No backend SDK | Manual HTTP calls required |
| No feature flags | Not included |
| No session replay | Must keep Clarity |
| Paid only | No free tier |

### Implementation Effort: ~2h

### Files to Modify
```
services/web/
├── .env.example          # Add VITE_PLAUSIBLE_DOMAIN
├── index.html            # Add script tag (simple option)
├── src/hooks/use-analytics.ts  # NEW: Analytics hook
└── package.json          # Add plausible-tracker (optional)
```

### Key Events to Track
| Event | Location | Type |
|-------|----------|------|
| `Signup` | Frontend | Goal |
| `Login` | Frontend | Goal |
| `InboxCreated` | Frontend | Goal |
| `EmailRead` | Frontend | Goal |

---

## Comparison Matrix

| Criteria | PostHog | Plausible |
|----------|---------|-----------|
| **Cost** | Free (1M events) | $9/mo |
| **Privacy** | Cookie-based | Cookie-less |
| **SDK Size** | ~45KB | <1KB |
| **Funnels** | ✅ Yes | ❌ No |
| **Retention** | ✅ Yes | ❌ No |
| **Backend SDK** | ✅ Native | ❌ HTTP only |
| **Feature Flags** | ✅ Yes | ❌ No |
| **Session Replay** | ✅ Yes | ❌ No (keep Clarity) |
| **Setup Time** | 4h | 2h |
| **GDPR** | Consent needed | Compliant by default |

---

## Recommendation: PostHog Cloud

### Rationale
1. **Free tier sufficient** - 1M events/month covers MVP stage
2. **Replace Clarity** - PostHog includes session recording
3. **Backend tracking** - Native Node.js SDK for SMTP/API events
4. **Future-proof** - Feature flags, A/B testing when needed
5. **React integration** - First-class hooks support

### Migration Path
1. Keep Clarity initially (parallel run)
2. Validate PostHog captures same insights
3. Remove Clarity after 2 weeks validation

---

## Phases

### Phase 1: Frontend Integration (2h)
- [ ] Install `posthog-js` package
- [ ] Add env variables
- [ ] Create `PostHogProvider` wrapper
- [ ] Create `useAnalytics` hook
- [ ] Add identify on login
- [ ] Test pageview tracking

### Phase 2: Custom Events (1.5h)
- [ ] Track `inbox_created`
- [ ] Track `email_read`
- [ ] Track `domain_added`
- [ ] Track key button clicks

### Phase 3: Backend Integration (1.5h)
- [ ] Install `posthog-node`
- [ ] Create analytics service
- [ ] Track API events
- [ ] Track SMTP events
- [ ] Graceful shutdown

### Phase 4: Validation (1h)
- [ ] Verify events in PostHog dashboard
- [ ] Create basic funnel
- [ ] Document event schema
- [ ] Remove Clarity (optional)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ad-blockers block PostHog | Medium | Use proxy endpoint |
| GDPR consent required | Medium | Add cookie consent banner |
| Performance impact | Low | Async loading, batching |
| Vendor lock-in | Low | Standard event schema |

---

## Success Criteria
- [ ] Pageviews tracked accurately
- [ ] Custom events firing correctly
- [ ] User identification working
- [ ] Backend events captured
- [ ] Dashboard showing funnels

---

## Unresolved Questions
1. Need cookie consent banner implementation?
2. Specific retention/funnel reports needed for MVP?
3. Keep Clarity alongside or replace completely?
4. Need PostHog proxy to bypass ad-blockers?
