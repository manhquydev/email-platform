# Phase 1: Feasibility Assessment

## Current Architecture Analysis

### What Ephemera Has (Strengths)
- Modern stack: Node.js/Fastify + React 19 + Prisma/PostgreSQL
- Docker-ready deployment
- JWT auth with admin RBAC
- SMTP ingest via smtp-server library
- Message storage with attachments
- Rate limiting, abuse controls
- Prometheus metrics, health checks
- Multi-domain support with DNS verification

### Critical Gaps for Enterprise

| Gap | Severity | Effort | Notes |
|-----|----------|--------|-------|
| **IMAP/POP3 Server** | CRITICAL | 4-6 months | No existing code; need full implementation |
| **SMTP Submission (MSA)** | CRITICAL | 2-3 months | Currently ingest-only; need auth'd outbound |
| **LDAP/AD Integration** | HIGH | 2-3 months | No directory sync exists |
| **SSO (SAML/OIDC)** | HIGH | 1-2 months | JWT exists but no federation |
| **CalDAV/CardDAV** | HIGH | 3-4 months | Zero calendar/contacts infrastructure |
| **Encryption at Rest** | MEDIUM | 1 month | Currently plaintext storage |
| **Multi-tenant Isolation** | MEDIUM | 2 months | Basic exists; needs hardening |
| **Folder Hierarchy** | MEDIUM | 1-2 months | Current model is flat |
| **JMAP Protocol** | LOW | 2-3 months | Nice-to-have after IMAP |

## Development Effort Estimation

### Realistic Timeline: 18-24 Months

**Phase A (Months 1-6): Foundation**
- Multi-tenant data isolation
- Folder/label hierarchy
- Encryption at rest
- SMTP submission (outbound)

**Phase B (Months 7-12): Protocol Layer**
- IMAP4rev1 implementation
- POP3 (simplified)
- Desktop client compatibility testing

**Phase C (Months 13-16): Enterprise Auth**
- LDAP/AD integration
- SAML/OIDC SSO
- SCIM provisioning

**Phase D (Months 17-20): Productivity**
- CalDAV (calendar)
- CardDAV (contacts)
- Mobile sync improvements

**Phase E (Months 21-24): Compliance**
- Audit logging
- Legal hold
- eDiscovery
- DLP basics

## Risk Assessment

### High Risks
1. **Protocol Complexity**: IMAP is notoriously difficult. Bugs = lost emails = customer churn.
2. **Scope Creep**: Enterprise customers demand features endlessly.
3. **Competition**: Zimbra/Mailcow have decade head-starts.
4. **Talent**: IMAP/SMTP experts are rare and expensive.

### Medium Risks
1. **Calendar Sync**: CalDAV edge cases with Outlook/iOS.
2. **Migration**: Importing from Gmail/O365 is complex.
3. **Support Load**: Enterprise = high-touch support expectations.

### Low Risks
1. **Market Demand**: Proven and growing.
2. **Tech Stack**: Modern Node.js scales well.
3. **UX Differentiation**: Clear opportunity vs. competitors.

## Honest Pros & Cons

### Pros (Reasons to GO)
- Strong foundation exists (auth, multi-domain, observability)
- Market gap for "Gmail-quality self-hosted" is real
- Modern stack advantage over Java-based Zimbra
- $3.7B market with 5.2% growth
- SME segment underserved

### Cons (Reasons to PAUSE)
- 18-24 month timeline is long
- IMAP implementation is risky (complexity, bugs)
- Need specialized talent (protocol engineers)
- Competitors have 10+ years of polish
- Enterprise sales cycle is slow (6-12 months)

## Recommendation

**CONDITIONAL GO** - Proceed only if:

1. **Funding secured**: $800K-1.2M runway (18 months, 5-person team)
2. **Protocol expert hired**: IMAP/SMTP specialist is non-negotiable
3. **Phased approach**: Ship MVP to SMEs in 12 months, full enterprise at 24
4. **Partnership explored**: Consider integrating Dovecot for IMAP instead of building

**Alternative Path**: Stay focused on disposable inbox niche. Build "Ephemera for Teams" (shared temp inboxes, better admin) with 3-month effort instead of 24-month pivot.
