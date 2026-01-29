# Research Report: Outbound Email & Team Collaboration

**Date:** 2026-01-10
**Project:** Ephemera (Temp Mail Platform)
**Author:** Researcher Agent

## 1. Outbound Email Implementation

### DKIM Signing (Node.js)
- **Primary Library:** `nodemailer` is the industry standard. Handles DKIM signing natively without extra dependencies.
- **Key Best Practices:**
    - **Canonicalization:** Use `relaxed/relaxed` to prevent signature breakage by MTA header modifications.
    - **Algorithm:** Use `rsa-sha256`.
    - **Security:** Private keys MUST be stored securely (Env vars, AWS Secrets Manager, or HashiCorp Vault). Never check into git.
    - **Headers:** Sign mandatory headers: `From`, `To`, `Subject`, `Date`, `Message-ID`.

### SMTP Relay & Deliverability
- **Strategy:** Use a Hybrid approach. 3rd party relays (SES, Postmark, SendGrid) are recommended over self-hosting outbound to avoid IP blacklisting.
- **Auth:** Require `STARTTLS` and `SMTP AUTH`.
- **DNS:** Domains must have valid SPF, DKIM, and DMARC records. Ephemera's UI already surfaces these; outbound implementation must verify them before sending.

### Bounce & Complaint Handling
- **Mechanism:** Webhooks are standard.
- **Logic:**
    - **Hard Bounce (Permanent):** Immediate addition to local `SuppressionList`. Stop all future attempts.
    - **Soft Bounce (Transient):** Exponential backoff retry (handled by relay). Monitor for frequency; convert to hard if limit reached.
    - **Complaints:** Treat like hard bounces to protect sender score.
- **Storage:** Use Redis for fast lookup during `POST /send` and PostgreSQL for persistent audit logs.

## 2. Team Collaboration Features

### Shared Inbox Patterns
- **Concept:** Inboxes are owned by a `Team` (or `Organization`) rather than an individual `User`.
- **Collaboration Flow:**
    - **Assignment:** Assign messages to specific team members (`assigned_to_user_id`).
    - **Status Tracking:** `Open`, `Pending`, `Resolved` states for messages.
    - **Internal Notes:** "Private comments" thread attached to emails, visible only to team members.

### Permissions Models (RBAC/ABAC)
- **Roles:**
    - **Owner:** Full billing, team management, and inbox access.
    - **Admin:** Team management and inbox access.
    - **Member:** Can read, reply, and assign messages.
    - **Observer:** Read-only access to specific inboxes.
- **Granular Permissions:**
    - `inbox:read`, `inbox:reply`, `inbox:delete`, `team:invite`.

### Implementation Path for Premium Tier
- **Database:** Add `Organization` and `Membership` tables. Link `Inbox` to `Organization`.
- **Middleware:** Validate `User` has `Membership` in the `Organization` owning the `Inbox` before processing requests.

## Sources
- [Nodemailer DKIM Documentation](https://nodemailer.com/dkim/)
- [Postmark Bounce Handling Guide](https://postmarkapp.com/guides/everything-you-need-to-know-about-bounces)
- [Shared Inbox Best Practices (Canary Mail)](https://canarymail.io/blog/shared-inbox-best-practices/)
- [SMTP Relay Security (SMTP.com)](https://www.smtp.com/resources/smtp-relay-best-practices/)

## Unresolved Questions
1. Should Ephemera support "Send on Behalf" (showing the individual user's name) or strictly "Send As" (the shared inbox address)?
2. How should attachment storage costs be attributed in a team environment (per organization quota vs per user)?
3. Do we need a dedicated "Draft" state for team reviews before an outbound email is actually sent?
