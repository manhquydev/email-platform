# Phase 01: Trust & Polish

## Context
- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** None (foundational phase)
- **Code Standards:** [docs/code-standards.md](../../docs/code-standards.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-01-10 |
| Priority | P1 |
| Effort | 12h |
| Status | pending |

**Goal:** Establish trust through privacy transparency, remove tracking signals, improve first-run experience.

## Key Insights (from Research)
- Zero-log explicit statements build trust in temp-mail space
- GDPR requires "Delete All" + clear retention periods
- No-registration models = gold standard for anonymity
- Technical impossibility of logging > policy promises

## Requirements

### R1: Privacy Policy Page
- Static page at `/privacy`
- Sections: Data Collection (none), Retention (configurable), User Rights, Security
- GDPR-compliant language
- Link in footer + registration flow

### R2: Trust Signals
- "No Logging" badge on landing page + dashboard
- Shield icon with tooltip explaining zero-log architecture
- Third-party audit badge placeholder (future)

### R3: IP Anonymization
- Truncate `sourceIp` in Message model (last octet → 0)
- Apply before database write in SMTP handler
- Existing messages: migration to anonymize

### R4: Metadata Stripping
- Remove tracking pixels from HTML body (1x1 images)
- Strip sensitive headers (X-Originating-IP, Received chain)
- Configurable via env `STRIP_METADATA=true`

### R5: Onboarding UX
- First-login wizard: create inbox → receive test email → done
- Progress indicator (3 steps)
- Skip option for returning users

## Architecture Decisions

### AD1: Privacy Page as Static React Component
- No API calls, pure static content
- SEO: Add JSON-LD structured data for organization

### AD2: IP Anonymization at Ingestion
- Modify `services/api/src/smtp/handler.ts`
- Anonymize before `prisma.message.create()`
- Reversible: store hash in separate audit table if legally required

### AD3: Header Stripping Middleware
- New util: `services/api/src/utils/email-sanitizer.ts`
- Called in SMTP handler after mailparser

## Related Code Files
| File | Purpose |
|------|---------|
| `services/web/src/pages/LandingPage.tsx` | Add trust badge |
| `services/web/src/App.tsx` | Add `/privacy` route |
| `services/api/src/smtp/handler.ts` | IP anonymization |
| `services/api/src/utils/email-sanitizer.ts` | New: metadata stripping |
| `services/web/src/components/onboarding-wizard.tsx` | New: first-run wizard |

## Implementation Steps

### Step 1: Privacy Policy Page (3h)
1. Create `services/web/src/pages/Privacy.tsx`
   - Use existing glassmorphism card styles
   - Sections: Intro, What We Collect, Retention, Your Rights, Security, Contact
2. Add route in `App.tsx`: `<Route path="/privacy" element={<Privacy />} />`
3. Add footer link in `services/web/src/components/Footer.tsx`
4. Add JSON-LD schema for SEO

### Step 2: Trust Badges (2h)
1. Create `services/web/src/components/trust-badge.tsx`
   - Shield icon + "Zero Logs" text
   - Tooltip with explanation
2. Add to `LandingPage.tsx` hero section
3. Add to `Dashboard.tsx` sidebar

### Step 3: IP Anonymization (2h)
1. Create util `services/api/src/utils/ip-anonymizer.ts`
   ```typescript
   export function anonymizeIp(ip: string): string {
     if (ip.includes(':')) return ip.replace(/:[^:]+$/, ':0000'); // IPv6
     return ip.replace(/\.\d+$/, '.0'); // IPv4
   }
   ```
2. Modify `smtp/handler.ts`: apply before message creation
3. Create migration to update existing messages:
   ```sql
   UPDATE "Message" SET "sourceIp" = regexp_replace("sourceIp", '\.\d+$', '.0');
   ```

### Step 4: Metadata Stripping (3h)
1. Create `services/api/src/utils/email-sanitizer.ts`
   - `stripTrackingPixels(html: string): string` - remove 1x1 images
   - `stripSensitiveHeaders(headers: object): object` - remove tracking headers
   - Header blocklist: `X-Originating-IP`, `X-Mailer`, `Received` (keep first only)
2. Integrate in `smtp/handler.ts` after parsing
3. Add env toggle `STRIP_METADATA` (default: true)

### Step 5: Onboarding Wizard (2h)
1. Create `services/web/src/components/onboarding-wizard.tsx`
   - Step 1: Welcome + create first inbox
   - Step 2: Show inbox address, prompt to send test email
   - Step 3: Success confirmation
2. Store completion in localStorage: `ephemera_onboarded=true`
3. Show on `Dashboard.tsx` if not completed
4. Add skip button

## Success Criteria
- [ ] Privacy page loads <100ms, scores 90+ Lighthouse
- [ ] Trust badge visible on landing + dashboard
- [ ] New messages have anonymized IP (verify with test email)
- [ ] HTML emails stripped of tracking pixels
- [ ] 80% of new users complete onboarding wizard

## Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Legal review delays | Medium | Low | Use standard GDPR template |
| IP anonymization breaks abuse detection | Low | Medium | Keep hash in separate table |
| Stripping breaks legitimate emails | Low | High | Whitelist known providers |

## Security Considerations
- Privacy page: No dynamic content, XSS-safe
- IP anonymization: One-way operation, no recovery
- Header stripping: Preserve message integrity (keep Message-ID, Date)

## Next Steps
After completion:
1. Announce privacy features in changelog
2. Add privacy link to API docs
3. Begin Phase 02 (Developer Ecosystem)
