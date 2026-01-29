---
title: "Chrome Extension Production Ready"
description: "Complete and polish Ephemera Chrome extension for Web Store submission"
status: in_progress
priority: P1
effort: 16h (Approach A) / 28h (Approach B)
branch: main
tags: [extension, chrome, production, testing, wxt]
created: 2026-01-20
---

# Chrome Extension Production Ready Plan

## Current State Summary

**Framework:** WXT 0.19 + React 18 + TypeScript + Zustand + TailwindCSS

**Implemented Features:**
- Auth (Login component with JWT)
- Inbox CRUD (InboxList, CreateInboxModal)
- Message viewing (MessageList)
- Push notifications (push-handler, push-subscription)
- Field detection (content script for email field detection)
- UI injection (ui-injector for content scripts)
- Side panel support
- i18n localization
- Context menus
- QR code generation
- Onboarding tour
- Error boundary

**Test Coverage (Partial):**
- `constants.test.ts`, `utils.test.ts`, `storage.test.ts`, `api.test.ts`
- `Login.test.tsx`, `InboxList.test.tsx`
- E2E setup with Playwright (config exists)
- Missing: content script tests, background tests, component tests

**Gaps Identified:**
- No tests for: background.ts, content.ts, field-detector, push-handler, ui-injector
- No component tests for: Settings, MessageList, SearchInput, DomainPicker, CustomPrefixInput
- Documentation incomplete
- Privacy policy not created
- Chrome Web Store assets missing (screenshots, promotional images)

---

## Approach A: Incremental Polish (Conservative)

### Overview
Focus on stabilizing existing features, achieving comprehensive test coverage, and preparing all Chrome Web Store submission requirements. Lower risk, predictable timeline, production-ready in ~16 hours.

### Pros
- Lower risk, fewer breaking changes
- Predictable timeline
- Solid foundation for future features
- Faster time-to-market
- Easier to debug/maintain

### Cons
- No new user-facing features
- May miss competitive differentiators
- Offline support deferred

### Phase 1: Test Coverage & Stability (6h) ✅ DONE (2026-01-20)
**File:** `phase-01-test-coverage.md`

- [x] Add unit tests for `background.ts` service worker logic
- [x] Add unit tests for `content.ts` entry point
- [x] Add unit tests for `field-detector.ts`
- [x] Add unit tests for `push-handler.ts`
- [x] Add unit tests for `ui-injector.ts`
- [x] Add component tests for Settings, MessageList, SearchInput
- [x] Add component tests for DomainPicker, CustomPrefixInput, QRCodeModal
- [x] Configure coverage thresholds (target: 80%)
- [x] Fix any bugs discovered during testing

**Success Criteria:**
- Coverage >= 80% for all shared modules
- All existing tests pass
- No critical bugs in core flows

**Dependencies:** None

### Phase 2: Accessibility & Polish (4h)
**File:** `phase-02-accessibility-polish.md`

- [ ] Audit all components for WCAG 2.1 AA compliance
- [ ] Add keyboard navigation to popup/sidepanel
- [ ] Add visible focus states (`:focus-visible`)
- [ ] Add ARIA labels to custom controls
- [ ] Ensure 4.5:1 contrast ratio for text
- [ ] Add `prefers-reduced-motion` support
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Add loading skeletons for async operations
- [ ] Polish error states and empty states

**Success Criteria:**
- Pass axe-core automated audit
- Full keyboard navigable
- Screen reader compatible

**Dependencies:** Phase 1 (stable codebase)

### Phase 3: Chrome Web Store Preparation (4h)
**File:** `phase-03-store-preparation.md`

- [ ] Create privacy policy document
- [ ] Write detailed permission justifications
- [ ] Create promotional screenshots (1280x800, 640x400)
- [ ] Create promotional tile images (440x280, 920x680, 1400x560)
- [ ] Write store description (short + detailed)
- [ ] Create icon variants (16, 32, 48, 128px)
- [ ] Production build testing (`wxt build`)
- [ ] Verify CSP compliance
- [ ] Test extension in incognito mode
- [ ] Create developer account (if not exists)
- [ ] Enable 2-step verification

**Success Criteria:**
- All required assets created
- Privacy policy published
- Production build verified
- Ready for submission

**Dependencies:** Phase 2 (polished UI for screenshots)

### Phase 4: Documentation & Release (2h)
**File:** `phase-04-documentation-release.md`

- [ ] Write extension README.md
- [ ] Document build/release process
- [ ] Create CHANGELOG.md
- [ ] Document API integration points
- [ ] Create troubleshooting guide
- [ ] Submit to Chrome Web Store
- [ ] Monitor review feedback

**Success Criteria:**
- Complete documentation
- Successful store submission
- Version 0.1.0 published

**Dependencies:** Phase 3

### Risk Assessment (Approach A)
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Store rejection for permissions | Medium | High | Detailed justifications, minimal permissions |
| Test flakiness | Low | Medium | Use fake-browser mocks consistently |
| Review delays (3+ weeks) | Medium | Medium | Submit early, plan for iterations |

---

## Approach B: Feature-Complete Enhancement (Ambitious)

### Overview
Add advanced features (offline support, cross-device sync, enhanced notifications), refactor architecture, and prepare for store. Higher impact but more complexity. ~28 hours total.

### Pros
- Competitive feature set
- Better user experience
- Offline capability
- Cross-device sync

### Cons
- Higher complexity
- More testing required
- Longer timeline
- Risk of scope creep
- More potential bugs

### Phase 1: Architecture Refactor (4h)
**File:** `phase-01-architecture-refactor.md`

- [ ] Refactor state management for offline-first
- [ ] Implement message queue for background sync
- [ ] Add IndexedDB layer for offline storage
- [ ] Create sync conflict resolution logic
- [ ] Add retry mechanisms with exponential backoff
- [ ] Refactor API layer for offline awareness

**Success Criteria:**
- Clean separation of concerns
- Offline-ready data layer
- No regressions in existing features

**Dependencies:** None

### Phase 2: Offline Support & Background Sync (6h)
**File:** `phase-02-offline-support.md`

- [ ] Implement Background Sync API for pending actions
- [ ] Cache inbox list and recent messages in IndexedDB
- [ ] Add offline indicator UI
- [ ] Queue "create inbox" actions when offline
- [ ] Queue "delete message" actions when offline
- [ ] Auto-sync on connectivity restore
- [ ] Add conflict resolution UI for sync failures
- [ ] Test offline scenarios thoroughly

**Success Criteria:**
- Core actions work offline
- Data syncs on reconnection
- Clear offline status indicators

**Dependencies:** Phase 1

### Phase 3: Enhanced Notifications (4h)
**File:** `phase-03-enhanced-notifications.md`

- [ ] Implement notification grouping (collapse multiple)
- [ ] Add action buttons ("Reply", "Archive", "Mark Read")
- [ ] Add notification preferences in settings
- [ ] Implement quiet hours / DND respect
- [ ] Add notification history in popup
- [ ] Badge with unread count
- [ ] Sound customization options

**Success Criteria:**
- Actionable notifications
- User preference controls
- No spam behavior

**Dependencies:** Phase 1

### Phase 4: Test Coverage & Stability (6h)
**File:** `phase-04-test-coverage.md`

Same as Approach A Phase 1, plus:
- [ ] Add tests for offline sync logic
- [ ] Add tests for Background Sync handlers
- [ ] Add tests for notification grouping
- [ ] Add E2E tests for critical flows
- [ ] Load testing for storage limits

**Success Criteria:**
- Coverage >= 80%
- All new features tested
- E2E tests for happy paths

**Dependencies:** Phases 1-3

### Phase 5: Accessibility & Polish (4h)
**File:** `phase-05-accessibility-polish.md`

Same as Approach A Phase 2

**Dependencies:** Phase 4

### Phase 6: Store Preparation & Release (4h)
**File:** `phase-06-store-preparation.md`

Same as Approach A Phases 3-4 combined, with additional:
- [ ] Document new offline features
- [ ] Create demo video for store listing
- [ ] Highlight differentiating features

**Success Criteria:**
- All assets created
- Successful submission
- Version 0.2.0 with offline support

**Dependencies:** Phase 5

### Risk Assessment (Approach B)
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep | High | High | Strict phase boundaries, defer nice-to-haves |
| Background Sync complexity | Medium | High | Use Workbox library, extensive testing |
| IndexedDB quota issues | Low | Medium | Implement cleanup policies, size limits |
| Store rejection | Medium | High | Same as Approach A |
| Timeline overrun | Medium | Medium | Buffer time, parallel work where possible |

---

## Recommendation

**Recommended: Approach A (Incremental Polish)**

**Rationale:**
1. **Ship Early, Learn Fast** - Get user feedback with stable v0.1.0 before adding complexity
2. **Lower Risk** - Existing features work; stabilize before expanding
3. **Test Foundation** - Comprehensive tests now = easier feature adds later
4. **Store Approval** - Simpler extension = faster review, fewer rejections
5. **YAGNI** - Offline support may not be critical for temp email use case

**Suggested Path:**
1. Execute Approach A fully (16h, ~1-2 weeks)
2. Submit to Chrome Web Store
3. Gather user feedback
4. If offline demand exists, implement Approach B Phase 2 as v0.2.0

---

## Timeline Summary

| Approach | Total Effort | Timeline (1 dev) |
|----------|--------------|------------------|
| A: Conservative | 16h | 4-5 days |
| B: Ambitious | 28h | 8-10 days |

---

## Unresolved Questions
- Is offline support a validated user need for disposable email?
- What's the target audience size for Web Store listing?
- Are there specific permission concerns from Chrome's review team for email extensions?
- Should we delay Firefox/Safari builds or prepare simultaneously?
