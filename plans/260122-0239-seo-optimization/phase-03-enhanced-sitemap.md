# Phase 3: Enhanced Sitemap and Hreflang

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 1.5h

Expand sitemap.xml and add hreflang for i18n.

## Key Insights
- Current sitemap: Only 3 pages, dates from 2024
- Missing: hreflang tags for vi/en language support
- Should use vite-plugin-sitemap for automation

## Implementation Steps

1. **Install vite-plugin-sitemap**
   ```bash
   cd services/web && npm install -D vite-plugin-sitemap
   ```

2. **Configure in vite.config.ts**
   ```ts
   import Sitemap from 'vite-plugin-sitemap';

   plugins: [
     Sitemap({
       hostname: 'https://manhquy.click',
       dynamicRoutes: ['/', '/login', '/register'],
       lastmod: new Date(),
     })
   ]
   ```

3. **Add hreflang to index.html**
   ```html
   <link rel="alternate" hreflang="vi" href="https://manhquy.click/" />
   <link rel="alternate" hreflang="en" href="https://manhquy.click/?lang=en" />
   <link rel="alternate" hreflang="x-default" href="https://manhquy.click/" />
   ```

4. **Update robots.txt**
   - Verify sitemap URL correct
   - Add any new public routes

5. **Manual sitemap update (fallback)**
   - Update lastmod to 2026-01-22
   - Ensure all public routes listed

## Files to Modify
- `services/web/vite.config.ts`
- `services/web/index.html`
- `services/web/public/robots.txt`

## Success Criteria
- [ ] sitemap.xml auto-generated on build
- [ ] lastmod dates are current (2026)
- [ ] hreflang tags present in <head>
- [ ] Google Search Console accepts sitemap
