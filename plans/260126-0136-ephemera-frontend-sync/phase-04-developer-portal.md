# Phase 4: Developer Portal

## Context Links

- Existing API Page: `services/web/src/pages/API.tsx`
- Docs Page: `services/web/src/pages/Docs.tsx`

## Overview

| Field | Value |
|-------|-------|
| Priority | P2 |
| Status | Pending |
| Effort | 8h |

Developer portal for API key management, usage stats, and documentation.

## Key Insights

- Existing `/api` page shows basic docs
- Backend API key management exists (need to verify routes)
- Usage tracking needed for billing
- SDK download links

## Requirements

### Functional

- API key generation/regeneration
- View API keys (masked)
- Usage statistics (calls, bandwidth)
- Rate limit status
- API documentation
- SDK downloads (npm, pip)
- Webhook configuration

### Non-Functional

- API keys never fully visible after creation
- Copy to clipboard functionality
- Usage charts with date range
- Mobile-friendly docs

## Architecture

```
/app/developer → DeveloperPortal
├── OverviewTab
│   ├── QuickStart
│   ├── UsageChart
│   └── RateLimitStatus
├── APIKeysTab
│   ├── KeysList
│   └── CreateKeyModal
├── WebhooksTab
│   ├── WebhooksList
│   └── CreateWebhookModal
└── DocsTab
    └── APIDocumentation (existing + enhanced)
```

## Related Code Files

### Create

- `services/web/src/pages/DeveloperPortal.tsx`
- `services/web/src/pages/developer-portal-modules/`
  - `overview-tab.tsx`
  - `api-keys-tab.tsx`
  - `webhooks-tab.tsx`
  - `usage-chart.tsx`
  - `create-key-modal.tsx`
- `services/web/src/services/developerService.ts`

### Modify

- `services/web/src/pages/API.tsx` - Redirect to new portal
- `services/web/src/App.tsx` - Add route

## Implementation Steps

### Step 1: Create Developer Service (1h)

```typescript
// services/web/src/services/developerService.ts
export const developerService = {
  // API Keys
  listKeys: () => api('/api/developer/keys', { token }),
  createKey: (name) => api('/api/developer/keys', { method: 'POST', body: { name }, token }),
  revokeKey: (id) => api(`/api/developer/keys/${id}`, { method: 'DELETE', token }),

  // Usage
  getUsage: (startDate, endDate) => api(`/api/developer/usage?start=${startDate}&end=${endDate}`, { token }),
  getRateLimits: () => api('/api/developer/rate-limits', { token }),

  // Webhooks
  listWebhooks: () => api('/api/developer/webhooks', { token }),
  createWebhook: (data) => api('/api/developer/webhooks', { method: 'POST', body: data, token }),
  deleteWebhook: (id) => api(`/api/developer/webhooks/${id}`, { method: 'DELETE', token }),
  testWebhook: (id) => api(`/api/developer/webhooks/${id}/test`, { method: 'POST', token }),
};
```

### Step 2: Create Portal Shell (1h)

- Tab navigation
- Tier check (API access may require paid tier)
- Quick start section with code snippets

### Step 3: Implement API Keys Tab (2h)

- List keys (masked: `sk_live_****abcd`)
- Create key modal
- Show key ONCE on creation (with copy button)
- Revoke with confirmation
- Last used timestamp

### Step 4: Implement Usage Tab (2h)

- Date range selector
- Line chart for API calls
- Breakdown by endpoint
- Current rate limit status
- Upgrade prompt if near limits

### Step 5: Implement Webhooks Tab (2h)

- Webhook URL configuration
- Event type selection
- Test webhook button
- Delivery history/status

## Todo List

- [ ] Create developerService.ts
- [ ] Create DeveloperPortal.tsx shell
- [ ] Add route and navigation
- [ ] Implement OverviewTab with quick start
- [ ] Implement APIKeysTab
- [ ] Implement CreateKeyModal
- [ ] Implement UsageChart component
- [ ] Implement WebhooksTab
- [ ] Add code snippet examples
- [ ] Test API key creation flow
- [ ] Test mobile layout

## Success Criteria

- [ ] API keys can be created and revoked
- [ ] Key shown only once on creation
- [ ] Usage stats display correctly
- [ ] Webhooks can be configured and tested
- [ ] Documentation is accessible
- [ ] Mobile-friendly layout

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Key exposure | High | Show only once, mask after |
| Backend routes missing | High | Verify API exists first |
| Usage data missing | Medium | Show "coming soon" if unavailable |

## Security Considerations

- API keys shown only on creation
- Revocation immediate
- Webhook URLs validated
- Rate limits enforced

## Next Steps

Verify backend developer API routes exist. May need to implement backend first.

## Unresolved Questions

1. Do backend developer API routes exist? Need to check `services/api/src/routes/`
2. What's the API key format and generation logic?
3. Is usage tracking implemented on backend?
