# Phase 4: Prerender Middleware Setup

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 2h

Configure pre-rendering for search engine crawlers.

## Key Insights
- Pure CSR = Google delays indexing (queued rendering)
- Prerender.io: Middleware detects bots, serves cached HTML
- Alternative: Self-hosted Rendertron or prerender-spa-plugin

## Options Analysis

| Option | Pros | Cons |
|--------|------|------|
| Prerender.io (SaaS) | Zero config, reliable | $15/mo for 250 pages |
| Rendertron (self-host) | Free, Google-made | Requires Node server |
| prerender-spa-plugin | Build-time, free | Static only, slow builds |

**Recommendation:** Prerender.io for production; Rendertron for cost-saving.

## Implementation Steps (Prerender.io)

1. **Sign up at prerender.io**
   - Get API token
   - Add domain: manhquy.click

2. **Configure Caddy reverse proxy**
   ```caddyfile
   @bot {
     header_regexp User-Agent (googlebot|bingbot|facebookexternalhit|twitterbot|linkedinbot)
   }

   handle @bot {
     reverse_proxy https://service.prerender.io {
       header_up X-Prerender-Token {env.PRERENDER_TOKEN}
     }
   }
   ```

3. **Add meta tag for verification**
   ```html
   <meta name="prerender-token" content="{token}" />
   ```

4. **Test with curl**
   ```bash
   curl -A "Googlebot" https://manhquy.click/
   ```

## Alternative: Build-time Prerender

1. **Install vite-plugin-prerender**
   ```bash
   npm install -D vite-plugin-prerender
   ```

2. **Configure routes to prerender**
   - `/`, `/login`, `/register`

## Files to Modify
- Caddy config (infrastructure)
- `services/web/index.html` (verification meta)

## Success Criteria
- [ ] Crawler user-agents receive static HTML
- [ ] Content visible in "View Page Source"
- [ ] Google Search Console fetch renders correctly
