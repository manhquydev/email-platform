# Phase 5: Core Web Vitals Optimization

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 1.5h

Optimize LCP, CLS, and INP for better rankings.

## Key Insights
- Google uses Core Web Vitals as ranking signal
- INP (Interaction to Next Paint) replaced FID in 2024
- SPA hydration often blocks main thread (hurts INP)

## Metrics Targets
| Metric | Target | Description |
|--------|--------|-------------|
| LCP | < 2.5s | Largest Contentful Paint |
| CLS | < 0.1 | Cumulative Layout Shift |
| INP | < 200ms | Interaction to Next Paint |

## Implementation Steps

1. **Measure current performance**
   ```bash
   npx lighthouse https://manhquy.click --view
   ```

2. **Optimize LCP**
   - Preload hero images: `<link rel="preload" as="image">`
   - Inline critical CSS
   - Avoid lazy-loading above-fold content

3. **Fix CLS**
   - Add explicit width/height to images
   - Reserve space for dynamic content
   - Avoid layout shifts from fonts loading

4. **Improve INP**
   - Use React.lazy() for route-based code splitting
   - Defer non-critical scripts
   - Avoid long tasks in hydration

5. **Asset optimization**
   - Install vite-plugin-imagemin for image compression
   - Use modern formats (WebP, AVIF)
   - Configure proper caching headers in Caddy

6. **PWA caching**
   - Verify vite-plugin-pwa configured
   - Cache static assets aggressively

## Files to Modify
- `services/web/vite.config.ts`
- `services/web/index.html`
- Image assets in `services/web/public/`

## Success Criteria
- [ ] Lighthouse Performance score >= 90
- [ ] LCP < 2.5s on mobile 3G
- [ ] CLS < 0.1
- [ ] INP < 200ms
- [ ] All images have width/height attributes
