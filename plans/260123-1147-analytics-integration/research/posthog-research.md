# PostHog Analytics Research Report

## 1. Hosting Strategy: Cloud vs. Self-Hosted

**Recommendation: PostHog Cloud (US or EU)**

*   **PostHog Cloud:**
    *   **Pros:** Zero maintenance, instant setup, generous free tier (1M events/mo), frequent updates, dedicated support.
    *   **Cons:** Data leaves infrastructure (though GDPR compliant options exist).
    *   **Pricing:** Free up to 1M events/month. Pay-as-you-go afterwards.
*   **Self-Hosted (Open Source / Hobby):**
    *   **Status:** *Strictly deprecated* for production use without significant DevOps resources. PostHog has moved away from easy self-hosting (Kubernetes/Helm required).
    *   **Cons:** High complexity (ClickHouse, Kafka, Zookeeper, Postgres, Redis), resource intensive, maintenance heavy.
    *   **Verdict:** **Avoid self-hosting** unless strictly required by compliance (e.g., HIPAA with no BAA) and you have a dedicated DevOps team.

## 2. React Integration (Frontend)

**Library:** `posthog-js`
**Component:** `PostHogProvider`

### Implementation
1.  **Initialize:** Wrap app in `PostHogProvider` with API key and host.
2.  **Hooks:**
    *   `usePostHog()`: Access client instance.
    *   `useFeatureFlagEnabled('flag-key')`: Check feature flags.
    *   `useActiveFeatureFlags()`: List all flags.
3.  **Automatic Capture:** Pageviews ($pageview), autocapture (clicks, inputs) - can be disabled for privacy.

```javascript
// provider-setup.tsx
import { PostHogProvider } from 'posthog-js/react'

const options = {
  api_host: process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com',
}

export function AnalyticsProvider({ children }) {
  return <PostHogProvider apiKey={...} options={options}>{children}</PostHogProvider>
}
```

## 3. Fastify/Node.js Integration (Backend)

**Library:** `posthog-node`

### Implementation
*   **Performance:** PostHog Node SDK supports batching and caching to minimize impact on API latency.
*   **Setup:** Initialize client singleton. Ensure `client.shutdown()` is called on server close.
*   **Usage:**
    *   `capture({ distinctId, event, properties })`: Track backend events (e.g., "Order Processed", "API Error").
    *   `alias({ distinctId, alias })`: Link anonymous frontend IDs to authenticated backend IDs.

```javascript
// analytics-service.ts
import { PostHog } from 'posthog-node'

const client = new PostHog(
    '<ph_project_api_key>',
    { host: 'https://us.i.posthog.com' }
)

export async function trackEvent(userId: string, event: string, props: any) {
  client.capture({ distinctId: userId, event, properties: props })
}
```

## 4. Event Tracking Best Practices

### Naming Conventions
*   **Format:** `snake_case` (e.g., `button_clicked` not `buttonClicked`).
*   **Structure:** `[object]_[action]` or `[category]:[object]_[action]`
    *   *Good:* `signup_button_clicked`, `invoice_generated`
    *   *Bad:* `Click`, `User did something`
*   **Properties:** Flatten properties where possible. Use standardized property names (`is_premium`, `total_amount`).

### Data Management
*   **Identify Users:** Call `posthog.identify(userId)` immediately after login.
*   **Group Analytics:** Use `group()` for B2B features (tracking events by "Organization" or "Team").

## 5. Privacy & GDPR Compliance

*   **EU Hosting:** Use `eu.i.posthog.com` to keep data within the EU.
*   **Cookie Consent:**
    *   PostHog supports "memory mode" (cookies disabled) until consent is granted.
    *   `posthog.opt_in_capturing()` / `posthog.opt_out_capturing()` for easy toggle.
*   **Anonymization:** Feature to mask IP addresses (`$ip: null`).
*   **Data Deletion:** APIs available to delete person data (Right to be Forgotten).

## Unresolved Questions
*   Do we need B2B "Group Analytics" (paid add-on)?
*   Specific list of high-priority events to track for MVP?
*   Should we implement a proxy to bypass ad-blockers (PostHog recommendation)?

## Sources
*   [PostHog React Integration](https://posthog.com/docs/libraries/react)
*   [PostHog Node.js Integration](https://posthog.com/docs/libraries/node)
*   [Event Naming Best Practices](https://posthog.com/docs/data/event-naming)
