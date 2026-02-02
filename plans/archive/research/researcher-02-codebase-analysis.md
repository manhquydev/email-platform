# Codebase Analysis: cPanel/WHMCS Integration

## 1. Current State
The backend foundation for the Hosting Provider API is largely complete and production-ready.

### Core Components
- **Service Layer**: `HostingProviderService` implements full lifecycle management for Tenants, Domains, and Mailboxes. `ProviderWebhookService` handles event dispatch with HMAC signatures.
- **API Layer**: `routes/provider.ts` exposes RESTful endpoints secured by `providerAuthMiddleware`.
- **Database**: Comprehensive schema (`HostingProvider`, `ProviderTenant`, `ProviderUsageLog`) supporting multi-tenancy and resource limits.
- **Authentication**: `X-Provider-Key` system with SHA-256 hashing is implemented.

### Feature Coverage
| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Provider Auth** | ✅ Ready | API Key generation & validation working |
| **Tenant Mgmt** | ✅ Ready | Create, Update, Suspend, Terminate |
| **Domain Mgmt** | ✅ Ready | Add, Verify (DNS), Remove |
| **Mailbox Mgmt** | ✅ Ready | Create, Delete, List |
| **Webhooks** | ✅ Ready | Async delivery, retries, signature verification |
| **Usage Stats** | ⚠️ Partial | Real-time calculation implemented; historical logging schema exists but not populated |

## 2. Gaps & Missing Integrations

### Critical Gaps
1.  **Admin UI**: No frontend interface exists for Super Admins to:
    -   Register new Hosting Providers.
    -   View provider usage/stats.
    -   Rotate provider API keys.
2.  **SSO / Auto-login**:
    -   **Issue**: Current API creates mailboxes with passwords.
    -   **Need**: Missing endpoint (e.g., `POST /tenants/:id/mailboxes/:email/sso`) to generate one-time login tokens for WHMCS "Login to Webmail" buttons.
3.  **Usage Logging**:
    -   **Issue**: `HostingProviderService.getUsage` calculates metrics on-the-fly via `count()` queries.
    -   **Risk**: Performance bottleneck for large providers.
    -   **Missing**: A cron job/scheduler to populate `ProviderUsageLog` for historical billing data.

### Minor Adjustments
-   **Plan Mapping**: `TenantPlan` enum (`LITE`, `PRO`, `BUSINESS`) needs to be flexible enough for cPanel/WHMCS package configuration or documented clearly.
-   **Rate Limiting**: Verify `rate-limit-config.ts` applies appropriate quotas to `/v1/provider/*` routes to prevent abuse.

## 3. Integration Checklist

### Phase 1: Admin Dashboard (Priority High)
- [ ] Create `services/web/src/pages/admin/ProvidersPage.tsx`.
- [ ] Add "Providers" to Admin Sidebar.
- [ ] Implement "Create Provider" modal (Name, Contact Email, Tier).
- [ ] Implement "View Details" drawer (API Key generation, Usage Stats).

### Phase 2: SSO Implementation (Priority High)
- [ ] Add `MagicLinkToken` generation logic to `HostingProviderService`.
- [ ] Expose `POST /v1/provider/tenants/:id/mailboxes/:email/sso` endpoint.
- [ ] Return short-lived URL: `https://webmail.domain.com/auth/magic-login?token=...`.

### Phase 3: Performance & Billing
- [ ] Implement nightly cron job to snapshot usage into `ProviderUsageLog`.
- [ ] Add "Billing" tab to Admin UI to view historical usage per provider.

## 4. Unresolved Questions
-   **Billing Model**: Does Ephemera bill Providers based on *allocated* quotas (Plans) or *actual* usage (Storage/Mailboxes)? Current code supports both but needs policy definition.
-   **Domain Verification**: Currently requires DNS TXT records. Does cPanel integration auto-add these records? (Assumed yes via plugin, needs verification).

## 5. Next Steps
1.  **Planner**: Create implementation plan for **Admin UI** and **SSO Endpoint**.
2.  **Frontend**: Build the Provider Management interface.
3.  **Backend**: Add the SSO endpoint to support WHMCS "Login as User".