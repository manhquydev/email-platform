# Prerender Setup Guide

Guide for configuring pre-rendering to improve SEO for Ephemera SPA.

## Why Prerender?

React SPA = Client-Side Rendering (CSR). Google can render JS but with delay (queued). Prerender serves static HTML to crawlers for immediate indexing.

## Options

| Option | Cost | Effort | Best For |
|--------|------|--------|----------|
| Prerender.io | $15/mo (250 pages) | Low | Production |
| Rendertron | Free (self-hosted) | Medium | Cost-saving |
| vite-plugin-prerender | Free | Medium | Static sites |

## Option 1: Prerender.io (Recommended)

### Step 1: Sign Up
1. Go to https://prerender.io
2. Create account
3. Add domain: `manhquy.id.vn`
4. Get API token

### Step 2: Add Meta Tag
Uncomment in `services/web/index.html`:
```html
<meta name="prerender-token" content="YOUR_TOKEN_HERE" />
```

### Step 3: Configure Caddy
Add to Caddyfile:
```caddyfile
manhquy.id.vn {
    @bot {
        header_regexp User-Agent (?i)(googlebot|bingbot|yandex|baiduspider|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora|pinterest|slackbot|vkShare|W3C_Validator|whatsapp|applebot)
    }

    handle @bot {
        rewrite * /https://app.manhquy.id.vn{uri}
        reverse_proxy service.prerender.io:443 {
            header_up Host service.prerender.io
            header_up X-Prerender-Token {env.PRERENDER_TOKEN}
        }
    }

    handle {
        # Normal traffic to your app
        reverse_proxy localhost:5173
    }
}
```

### Step 4: Set Environment Variable
```bash
export PRERENDER_TOKEN="your-token-here"
```

### Step 5: Test
```bash
# Should return pre-rendered HTML
curl -A "Googlebot" https://app.manhquy.id.vn/

# Compare with normal response
curl https://app.manhquy.id.vn/
```

## Option 2: Self-Hosted Rendertron

### Step 1: Deploy Rendertron
```bash
docker run -d -p 3000:3000 --name rendertron googlechrome/rendertron
```

### Step 2: Configure Caddy
```caddyfile
manhquy.id.vn {
    @bot {
        header_regexp User-Agent (?i)(googlebot|bingbot|yandex)
    }

    handle @bot {
        reverse_proxy localhost:3000/render/https://app.manhquy.id.vn{uri}
    }

    handle {
        reverse_proxy localhost:5173
    }
}
```

## Option 3: Build-Time Prerender (Static)

For purely static public pages only.

```bash
npm install -D vite-plugin-prerender
```

```typescript
// vite.config.ts
import Prerender from 'vite-plugin-prerender';

plugins: [
  Prerender({
    routes: ['/', '/login', '/register', '/pricing'],
  })
]
```

**Limitation:** Only works for pages that don't require auth or dynamic data.

## Verification

1. **Google Search Console** → URL Inspection → Test Live URL
2. **Mobile-Friendly Test** → https://search.google.com/test/mobile-friendly
3. **Rich Results Test** → https://search.google.com/test/rich-results

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot not detected | Check User-Agent regex pattern |
| Timeout errors | Increase prerender timeout |
| Stale cache | Manually recache in Prerender.io dashboard |
| 403 errors | Verify token is correct |

## Current Status

- [x] Meta tag placeholder added to index.html
- [ ] Prerender.io account created
- [ ] Caddy configured
- [ ] Tested with Googlebot user-agent
