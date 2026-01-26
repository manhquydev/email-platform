# Scout Report: Ephemera Capability Gap Analysis
**Date:** 2026-01-25
**Subject:** Deep Analysis of Platform Capabilities vs. Market Requirements

## 1. Executive Summary
Ephemera has a robust foundation as an inbound-first email alias service with a modern tech stack (Fastify, React, Prisma, Docker). Core alias management, receiving, and web interface are mature. Significant gaps exist in outbound deliverability infrastructure, advanced team collaboration features, and native mobile parity.

## 2. Capability Matrix

### 🟢 Fully Implemented (Competitive/Ready)
*   **Core Email Ingestion:** SMTP server (smtp-server) with mailparser and Maildir sync.
*   **Authentication:** Email/Pass, TOTP (2FA), Telegram Auth Widget, API Keys.
*   **Billing Infrastructure:** Dual-gateway support (Stripe & SePay), tiered subscriptions, usage-based packages, and redemption codes.
*   **Real-time Layer:** WebSocket & SSE implementation with Redis Pub/Sub for instant updates.
*   **Browser Extension:** Cross-browser (WXT), field detection, and inbox management.
*   **Spam/Virus Protection:** Integrated Rspamd and ClamAV (virusScanner).

### 🟡 Partially Implemented (Needs Polish/Completion)
*   **Outbound Email:**
    *   *Status:* Schema supports `OutboundMessage`, `DomainDkim`, and `BounceSuppression`.
    *   *Gap:* High-reputation delivery pipeline, IP rotation logic, and feedback loop processing need verification.
*   **Passkey/WebAuthn:**
    *   *Status:* `PasskeyCredential` model exists, library installed.
    *   *Gap:* Full UI integration and "Passkey-first" login flow validation.
*   **AI Integration:**
    *   *Status:* `aiSummary` field and service exist.
    *   *Gap:* Smart Compose, Smart Reply, and semantic search (natural language query) are missing.
*   **Mobile App:**
    *   *Status:* Expo/React Native codebase exists (`services/mobile`).
    *   *Gap:* Feature parity with web (settings, advanced filters) and native deep linking.

### 🔴 Missing / High-Priority Gaps
1.  **Team Collaboration (Shared Inboxes):**
    *   *Requirement:* Multi-user access to single alias, assignment, internal comments.
    *   *Current:* Schema has `Team`, `TeamMember`, `TeamInbox` but business logic/UI appears nascent.
2.  **SSO / Enterprise Auth:**
    *   *Requirement:* SAML/OIDC for business customers.
    *   *Current:* Only standard auth and Telegram.
3.  **Advanced Encryption:**
    *   *Requirement:* Zero-access encryption or PGP support for privacy focus.
    *   *Current:* Standard TLS/At-rest DB encryption. No end-to-end encryption for stored emails.
4.  **API Ecosystem:**
    *   *Requirement:* Official SDKs (Python/Node/Go).
    *   *Current:* Standard REST API + Swagger only.

## 3. Detailed Infrastructure Analysis

| Component | Stack | Status | Notes |
| :--- | :--- | :--- | :--- |
| **API** | Node/Fastify/Prisma | ✅ Mature | Modular, well-structured, rate-limited. |
| **Frontend** | React/Vite/Tailwind | ✅ Mature | Responsive, PWA-ready. |
| **DB** | Postgres 16 | ✅ Mature | Robust schema, extensive indexing. |
| **Queue** | BullMQ/Redis | ✅ Mature | Webhook & Email processing queues. |
| **Search** | Postgres Text | ⚠️ Basic | Needs generic text search or Elasticsearch for scale. |
| **Monitoring**| Prom/Grafana | ✅ Mature | Dockerized stack ready. |

## 4. Recommendations & Roadmap Alignment

1.  **Phase 1 (Immediate - High Impact):**
    *   Finalize **Outbound Email** infrastructure (DKIM signing/SPF automation) to allow users to *reply* from aliases reliably.
    *   Polish **Team Inboxes** to unlock B2B/Enterprise revenue tiers.

2.  **Phase 2 (Differentiation):**
    *   Expand **AI Features** beyond summary: Auto-categorization (News/Bills/Personal) and "Smart Reply" to compete with Gmail.
    *   Implement **Passkey-first** auth for frictionless security.

3.  **Phase 3 (Scale):**
    *   Extract Search to a dedicated engine (MeiliSearch or Elasticsearch) for message body search performance.
    *   Develop official **API SDKs** to encourage developer adoption.

## 5. Unresolved Questions
*   Is the `services/mobile` app currently buildable and published?
*   What is the specific provider for the `ai-summarization.service.ts` (OpenAI, Anthropic, or Local)?
*   Is `google-auth-library` used strictly for Gmail import or authentication?

