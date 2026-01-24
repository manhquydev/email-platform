# Plausible Analytics Research Report

## 1. Self-hosted vs Cloud
| Feature | Cloud (Managed) | Self-hosted |
|:---|:---|:---|
| **Pricing** | Starts at ~$9/mo (10k views) | Free (Open Source AGPLv3) |
| **Infrastructure** | Managed by Plausible | Requires VPS (Docker/Docker Compose) |
| **Maintenance** | None (Auto-updates) | Manual updates, backups, server security |
| **Data Ownership** | 100% yours, hosted in EU | 100% yours, hosted on your server |
| **Features** | Full feature set, Email reports | Full feature set (parity is high) |
| **Complexity** | Zero setup | Moderate (requires DevOps skills) |

**Recommendation:** Start with **Cloud** for speed/reliability. Switch to **Self-hosted** only if costs scale strictly or data sovereignty requirements mandate it.

## 2. React/SPA Integration
Plausible works seamlessly with SPAs (React, Next.js, Vue) using the History API (`pushState`).

### Implementation
**Option A: Official Snippet (Simple)**
Add script to `index.html`. It automatically detects `pushState` navigation.
```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

**Option B: `plausible-tracker` (Recommended for React)**
Provides types and granular control.
```bash
npm install plausible-tracker
```
```javascript
// hooks/useAnalytics.ts
import Plausible from 'plausible-tracker'

const plausible = Plausible({
  domain: 'yourdomain.com',
  apiHost: 'https://plausible.io' // or self-hosted URL
})

export const trackPageview = () => plausible.trackPageview()
export const trackEvent = (name, props) => plausible.trackEvent(name, { props })
```

## 3. Custom Events and Goals
Goals in Plausible are conversions triggered by Pageviews or Custom Events.

1. **Define in UI:** Go to *Site Settings > Goals > Add Goal*. Choose "Custom Event" and enter exact event name (e.g., `Signup`).
2. **Trigger in Code:**
```javascript
// Example: Tracking a button click
<button onClick={() => trackEvent('Signup', { source: 'landing_page' })}>
  Sign Up
</button>
```
*Note: Props are optional but useful for filtering in dashboard.*

## 4. API & Backend Integration
Plausible offers two main APIs:

### Events API (Ingestion)
Send server-side events (e.g., API usage, backend triggers).
- **Endpoint:** `POST /api/event`
- **Headers:** `User-Agent` (Browser UA), `X-Forwarded-For` (User IP)
- **Payload:**
```json
{
  "name": "pageview",
  "url": "https://yoursite.com/api-trigger",
  "domain": "yoursite.com",
  "props": { "key": "value" }
}
```

### Stats API (Read)
Retrieve analytics data programmatically for custom dashboards.
- **Endpoint:** `GET /api/v1/stats/...`
- **Auth:** Bearer Token (generated in User Settings)

## 5. Privacy-First Approach (GDPR/CCPA)
- **No Cookies:** Does not use cookies or local storage. No cookie banner required.
- **No PII:** IP addresses are hashed with a daily salt and discarded. User behavior cannot be traced back to individuals.
- **Compliance:** fully GDPR, CCPA, and PECR compliant out of the box.
- **Size:** Script is <1KB (vs Google Analytics ~45KB), ensuring fast load times.

## Unresolved Questions
1. Does the current email platform infrastructure allow for a dedicated Docker container for self-hosting (if chosen)?
2. Are there specific custom events (e.g., "Email Sent", "Contact Created") that need to be tracked server-side vs client-side?
