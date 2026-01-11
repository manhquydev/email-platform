# Microsoft Clarity API Capabilities Research Report

## 1. Overview
Microsoft Clarity provides both client-side JavaScript APIs for session enhancement and a server-side Data Export API for programmatic data retrieval.

## 2. Client-Side APIs (Session Enhancement)
The following APIs are available via the `window.clarity` object.

### Custom Tags API
Used to filter sessions in the Clarity dashboard based on business logic.
```typescript
// window.clarity("set", "key", "value");
window.clarity("set", "plan", "pro");
window.clarity("set", "user_type", "admin");
```

### Custom Events API
Tracks specific user actions that aren't automatically captured.
```typescript
// window.clarity("event", "event_name");
window.clarity("event", "newsletter_signup");
```

### Identify API
Links sessions to specific user identifiers or metadata.
```typescript
// window.clarity("identify", "custom-id", "session-id", "page-id", "friendly-name");
window.clarity("identify", "user_123", "sess_999", "page_001", "John Doe");
```

### Cookie Consent (Consent V2)
Controls tracking based on user privacy choices. Essential for GDPR/EEA compliance.
```typescript
window.clarity('consentv2', {
  ad_Storage: "granted",
  analytics_Storage: "denied"
});
```

## 3. Programmatic Data Fetching
Clarity offers a **Data Export API** for live insights.
- **Endpoint:** `GET https://www.clarity.ms/export-data/api/v1/project-live-insights`
- **Auth:** JWT token (generated in Project Settings -> Data Export).
- **Capabilities:** Fetch metrics (scroll depth, engagement time) broken down by dimensions (browser, country, URL).
- **Limitations:** Limited to recent data (last 24-72 hours). For historical data, Power BI integration is recommended.

## 4. Enhancing /admin/analytics Page
Since Clarity dashboard cannot be iframed (blocked by `X-Frame-Options`), enhancements should focus on:
1. **Metric Aggregation:** Use the Data Export API to pull "Live Insights" (active users, popular pages) and display them in a custom dashboard.
2. **Deep Linking:** Provide buttons that link directly to filtered Clarity views (e.g., `https://clarity.ms/projects/uzly2516v2/recordings?custom_tag=user_id:123`).
3. **Heatmap Overlays:** While full embedding is blocked, you can use the Clarity Browser Extension approach or provide direct links to heatmap URLs.

## 5. React SPA Best Practices
- **Conditional Initialization:** Only initialize in production.
- **Identify on Login:** Call `identify` once the user session is established.
- **Route Tracking:** Clarity automatically handles SPAs, but manually firing `set` tags on route change can help with granular filtering.
- **Sensitive Data:** Use `data-clarity-mask` in JSX to hide sensitive PII from recordings.

## 6. Limitations & Alternatives
- **Iframe Blocking:** Clarity dashboard cannot be embedded. **Alternative:** Use the Data Export API + local charting library (Recharts/Chart.js).
- **Data Latency:** Export API is for "Live" data; historical deep-dives require the native dashboard.
- **Privacy:** Strict "no-consent" mode limits tracking accuracy.

## Sources
- [Microsoft Clarity Documentation](https://learn.microsoft.com/en-us/clarity/)
- [Clarity Data Export API Guide](https://learn.microsoft.com/en-us/clarity/data-export)
- [React Clarity Integration (Community)](https://github.com/microsoft/clarity-react)

**Unresolved Questions:**
- Are there specific rate limits for the Live Insights API? (Docs mention "anticipate rate limits" but not specific numbers).
- Can we programmatically generate "Recording" share links via API? (Currently seems dashboard-only).
