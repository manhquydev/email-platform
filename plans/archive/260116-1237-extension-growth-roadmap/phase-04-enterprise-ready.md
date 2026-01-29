# Phase 4: Enterprise Ready

**Priority:** P3 | **Effort:** 8h | **Status:** Pending

## Overview

Prepare extension for enterprise deployment and international markets. i18n enables global reach. Team features support business use cases. Security hardening meets enterprise requirements.

## Requirements

### Internationalization (3h)
- [ ] Extract all UI strings to `_locales/` structure
- [ ] Support English (default), Vietnamese, Spanish, French
- [ ] Use Chrome i18n API (`chrome.i18n.getMessage()`)
- [ ] RTL layout support for future Arabic/Hebrew
- [ ] Locale-aware date/time formatting

### Team Features (2h)
- [ ] Shared inbox concept (multiple users access same inbox)
- [ ] Team member list in settings (view only initially)
- [ ] Activity log for shared inboxes
- [ ] Role display (admin, member)

### Advanced Security (2h)
- [ ] Implement refresh token rotation
- [ ] Add session timeout configuration
- [ ] Biometric unlock option (WebAuthn integration)
- [ ] Audit log export for compliance

### Polish & Performance (1h)
- [ ] Code-split React components (lazy load Settings, MessageDetail)
- [ ] Tree-shake unused Lucide icons
- [ ] Add Sentry error reporting (optional, configurable)
- [ ] Final accessibility audit (target 95/100)

## Implementation Steps

1. Create `_locales/en/messages.json` with all strings
2. Replace hardcoded strings with `chrome.i18n.getMessage()` calls
3. Add locale files for vi, es, fr
4. Design shared inbox API contract with backend team
5. Create `components/TeamSettings.tsx` for team view
6. Implement refresh token logic in `shared/api.ts`
7. Add WebAuthn integration for biometric unlock
8. Configure Sentry SDK with privacy-preserving settings
9. Run Lighthouse accessibility audit, fix remaining issues

## Success Criteria

- [ ] Extension fully translated to 4 languages
- [ ] Team inbox sharing functional for enterprise users
- [ ] Refresh tokens prevent session expiry during use
- [ ] Accessibility score >= 95/100
- [ ] Bundle size <= 400KB (down from 334KB + new features)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| i18n string management overhead | Medium | Low | Use i18n extraction tooling |
| Team features require major API changes | High | High | Scope to view-only initially |
| WebAuthn browser support inconsistent | Medium | Medium | Graceful fallback to password |
| Sentry adds privacy concerns | Low | Medium | Make optional, document data sent |

## Dependencies

- **Backend:** Team/shared inbox API endpoints
- **Backend:** Refresh token endpoint
- **Product:** i18n string translations
- **Phase 1-3:** All previous phases complete

## Deliverables

- `_locales/` directory with 4 language files
- `components/TeamSettings.tsx`
- `shared/auth.ts` with refresh token logic
- WebAuthn integration in login flow
- Sentry configuration (optional)
- Final accessibility report
