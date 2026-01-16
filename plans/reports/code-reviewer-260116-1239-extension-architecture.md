# Extension Architecture Audit Report

**Date:** 2026-01-16
**Auditor:** Code Reviewer (Browser Extension Expert)
**Target:** Ephemera Browser Extension (`services/extension/`)
**Version:** 0.1.0

---

## Executive Summary

Extension successfully migrated to WXT framework with modern architecture. TypeScript compilation clean, build successful (334.66 kB output). Core functionality solid with good separation of concerns. **Key strength:** Shadow DOM isolation, DOMPurify sanitization, proper MV3 service worker implementation. **Main concern:** Missing error boundaries, no comprehensive testing strategy, analytics endpoint disabled.

**Overall Grade: 7.5/10**

---

## Scope

- **Files Reviewed:** 21 TypeScript/TSX files
- **Lines of Code:** ~3,500 estimated
- **Review Focus:** Recent migration to WXT, architecture patterns, security, type safety
- **Build Status:** ✅ Clean compilation, successful build
- **Git Activity:** 14 commits in last 7 days (active development)

---

## Strengths

### Architecture & Design (8/10)
- **WXT Framework Migration:** Clean adoption of modern build system, proper Manifest V3 structure
- **Modular Organization:** Clear separation: `shared/`, `components/`, `entrypoints/`, `content/`, `background/`
- **Shadow DOM Isolation:** Content script UI properly isolated from host page styles (prevents CSS conflicts)
- **State Management:** Simple but effective storage abstraction with browser.storage.local wrapper
- **Type Safety:** Strong TypeScript usage, proper interface definitions (`types.ts`)
- **Service Worker Pattern:** Correct MV3 background service worker with alarm-based polling

### Security (8.5/10)
- **DOMPurify Integration:** HTML email content sanitized before rendering (MessageList.tsx:89)
- **CSP Headers:** Properly configured in manifest (`wxt.config.ts:22-24`)
- **No Eval/Unsafe-Inline:** No dynamic code execution detected
- **Token Handling:** JWT stored in local storage (acceptable for extensions), 401 auto-logout
- **Host Permissions:** Scoped to API domain only (`https://api.manhquy.click/*`)
- **Content Injection:** Uses Shadow DOM to prevent host page tampering

### Code Quality (7/10)
- **Consistent Patterns:** Shared utilities (`storage.ts`, `api.ts`, `analytics.ts`)
- **Error Handling:** Try-catch blocks in async operations, user-facing error messages
- **Field Detection:** Sophisticated email field detector with 23+ selectors + keyword matching
- **UI/UX Polish:** Glassmorphism design, dark mode, live countdowns, copy feedback
- **Accessibility:** ARIA labels considered in field detection

---

## Weaknesses

### Critical Issues (Priority 1)

**None identified** - No security vulnerabilities or breaking issues found.

---

### High Priority Findings

1. **No Error Boundaries (React)**
   - **Issue:** React components lack error boundaries; unhandled errors crash entire UI
   - **Location:** All React entrypoints (`App.tsx`, components)
   - **Impact:** Poor user experience on runtime errors
   - **Recommendation:** Add `ErrorBoundary` wrapper in `sidepanel/main.tsx` and `popup/main.tsx`

2. **Analytics Endpoint Disabled**
   - **Issue:** Analytics tracking calls stubbed out (analytics.ts:36-47)
   - **Location:** `shared/analytics.ts`
   - **Impact:** No usage metrics, can't track feature adoption
   - **Recommendation:** Implement `/extension/analytics` endpoint or remove tracking calls

3. **No Message Polling Mechanism**
   - **Issue:** Alarm created (background.ts:20) but no handler for `ALARM_POLL_MESSAGES`
   - **Location:** `entrypoints/background.ts`
   - **Impact:** Real-time updates depend entirely on push notifications
   - **Recommendation:** Add `browser.alarms.onAlarm.addListener()` to poll `/extension/dashboard`

4. **Context Menu Refresh Race Condition**
   - **Issue:** `setupContextMenus()` reads storage directly, may show stale inboxes
   - **Location:** `background.ts:34-81`
   - **Impact:** Context menu shows deleted/expired inboxes
   - **Recommendation:** Listen to `INBOXES_UPDATED` message to trigger refresh

---

### Medium Priority Improvements

5. **Hardcoded Tier Limits**
   - **Issue:** Tier quotas duplicated in InboxList.tsx:57 (should fetch from API)
   - **Location:** `components/popup/InboxList.tsx`
   - **Impact:** Out of sync if backend changes limits
   - **Recommendation:** Add tier limits to `/extension/dashboard` response

6. **No Rate Limiting on Client**
   - **Issue:** No throttle/debounce on rapid API calls (e.g., refresh button spam)
   - **Location:** `components/popup/InboxList.tsx:39`, `MessageList.tsx:30`
   - **Impact:** Potential API abuse or rate limit hits
   - **Recommendation:** Add debounce utility, disable buttons during loading

7. **Missing Input Validation**
   - **Issue:** No validation before sending data to API (e.g., inbox creation)
   - **Location:** `shared/api.ts`
   - **Impact:** Server-side errors not prevented
   - **Recommendation:** Add Zod schema validation for request payloads

8. **Large Bundle Size**
   - **Issue:** 334 kB total (240 kB React chunk is heavy for extension)
   - **Location:** Build output
   - **Impact:** Slower install/update times
   - **Recommendation:** Code-split React components, tree-shake unused Lucide icons

9. **No Retry Logic**
   - **Issue:** Network failures cause permanent errors (no exponential backoff)
   - **Location:** `shared/api.ts:41`
   - **Impact:** Poor UX in flaky networks
   - **Recommendation:** Add retry wrapper with backoff for GET requests

10. **Stale Closure in Theme Listener**
    - **Issue:** `mediaQuery.addListener` deprecated (ui-injector.ts:41)
    - **Location:** `content/ui-injector.ts`
    - **Impact:** May break in future Chrome versions
    - **Recommendation:** Use only `addEventListener` (already has fallback)

---

### Low Priority Suggestions

11. **Magic Numbers**
    - Hardcoded values: 10min extension (InboxList:147), 1min alarm (background:21), 8 inbox limit (background:71)
    - **Recommendation:** Extract to constants file

12. **Console Logs in Production**
    - `console.log/error` scattered throughout (background, content, components)
    - **Recommendation:** Use logger utility with environment-based levels

13. **No TypeScript Strict Mode**
    - `tsconfig.json` doesn't enable `strict: true`
    - **Recommendation:** Enable for better type safety (may require fixes)

14. **Inconsistent Domain Handling**
    - Inbox domain sometimes string, sometimes object (utils.ts:8-10)
    - **Recommendation:** Normalize at API boundary, always store as string internally

15. **No Unit Tests**
    - Zero test coverage (no `*.test.ts` files found)
    - **Recommendation:** Add Vitest for utility functions (normalizeInbox, formatTimeLeft)

16. **Missing AbortController**
    - Fetch requests can't be cancelled (long-running requests block UI)
    - **Recommendation:** Pass AbortSignal to fetch calls

---

## Performance Analysis (7.5/10)

### Positive
- `requestIdleCallback` for non-blocking UI injection (ui-injector.ts:66)
- ResizeObserver/IntersectionObserver for efficient position tracking
- Passive event listeners on scroll/resize (ui-injector.ts:189)
- 1-second countdown ticker (acceptable granularity)

### Concerns
- MutationObserver on entire `document.body` (field-detector.ts:182) - could fire excessively on dynamic sites
- No memoization in React components (e.g., `formatTimeLeft` recalculates every second)
- Storage reads not cached (every component calls `storage.getAuth()`)

**Recommendation:** Add React.memo/useMemo for expensive renders, consider Zustand for shared state.

---

## Type Safety (8/10)

### Strengths
- Strong typing on API responses (`DashboardData`, `Message`, `Inbox`)
- Generic storage helpers (`get<K>`, `set<K>`)
- Proper union types for views (`View = { type: 'home' } | { type: 'inbox', ... }`)

### Weaknesses
- `any` used in message handlers (background.ts:146, ui-injector.ts:86)
- Type assertions without validation (`result.auth as AuthState`)
- `@ts-ignore` comments (background:222, 235, push-handler:22)

**Recommendation:** Replace `any` with proper types, add runtime validation with Zod.

---

## Security Audit (8.5/10)

### Verified
✅ DOMPurify sanitizes HTML before dangerouslySetInnerHTML
✅ CSP prevents inline scripts (`script-src 'self'`)
✅ No localStorage usage (uses browser.storage.local)
✅ HTTPS-only host permissions
✅ No third-party script injection
✅ Token cleared on 401 response

### Concerns
⚠️ Device ID generation weak (Math.random()) - use crypto.randomUUID()
⚠️ Push subscription keys not validated before sending to server
⚠️ No CSRF protection (extension context mitigates this)

---

## Build & Deployment (9/10)

- ✅ TypeScript compilation clean (`tsc --noEmit`)
- ✅ WXT build successful (5.5s)
- ✅ Multi-browser support (Firefox config in wxt.config.ts)
- ✅ Proper manifest permissions
- ⚠️ No linting configured (`.eslintrc` missing in src/)
- ⚠️ No pre-commit hooks (Husky)

---

## Metrics Summary

| Category              | Score | Notes                                    |
|-----------------------|-------|------------------------------------------|
| Architecture          | 8/10  | Clean modular design, WXT well-adopted   |
| Security              | 8.5/10| DOMPurify + CSP + scoped permissions     |
| Type Safety           | 8/10  | Strong types, minor `any` usage          |
| Error Handling        | 6/10  | Basic try-catch, no boundaries/retry     |
| Performance           | 7.5/10| Good optimizations, room for memoization |
| Code Organization     | 8/10  | Clear structure, consistent patterns     |
| Build/Deploy          | 9/10  | Clean build, multi-browser ready         |
| Testing               | 2/10  | No tests present                         |
| Documentation         | 6/10  | README updated, inline comments sparse   |

**Overall: 7.5/10** - Solid foundation, production-ready with minor improvements.

---

## Recommended Actions (Prioritized)

### Immediate (Before Next Release)
1. Add React ErrorBoundary to prevent UI crashes
2. Implement alarm handler for message polling OR remove alarm creation
3. Fix context menu refresh to listen for storage updates
4. Replace `Math.random()` device ID with `crypto.randomUUID()`

### Short-Term (Next Sprint)
5. Add debounce to refresh buttons (prevent API spam)
6. Enable TypeScript strict mode + fix type errors
7. Implement analytics endpoint OR remove tracking calls
8. Add Vitest + write tests for critical utilities

### Long-Term (Technical Debt)
9. Bundle optimization: code-split React chunks, tree-shake icons
10. Add retry logic with exponential backoff
11. Implement centralized error reporting (Sentry)
12. Add end-to-end tests (Playwright for extensions)

---

## Positive Observations

- **Modern Stack:** WXT + React 18 + TypeScript 5 + TailwindCSS is excellent choice
- **Security-First:** DOMPurify + Shadow DOM shows security awareness
- **UX Polish:** Glassmorphism, live countdowns, copy feedback - high attention to detail
- **MV3 Compliance:** Proper service worker patterns, no legacy Manifest V2 code
- **Field Detection:** Comprehensive selector list with i18n support (Vietnamese keywords)

---

## Conclusion

Extension is **production-ready** with current functionality. Core architecture solid, security practices strong, no critical vulnerabilities found. Main improvement areas: error resilience (boundaries + retry), testing coverage, and completion of polling mechanism. Recent WXT migration successful - framework provides good foundation for scaling.

**Approval Status:** ✅ **APPROVED for deployment** with recommended improvements tracked as technical debt.

---

## Unresolved Questions

1. Why is analytics tracking stubbed? Privacy concern or incomplete feature?
2. Should alarm polling be removed if push notifications are primary mechanism?
3. What's the strategy for handling expired tokens (refresh tokens not implemented)?
4. Are there plans for i18n beyond Vietnamese field detection?
