---
title: "Enterprise Webmail Transformation"
description: "Transform Ephemera from disposable inbox to enterprise webmail suite"
status: pending
priority: P1
effort: 40h
branch: main
tags: [enterprise, webmail, imap, ldap, compliance]
created: 2026-01-28
---

# Enterprise Webmail Expansion Plan

## Summary

Transform Ephemera from a disposable inbox platform into a full enterprise webmail suite. Leverage existing Node.js/Fastify stack, adding IMAP/POP3 protocols, identity integration, and compliance tools.

**Target Market**: SMEs, MSPs, privacy-focused orgs ($3.74B market, 15% self-hosted CAGR)
**Differentiator**: Gmail-quality UX on self-hosted infrastructure

## Phase Overview

| Phase | Title | Effort | Status | Priority |
|-------|-------|--------|--------|----------|
| 01 | [Multi-tenancy & Custom Domains](phase-01-multi-tenancy-custom-domains.md) | 4h | pending | P1 |
| 02 | [IMAP/POP3 Protocol Support](phase-02-imap-pop3-protocols.md) | 8h | pending | P1 |
| 03 | [SMTP Submission](phase-03-smtp-submission.md) | 4h | pending | P1 |
| 04 | [Identity Integration](phase-04-identity-integration.md) | 6h | pending | P2 |
| 05 | [Folders & Storage Hierarchy](phase-05-folders-storage.md) | 4h | pending | P1 |
| 06 | [CalDAV/CardDAV Productivity](phase-06-caldav-carddav.md) | 6h | pending | P2 |
| 07 | [Compliance Tools](phase-07-compliance-tools.md) | 5h | pending | P2 |
| 08 | [Admin Dashboard Enhancement](phase-08-admin-dashboard.md) | 3h | pending | P3 |

## MVP Scope (Phases 1-3, 5)

Enable enterprise adoption with:
- Multi-tenant architecture with custom domains
- Standard IMAP/POP3 access for Outlook/Thunderbird
- SMTP submission for user outbound
- Folder hierarchy (Inbox, Sent, Drafts, Trash, Archive)

## Key Dependencies

- **External**: `wildduck` or `imapflow` for IMAP, `nodemailer` for SMTP
- **Infrastructure**: Separate IMAP port (993), SMTP submission (587/465)
- **Database**: Schema extensions for folders, tenants, audit logs

## Research Reports

- [Market Analysis](research/researcher-01-market-analysis.md)
- [Technical Requirements](research/researcher-02-technical-requirements.md)

## Architecture Decisions

1. **IMAP Server**: Use `wildduck` (battle-tested) or build with `imapflow`
2. **Multi-tenancy**: Tenant ID foreign key on all tables, not separate DBs
3. **Storage**: Keep PostgreSQL + disk; add S3-compatible for scale
4. **Identity**: Modular auth adapters (LDAP, SAML, OIDC)
