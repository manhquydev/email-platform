# Plan: Add Navigation to Inbox Viewer Page

**Date:** 2026-01-18
**Status:** ✅ COMPLETED (2026-01-18)
**Priority:** Medium

## Overview

The `InboxViewer` page (`/inbox-viewer`) is a **public inbox viewer** that allows anyone to view public inboxes without authentication. Currently, this page has NO navigation links from anywhere in the project - it's an orphaned page.

## Analysis Summary

### What is InboxViewer?
- **Purpose:** Public inbox viewer for shared/public email inboxes
- **Route:** `/inbox-viewer` (standalone, not in any layout)
- **Features:** Search inbox by email, view messages, share links, Telegram integration
- **Target users:** Anyone with a public inbox link (no auth required)

### Current Navigation Structure
| Component | Location | Purpose |
|-----------|----------|---------|
| `NavigationSidebar` | App dashboard (right side) | Authenticated user nav |
| `AppHeader` | App pages | Header with user dropdown |
| `PublicLayout` | Public pages | Landing, pricing, docs |
| `LandingPage` | `/` | Marketing homepage |

### Missing Links
**InboxViewer is NOT linked from:**
- ❌ Landing page
- ❌ Public navigation header
- ❌ Dashboard sidebar
- ❌ App header dropdown
- ❌ Features page

## Implementation Plan

### Phase 1: Add to Public Navigation (PublicLayout header)
**File:** `services/web/src/layouts/PublicLayout.tsx`
- Add "Xem hộp thư" link in public nav header
- Position: After "Tài liệu" or before login

### Phase 2: Add to Landing Page Features
**File:** `services/web/src/pages/LandingPage.tsx`
- Add CTA button/link in hero section or features
- Highlight public inbox viewing capability

### Phase 3: Add to Dashboard Sidebar
**File:** `services/web/src/components/NavigationSidebar.tsx`
- Add quick link to public inbox viewer
- Icon: `visibility` or `public`

### Phase 4: Add to App Header Dropdown
**File:** `services/web/src/components/AppHeader.tsx`
- Add link in user dropdown menu

## Files to Modify

1. `services/web/src/layouts/PublicLayout.tsx` - Public nav header
2. `services/web/src/pages/LandingPage.tsx` - Hero/feature section
3. `services/web/src/components/NavigationSidebar.tsx` - Dashboard sidebar
4. `services/web/src/components/AppHeader.tsx` - User dropdown

## Success Criteria

- [ ] Inbox viewer accessible from public navigation
- [ ] Inbox viewer linked from landing page
- [ ] Authenticated users can access from dashboard
- [ ] All links use correct route `/inbox-viewer`
- [ ] Consistent styling with existing navigation
