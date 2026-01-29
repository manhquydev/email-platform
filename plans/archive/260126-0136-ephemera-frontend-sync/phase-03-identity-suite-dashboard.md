# Phase 3: Identity Suite Dashboard

## Context Links

- Backend Routes: `services/api/src/routes/identity-bundles.ts`
- Alias Service: `services/api/src/services/alias.service.ts`
- Breach Monitor: `services/api/src/services/breach-monitor.service.ts`
- Privacy Score: `services/api/src/services/privacy-score.service.ts`
- Settings Page: `services/web/src/pages/Settings.tsx`

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 |
| Status | Pending |
| Effort | 12h |

Full dashboard for Identity Suite features: Aliases, Breach Monitoring, Privacy Score.

## Key Insights

- Aliases are permanent inboxes with forwarding
- Breach monitoring requires GUARD tier+
- Privacy score aggregates multiple factors
- Tier-gated features need upgrade prompts

## Requirements

### Functional

#### Aliases Tab
- List all aliases with stats
- Create new alias (custom or random)
- Toggle active/inactive
- Update forward destination
- Delete alias

#### Breach Monitor Tab
- Enable/disable monitoring per email
- View breach status with severity
- Check email for breaches
- View breach history

#### Privacy Score Tab
- Overall score visualization
- Factor breakdown
- Recommendations
- Historical trend (if available)

### Non-Functional

- Lazy load each tab
- Optimistic updates for toggles
- Proper loading states
- Upgrade prompts for gated features

## Architecture

```
/app/identity → IdentitySuitePage
├── TabNavigation (Aliases | Breaches | Score)
├── AliasesTab
│   ├── AliasStats
│   ├── AliasList
│   └── CreateAliasModal
├── BreachMonitorTab
│   ├── MonitoringStatus
│   ├── BreachList
│   └── CheckEmailForm
└── PrivacyScoreTab
    ├── ScoreGauge
    ├── FactorBreakdown
    └── Recommendations
```

## Related Code Files

### Create

- `services/web/src/pages/IdentitySuite.tsx`
- `services/web/src/pages/identity-suite-modules/`
  - `aliases-tab.tsx`
  - `alias-list.tsx`
  - `create-alias-modal.tsx`
  - `breach-monitor-tab.tsx`
  - `breach-list.tsx`
  - `privacy-score-tab.tsx`
  - `score-gauge.tsx`
- `services/web/src/services/identityService.ts`

### Modify

- `services/web/src/App.tsx` - Add route
- `services/web/src/components/Navigation/nav-items.tsx` - Add nav link

## Implementation Steps

### Step 1: Create Identity Service (2h)

```typescript
// services/web/src/services/identityService.ts
export const identityService = {
  // Aliases
  listAliases: () => api('/api/aliases', { token }),
  createAlias: (data) => api('/api/aliases', { method: 'POST', body: data, token }),
  toggleAlias: (id) => api(`/api/aliases/${id}/toggle`, { method: 'POST', token }),
  updateAlias: (id, data) => api(`/api/aliases/${id}`, { method: 'PATCH', body: data, token }),
  deleteAlias: (id) => api(`/api/aliases/${id}`, { method: 'DELETE', token }),

  // Breach Monitor
  getBreachStatus: () => api('/api/breach-monitor/status', { token }),
  enableMonitoring: (email) => api('/api/breach-monitor', { method: 'POST', body: { email }, token }),
  disableMonitoring: (email) => api(`/api/breach-monitor/${email}`, { method: 'DELETE', token }),
  checkBreaches: (email) => api('/api/breach-monitor/check', { method: 'POST', body: { email }, token }),
  getBreachHistory: () => api('/api/breach-monitor/history', { token }),

  // Privacy Score
  getPrivacyScore: () => api('/api/privacy-score', { token }),
  getPrivacyDashboard: () => api('/api/privacy-score/dashboard', { token }),

  // Bundles
  getBundles: () => api('/api/bundles'),
};
```

### Step 2: Create Main Page with Tabs (1h)

- Tab navigation with URL sync (`?tab=aliases`)
- Lazy load tab content
- Responsive tab layout

### Step 3: Implement Aliases Tab (4h)

- Stats header (total, active, forwards, replies)
- Alias list with actions
- Create modal with domain selector
- Toggle with optimistic update
- Delete with confirmation

### Step 4: Implement Breach Monitor Tab (3h)

- Tier gate check (show upgrade prompt)
- Monitored emails list
- Severity indicator (safe/low/medium/high)
- Add email form
- Check now button
- Breach history timeline

### Step 5: Implement Privacy Score Tab (2h)

- Circular gauge (0-100)
- Color coded (red/orange/green)
- Factor cards with individual scores
- Improvement recommendations
- Upgrade prompts for locked factors

## Todo List

- [ ] Create identityService.ts
- [ ] Create IdentitySuite.tsx page shell
- [ ] Add route and navigation
- [ ] Implement AliasesTab
- [ ] Implement AliasList component
- [ ] Implement CreateAliasModal
- [ ] Implement BreachMonitorTab
- [ ] Implement BreachList component
- [ ] Implement PrivacyScoreTab
- [ ] Implement ScoreGauge component
- [ ] Add tier-gating with upgrade prompts
- [ ] Test all CRUD operations
- [ ] Test mobile layout

## Success Criteria

- [ ] All alias CRUD operations work
- [ ] Breach monitoring shows current status
- [ ] Privacy score displays with breakdown
- [ ] Tier restrictions enforced with prompts
- [ ] Mobile-responsive layout
- [ ] No 403 errors for authorized users

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tier check fails | High | Show upgrade prompt, not error |
| Alias limit reached | Medium | Clear limit display + upgrade CTA |
| Breach API slow | Low | Loading states + optimistic UI |

## Security Considerations

- Forward emails encrypted (backend handles)
- Don't expose breach details publicly
- Validate email formats client-side
- Rate limit breach checks

## Next Steps

After completion: Add alias usage analytics, breach notification preferences
