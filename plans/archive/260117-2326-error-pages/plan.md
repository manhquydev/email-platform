---
title: "Error Pages Implementation"
description: "Reusable error pages (404, 403, 500, 503) with i18n and glassmorphism design"
status: pending
priority: P2
effort: 6h
branch: main
tags: [frontend, ux, i18n, error-handling]
created: 2026-01-17
---

# Error Pages Implementation Plan

## Overview

Implement comprehensive error pages for email-platform frontend with single reusable component, custom SVG illustrations matching glassmorphism design, i18n support (Vietnamese/English), and integration with routing/error handling.

## Current State Analysis

- **App.tsx**: Uses `Navigate to="/"` as fallback - no proper 404 page
- **ErrorBoundary.tsx**: Basic inline fallback UI, hardcoded Vietnamese text, no custom illustration
- **PublicLayout.tsx**: Ready to wrap error pages with nav/footer
- **i18n**: NOT configured - need fresh setup with react-i18next

## Architecture Decision

Single `ErrorPage.tsx` component with props-driven configuration:
```tsx
<ErrorPage
  code={404|403|500|503}
  title="..."
  description="..."
  showRetry={boolean}
  showHome={boolean}
/>
```

## Implementation Phases

| Phase | Description | Effort |
|-------|-------------|--------|
| 01 | i18n Setup (react-i18next + vi/en translations) | 1h |
| 02 | SVG Illustrations (glassmorphism style for each error) | 1.5h |
| 03 | ErrorPage Component (reusable, props-driven) | 1.5h |
| 04 | Routing Integration (404 route, ErrorBoundary enhancement) | 1h |
| 05 | API Error Handling (403/500/503 responses) | 1h |

## Key Files to Create/Modify

**Create:**
- `services/web/src/i18n/index.ts` - i18n config
- `services/web/src/i18n/locales/en.json` - English translations
- `services/web/src/i18n/locales/vi.json` - Vietnamese translations
- `services/web/src/components/illustrations/` - SVG components
- `services/web/src/pages/ErrorPage.tsx` - Main error page component

**Modify:**
- `services/web/src/main.tsx` - Import i18n
- `services/web/src/App.tsx` - Add 404 route
- `services/web/src/components/ErrorBoundary.tsx` - Use ErrorPage as fallback
- `services/web/src/utils/api.ts` - Handle API error responses

## Success Criteria

- [ ] All 4 error types render correctly with unique illustrations
- [ ] Language toggle works (vi/en)
- [ ] 404 page shows for unknown routes
- [ ] ErrorBoundary uses ErrorPage(500) as fallback
- [ ] API errors trigger appropriate error pages
- [ ] Glassmorphism design matches existing UI
- [ ] Accessible (keyboard nav, screen reader)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| i18n bundle size | Low | Use lazy loading for translations |
| SSR compatibility | N/A | SPA-only app |
| Design consistency | Medium | Follow existing CSS variables |

## Unresolved Questions

1. Should error pages support dark/light theme toggle inline?
2. Include "Report Issue" button linking to support?
