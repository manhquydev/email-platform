# Phase 2: Extension Outbound Email

## Context Links
- **Parent Plan:** [plan.md](./plan.md)
- **Related Phase:** [Phase 1: PWA Enhancement](./phase-01-pwa-enhancement.md)
- **Documentation:** [Code Standards - Extension Patterns](../../docs/code-standards.md#7-extension-patterns-wxt)
- **Existing Outbound Plan:** [260131-1518 Outbound Implementation](../260131-1518-outbound-email-implementation/plan.md)

## Overview
**Date:** 2026-02-01
**Priority:** P2
**Effort:** 6 hours
**Status:** 🔴 Pending

Add email composition and sending capability to browser extension for feature parity with web app.

## Key Insights
- Web app already has `ComposeModal.tsx` with Tiptap editor - port to extension
- Extension uses WXT framework with Chrome Side Panel API
- Attachment handling via `chrome.storage.local` (no blob URLs due to CSP)
- Extension already has API client (`utils/api-client.ts`) - extend with outbound endpoints
- Offline draft queue needed for unreliable connections

## Requirements

### Functional
1. "Compose" button in Side Panel opens compose modal
2. Rich text editor (Tiptap) with formatting toolbar
3. Attachment upload via file picker (stored in chrome.storage)
4. Send email via existing outbound API (`/api/messages/:id/send`)
5. Draft auto-save every 30 seconds to chrome.storage
6. Offline queue: emails sent while offline retry when connection restored
7. Sent emails appear in extension message list

### Non-Functional
- Compose modal opens in <300ms
- Tiptap bundle size <150KB (lazy load if needed)
- Max 5 attachments (10MB total) via chrome.storage
- Draft restoration on extension restart
- CSP-compliant (no inline scripts, no blob URLs)

## Architecture

### System Design
```
Extension Side Panel
  ├─► ComposeModal (ported from web)
  │     ├─► Tiptap Editor
  │     ├─► AttachmentList (chrome.storage)
  │     └─► Send Button
  ├─► chrome.storage.local
  │     ├─► drafts (auto-saved)
  │     └─► attachments (base64)
  └─► Background Script
        └─► Offline queue (retry failed sends)

API Server
  └─► POST /api/messages/:inboxId/send
```

### Data Flow
```
User clicks "Compose"
  └─► Show ComposeModal
      └─► User types (auto-save draft every 30s)
          └─► User attaches file → save to chrome.storage
              └─► User clicks "Send"
                  ├─► Online: POST /api/messages/:id/send
                  └─► Offline: Queue in background script
                      └─► Retry when connection restored
```

## Related Code Files

### Files to Modify
- `services/extension/src/entrypoints/sidepanel/App.tsx` - Add compose button
- `services/extension/src/utils/api-client.ts` - Add outbound endpoints
- `services/extension/src/entrypoints/background.ts` - Offline queue retry logic
- `services/extension/wxt.config.ts` - Add file picker permissions
- `services/extension/package.json` - Add Tiptap dependencies

### Files to Create
- `services/extension/src/components/compose/ComposeModal.tsx` - Main compose UI
- `services/extension/src/components/compose/RichTextEditor.tsx` - Tiptap wrapper
- `services/extension/src/components/compose/AttachmentList.tsx` - File uploads
- `services/extension/src/hooks/useDraftAutoSave.ts` - Auto-save hook
- `services/extension/src/utils/offline-queue.ts` - Queue manager
- `services/extension/src/utils/attachment-storage.ts` - chrome.storage wrapper

## Implementation Steps

1. **Install Tiptap Dependencies** (0.5h)
   - Add `@tiptap/react @tiptap/starter-kit` to extension package.json
   - Add `react-dropzone` for attachment drag-and-drop
   - Test bundle size impact (<150KB target)

2. **Port ComposeModal Component** (1.5h)
   - Copy `services/web/src/components/ComposeModal.tsx` to extension
   - Remove web-specific hooks (useAppToast → chrome.notifications)
   - Adapt styling for Side Panel width (narrower than web modal)
   - Replace blob URLs with chrome.storage for attachments

3. **Implement RichTextEditor** (1h)
   - Create Tiptap editor with StarterKit extensions
   - Add toolbar: bold, italic, underline, lists, links
   - Handle paste (strip unsupported formatting)
   - Serialize to HTML for API submission

4. **Attachment Handling** (1h)
   - Create `attachment-storage.ts` with `saveAttachment(file)` (base64 encode)
   - Store in `chrome.storage.local.attachments[draftId]`
   - Add file size validation (10MB total limit)
   - Create AttachmentList component (preview, remove)

5. **Draft Auto-Save** (0.5h)
   - Create `useDraftAutoSave` hook (debounced 30s)
   - Save to `chrome.storage.local.drafts[inboxId]`
   - Restore draft on compose modal open
   - Clear draft on successful send

6. **Offline Queue** (1h)
   - Create `offline-queue.ts` with retry logic
   - Store failed sends in chrome.storage.local.outboundQueue
   - Background script polls queue every 60s when online
   - Remove from queue on 200 response or 3 failures

7. **Integrate with Side Panel** (0.5h)
   - Add "Compose" button to App.tsx header
   - Show ComposeModal on click (dialog overlay)
   - Update message list after send (optimistic UI)
   - Show "Sending..." state during API call

8. **Testing** (1h)
   - Test compose → attach → send flow
   - Test offline send → queue → retry when online
   - Test draft restore on extension restart
   - Verify CSP compliance (no console errors)

## Todo List
- [ ] Install @tiptap/react, @tiptap/starter-kit, react-dropzone
- [ ] Copy ComposeModal.tsx from web to extension
- [ ] Adapt ComposeModal for Side Panel width
- [ ] Replace useAppToast with chrome.notifications
- [ ] Create RichTextEditor.tsx with Tiptap
- [ ] Add formatting toolbar (bold, italic, lists, links)
- [ ] Create attachment-storage.ts (chrome.storage wrapper)
- [ ] Implement AttachmentList.tsx with file picker
- [ ] Create useDraftAutoSave hook (30s debounce)
- [ ] Save/restore drafts to chrome.storage.local
- [ ] Create offline-queue.ts with retry logic
- [ ] Add background script queue polling (60s interval)
- [ ] Add "Compose" button to Side Panel header
- [ ] Test offline send → queue → retry flow
- [ ] Verify CSP compliance (no blob URLs, inline scripts)

## Success Criteria
- ✅ "Compose" button opens modal in <300ms
- ✅ Tiptap editor supports bold, italic, lists, links
- ✅ Attachments upload via file picker (max 10MB)
- ✅ Drafts auto-save every 30s
- ✅ Draft restores on extension restart
- ✅ Offline sends queue and retry when online
- ✅ Sent emails appear in extension message list
- ✅ No CSP violations in console
- ✅ Bundle size increase <200KB

## Risk Assessment

**Potential Issues:**
1. **Tiptap bundle size** - Could bloat extension package
2. **chrome.storage quota** - Attachments consume storage quota (10MB limit per extension)
3. **CSP violations** - Tiptap may use inline styles or blob URLs
4. **Side Panel width** - Compose modal may be cramped (narrow viewport)

**Mitigation:**
1. Lazy load Tiptap (dynamic import on compose button click)
2. Limit attachments to 5 files, 10MB total - show quota warning
3. Configure Tiptap to avoid inline styles, use external CSS
4. Use single-column layout, collapsible toolbar for narrow width

## Security Considerations

**Authentication:**
- Extension reuses JWT token from chrome.storage.local
- Outbound API requires valid JWT (same as web app)

**Data Protection:**
- Drafts stored in chrome.storage.local (unencrypted - acceptable for disposable emails)
- Attachments base64-encoded (no encryption - same as web app)

**Authorization:**
- User must own inbox to send from it (backend validation)
- API checks inbox ownership before sending

**CSP Compliance:**
- No `eval()` or `new Function()` in Tiptap config
- No inline event handlers (onClick via JSX only)
- No blob URLs for attachments (use chrome.storage)

## Next Steps
1. Complete Phase 2 implementation
2. Test compose flow on Chrome, Edge, Brave
3. Measure bundle size impact (target <200KB increase)
4. User testing: compose UX in narrow Side Panel
5. Proceed to Phase 3: Analytics Dashboard
