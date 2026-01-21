---
title: "SEO Optimization for Ephemera"
description: "Improve Google Search visibility for email platform"
status: pending
priority: P2
effort: 8h (Approach A) / 24h (Approach B)
branch: main
tags: [seo, frontend, performance]
created: 2026-01-22
---

# SEO Optimization Plan

## Executive Summary
Ephemera is a React 19 + Vite SPA with basic SEO (meta tags, OG, JSON-LD). Main issues: pure CSR delays Google indexing, missing og-image.png, outdated sitemap (2024 dates), no hreflang tags. Two approaches analyzed below.

## Current State
| Asset | Status |
|-------|--------|
| Meta tags, OG, Twitter Cards | ✅ Present |
| JSON-LD (WebApplication, Organization) | ✅ Present |
| sitemap.xml | ⚠️ Only 3 pages, outdated dates |
| robots.txt | ✅ Good |
| og-image.png | ❌ Missing (referenced but not exists) |
| Dynamic meta per route | ❌ Missing |
| hreflang tags | ❌ Missing |
| Pre-rendering/SSR | ❌ Pure CSR |

## Approach Comparison

| Criteria | Approach A: Quick Wins | Approach B: SSR Migration |
|----------|----------------------|---------------------------|
| **Effort** | 8h | 24h+ |
| **SEO Impact** | Medium (70%) | High (95%) |
| **Risk** | Low | Medium-High |
| **Timeline** | 1-2 days | 1-2 weeks |
| **Arch Change** | None | React Router v7 SSR |
| **Maintenance** | Low | Higher |

### Approach A: Quick Wins (Recommended)
- Prerender.io middleware for crawler-ready HTML
- react-helmet-async for dynamic meta tags
- Create og-image.png (1200x630)
- Enhanced sitemap with all public routes
- Add hreflang tags for vi/en

### Approach B: SSR Migration
- Migrate to React Router v7 with SSR
- Full server-side rendering
- Dynamic meta tags server-generated
- Requires Node.js hosting changes

## Recommendation
**Go with Approach A** for these reasons:
1. Dashboard is auth-gated; only landing/login/register need SEO
2. ROI: 8h effort for ~70% SEO improvement vs 24h for marginal gains
3. Low risk; no architectural changes
4. Prerender.io handles crawler rendering without code changes

## Phase Overview

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| [Phase 1](./phase-01-og-image-and-assets.md) | Create og-image.png + verify assets | 1h | ✅ done |
| [Phase 2](./phase-02-react-helmet-async.md) | Add react-helmet-async for dynamic meta | 2h | pending |
| [Phase 3](./phase-03-enhanced-sitemap.md) | Expand sitemap + add hreflang | 1.5h | pending |
| [Phase 4](./phase-04-prerender-middleware.md) | Setup Prerender.io or equivalent | 2h | pending |
| [Phase 5](./phase-05-core-web-vitals.md) | Optimize LCP, CLS, INP | 1.5h | pending |

## Success Criteria
- [ ] og-image.png exists and displays on social shares
- [ ] Each route has unique meta title/description
- [ ] sitemap.xml includes all public pages with 2026 dates
- [ ] Google Search Console shows no crawl errors
- [ ] Lighthouse SEO score >= 95

## Unresolved Questions
1. Does current Caddy/hosting support Prerender.io middleware or need proxy config?
2. Are there plans for public-facing pages beyond login/register (e.g., pricing, blog)?
