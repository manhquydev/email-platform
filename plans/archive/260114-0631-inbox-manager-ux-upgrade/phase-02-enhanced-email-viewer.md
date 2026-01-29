# Phase 02: Enhanced Email Viewer

**Date:** 2026-01-14
**Status:** ✅ Complete
**Completed:** 2026-01-14
**Priority:** High
**Estimated Complexity:** Medium

## Context
- [Main Plan](./plan.md)
- [Email Viewer Patterns Research](../reports/researcher-260114-0631-email-viewer-patterns.md)

## Overview
Upgrade email viewing experience with better HTML rendering, attachment previews, and inline actions.

## Current State
- Email opens in modal overlay
- HTML rendered via iframe with basic sandbox
- No attachment preview (download only)
- Limited actions in viewer (close only)

## Target State
- Inline reading pane (from Phase 01)
- Secure HTML rendering with image proxy
- Attachment thumbnails with lightbox preview
- Quick action toolbar in viewer
- Plain text toggle for suspicious emails

## Requirements

### Functional
- [ ] Attachment thumbnail grid with preview
- [ ] Lightbox for images/PDFs
- [ ] Action toolbar: Reply (future), Forward (future), Delete, Archive, Pin, Snooze
- [ ] "Load images" button (block external by default)
- [ ] Plain text toggle
- [ ] Copy email source option

### Non-Functional
- [ ] Secure iframe sandbox
- [ ] CSP headers for HTML content
- [ ] Lazy load attachments
- [ ] Smooth animations

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Email Header                                             │
│ From: sender@example.com              Jan 14, 2026      │
│ To: inbox@ephemera.app                                  │
│ Subject: Your verification code                         │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Action Toolbar: [Pin] [Snooze] [Delete] [Export]    │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────┐   │
│ │                                                   │   │
│ │  Email Body (iframe sandboxed)                    │   │
│ │                                                   │   │
│ │  [Load Images] button if external images blocked │   │
│ │                                                   │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ Attachments: [📎 doc.pdf] [📎 image.png] [📎 data.csv] │
└─────────────────────────────────────────────────────────┘
```

## Implementation Steps

1. **Create MessageViewer component**
   - Extract from InboxManager modal
   - Props: message, onClose, onAction
   - Responsive: full-width in reading pane

2. **Create AttachmentGrid component**
   - Thumbnail previews (images only initially)
   - File type icons for non-images
   - Click to open lightbox or download

3. **Create AttachmentLightbox component**
   - Image gallery with prev/next
   - PDF viewer (iframe or pdf.js)
   - Download button

4. **Create EmailActionToolbar component**
   - Pin/Unpin toggle
   - Snooze with date picker
   - Delete with confirmation
   - Export as .eml

5. **Enhance HTML rendering**
   - Block external images by default
   - Add "Load images" button
   - Proxy images through backend (future)

6. **Add Plain Text toggle**
   - Switch between HTML and text view
   - Persist preference

## Files to Modify
- `services/web/src/pages/InboxManager.tsx` (remove inline modal)
- `services/web/src/components/EmailStream.tsx`

## Files to Create
- `services/web/src/components/email-viewer/MessageViewer.tsx`
- `services/web/src/components/email-viewer/EmailHeader.tsx`
- `services/web/src/components/email-viewer/EmailBody.tsx`
- `services/web/src/components/email-viewer/EmailActionToolbar.tsx`
- `services/web/src/components/email-viewer/AttachmentGrid.tsx`
- `services/web/src/components/email-viewer/AttachmentLightbox.tsx`

## API Endpoints Used
- `GET /messages/:id` - Fetch full message
- `PATCH /messages/:id/read` - Mark as read
- `PATCH /messages/:id/pin` - Pin/unpin
- `PATCH /messages/:id/snooze` - Snooze
- `DELETE /messages/:id` - Delete
- `GET /messages/:id/export` - Export as .eml
- `GET /attachments/:id/download` - Download attachment

## Success Criteria
- [ ] Email renders in reading pane (not modal)
- [ ] Attachments show thumbnails
- [ ] Lightbox works for images
- [ ] Actions (pin, snooze, delete) work
- [ ] External images blocked by default
- [ ] Plain text toggle works

## Risk Assessment
- **Medium:** HTML email security (XSS prevention)
- **Low:** Attachment preview complexity
- **Mitigation:** Keep strict iframe sandbox, server-side sanitization

## Security Considerations
- Strict iframe sandbox: `allow-same-origin` only when needed
- CSP for iframe content
- Sanitize HTML server-side (already done)
- Block external resources by default
