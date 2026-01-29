# Phase 1: Public Ephemeral Inbox Page

## Context Links

- Backend: `services/api/src/routes/ephemeral-inbox.ts`
- Service: `services/api/src/services/ephemeral-inbox.service.ts`
- Landing: `services/web/src/pages/LandingPage.tsx`

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 - Critical for viral growth |
| Status | Pending |
| Effort | 8h |

Zero-friction public inbox page. No signup required. Users get temp email instantly.

## Key Insights

- Backend rate limits: 5 creates/IP/hour, 10 extends/token/hour
- Token-based access (no auth required)
- Expiry: 1-24 hours, default varies
- Real-time message polling needed

## Requirements

### Functional

- One-click inbox generation
- Copy email address to clipboard
- View incoming messages
- Extend inbox expiry
- Share inbox link
- Countdown timer for expiry

### Non-Functional

- Page load < 2s
- Mobile-first design
- SEO optimized (public page)
- No auth required

## Architecture

```
/e/:token → EphemeralInboxPage
    ├── EphemeralHeader (address + copy + timer)
    ├── EphemeralMessageList (polling messages)
    ├── EphemeralMessageDetail (view email)
    └── EphemeralActions (extend + share)
```

## Related Code Files

### Create

- `services/web/src/pages/EphemeralInbox.tsx` - Main page
- `services/web/src/pages/ephemeral-inbox-modules/` - Components
  - `ephemeral-header.tsx`
  - `ephemeral-message-list.tsx`
  - `ephemeral-actions.tsx`
- `services/web/src/services/ephemeralService.ts` - API calls

### Modify

- `services/web/src/App.tsx` - Add route `/e/:token`
- `services/web/src/pages/LandingPage.tsx` - Add "Try Now" button

## Implementation Steps

1. Create ephemeral API service
   ```typescript
   // services/web/src/services/ephemeralService.ts
   export const ephemeralService = {
     create: (expiryHours?: number) => api('/ephemeral/inbox', { method: 'POST', body: { expiryHours } }),
     get: (token: string) => api(`/ephemeral/inbox/${token}`),
     extend: (token: string, hours?: number) => api(`/ephemeral/inbox/${token}/extend`, { method: 'POST', body: { expiryHours: hours } }),
     getMessages: (token: string, limit = 50, offset = 0) => api(`/ephemeral/inbox/${token}/messages?limit=${limit}&offset=${offset}`),
   };
   ```

2. Create EphemeralInbox page component
   - Handle token from URL params
   - Create inbox if no token (redirect to new)
   - Poll messages every 10s
   - Show countdown timer

3. Create ephemeral-header component
   - Email address display (large, prominent)
   - Copy button with toast feedback
   - Countdown timer with visual urgency
   - Extend button

4. Create ephemeral-message-list component
   - Reuse existing EmailStream patterns
   - Empty state with waiting animation
   - Auto-refresh indicator

5. Add landing page integration
   - "Try Now" button on hero section
   - Creates ephemeral inbox and redirects

6. Add route to App.tsx
   ```tsx
   <Route path="/e/:token?" element={<EphemeralInbox />} />
   ```

## Todo List

- [ ] Create ephemeralService.ts
- [ ] Create EphemeralInbox.tsx page
- [ ] Create ephemeral-header.tsx
- [ ] Create ephemeral-message-list.tsx
- [ ] Create ephemeral-actions.tsx
- [ ] Add route to App.tsx
- [ ] Add "Try Now" to landing page
- [ ] Add SEO meta tags
- [ ] Test mobile responsive
- [ ] Test rate limiting UX

## Success Criteria

- [ ] User can create inbox with one click
- [ ] Email address copies to clipboard
- [ ] Messages appear within 10s of arrival
- [ ] Expiry countdown visible and accurate
- [ ] Extend functionality works
- [ ] Share link works
- [ ] Mobile layout functional
- [ ] Rate limit errors handled gracefully

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rate limiting UX | Medium | Show friendly message with cooldown timer |
| Polling performance | Low | Use 10s interval, pause when tab hidden |
| Token in URL exposure | Low | Tokens are random, short-lived |

## Security Considerations

- No PII stored
- Token-only access (no auth)
- Rate limiting on backend
- Auto-expiry cleans data

## Next Steps

After this phase: Update landing page CTA metrics, A/B test placement
