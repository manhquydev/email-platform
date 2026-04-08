# Email Detail UI Research - `/e/:token`

## Scope
- Route: `/e/:token`
- Files reviewed:
  - `services/web/src/pages/EphemeralInbox.tsx`
  - `services/web/src/pages/ephemeral-inbox-modules/ephemeral-message-list.tsx`
  - `services/web/src/components/inbox-viewer/mobile-bottom-sheet.tsx` (reference pattern)
- No code changes in this task.

## Core Best Practices (applied to temp-mail inbox viewer)

### 1) Information hierarchy
- Primary: Subject + sender + received time.
- Secondary: metadata (from/to/date), attachment count, security hints.
- Tertiary: full body (HTML/Text toggle), raw/long content fallback.
- Rule: user should scan list in <2s and open message in 1 tap.

### 2) Responsive behavior
- Desktop: split-pane (list + detail) with stable widths and independent scrolling.
- Mobile: list-first, detail as sheet/page with explicit back affordance.
- Avoid hardcoded heights; prefer viewport-driven layout (`dvh`) and safe areas.

### 3) Readable email HTML
- Strict sanitization + predictable typography container.
- Long tables/code/URL must never break layout: horizontal scroll + word-break handling.
- Keep HTML/Text switch when both bodies exist.

### 4) Long-content handling
- List preview should clamp lines, not raw substring only.
- `min-w-0` in flex rows, truncate with tooltip where needed.
- Handle html-only messages by deriving text preview fallback.

### 5) Attachment UX
- Attachment chips should be actionable (download/open), not display-only.
- Show filename + size + content type icon.

### 6) Message list/detail interaction
- Keyboard on desktop (up/down/select) and touch gestures on mobile.
- Keep context on mobile (sheet over list or push detail page); lock background scroll when detail open.

## Mapping Best-practice -> Current Code -> Concrete Proposal

| Area | Current state | Risk | Proposal (actionable) |
|---|---|---|---|
| Container height | `h-[600px] lg:h-[700px]` in message list (`ephemeral-message-list.tsx:45`) | Medium | Replace with viewport-derived height, e.g. `h-[calc(100dvh-var(--header-offset))]` + safe-area padding. |
| Mobile detail presentation | Full-screen fixed overlay (`ephemeral-message-list.tsx:101`) | Medium | Reuse `MobileBottomSheet` interaction model (swipe dismiss + body scroll lock) from `mobile-bottom-sheet.tsx`. |
| List preview extraction | `textBody?.substring(0,80)` (`ephemeral-message-list.tsx:162`) | Medium | Add preview extractor: `textBody` fallback to stripped `htmlBody`, then `line-clamp-2`. |
| Attachment usability | Attachment chips are non-clickable spans (`ephemeral-message-list.tsx:239`, `:347`) | High | Convert to actionable anchors/buttons with download endpoint + `aria-label`. |
| Icon-only controls a11y | Icon buttons lack explicit `aria-label` in several places | High | Add `aria-label` for back/create/copy/share actions. |
| Long-body readability | Already improved with `email-content` + overflow rules | Low | Add max readable width (`max-w-[72ch]`) inside detail on desktop to reduce eye fatigue. |
| Scroll behavior mobile | Background scroll control not explicit in this module | Medium | On mobile detail open: lock root/body scroll and restore on close. |
| Empty/error states | Basic states present | Low | Add contextual CTA per state (retry refresh, copy inbox, sample test email command). |

## Priority Checklist (impact-first)

### P0 (do first)
- [ ] Attachment chips -> actionable download/open with clear affordance.
- [ ] Add missing `aria-label` for icon-only buttons.
- [ ] Implement consistent mobile detail interaction with scroll lock + safe dismiss.

### P1
- [ ] Replace fixed heights with viewport/safe-area based sizing.
- [ ] Improve list preview extraction for html-only emails.
- [ ] Add desktop readable content width cap + stronger visual hierarchy for metadata.

### P2
- [ ] Keyboard navigation for list/detail on desktop.
- [ ] Virtualize list when message count > 50.
- [ ] Add optional Raw/Source tab for debugging-heavy users.

## Suggested Implementation Scope (small-to-large)
- Quick wins (0.5-1 day): a11y labels, actionable attachments, preview extraction.
- Medium (1-2 days): mobile sheet behavior + scroll lock + layout height refactor.
- Larger (2-4 days): keyboard navigation, virtualization, raw-source mode.

## Notes for Dev Team
- Keep DRY: extract reusable `email-body-renderer` + `attachment-chip-list` for both mobile/desktop.
- Keep file size healthy: `ephemeral-message-list.tsx` is already large; split by concern (list row, detail header, body renderer, attachment section).
- Maintain strict sanitize policy for inbound HTML.

## Unresolved Questions
- Attachment download endpoint for ephemeral inbox currently exposed path nào chuẩn cho public flow (cần xác nhận API contract).
- Mobile desired pattern preference: full-screen detail page vs bottom-sheet (UX choice cần chốt trước khi implement).
- Có yêu cầu giữ theme “neo glass” tuyệt đối ở email body hay chấp nhận “neutral reading surface” để readability tốt hơn?
