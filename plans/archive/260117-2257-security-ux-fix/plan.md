---
title: "Security & UX Critical Fixes"
description: "Fix 70 issues from audit: 6 Critical, 22 High, 33 Medium across security and UX"
status: pending
priority: P1
effort: 32h
branch: main
tags: [security, performance, ux, critical, bugfix]
created: 2026-01-17
---

# Security & UX Critical Fixes Plan

## Overview

Comprehensive fix plan addressing 70 issues discovered during project audit (2026-01-17). Security Posture: 6.5/10 → Target: 8.5/10.

**Audit Reports:**
- [Admin Security Audit](../reports/code-reviewer-260117-2302-admin-security-audit.md)

**Research:**
- [Security Patterns](./research/researcher-01-security-patterns.md)
- [UX Performance](./research/researcher-02-ux-performance.md)

## Phases

| # | Phase | Priority | Status | Effort | Link |
|---|-------|----------|--------|--------|------|
| 1 | Critical Security | P0 | Pending | 6h | [phase-01](./phase-01-critical-security.md) |
| 2 | Critical UX | P0 | Pending | 6h | [phase-02](./phase-02-critical-ux.md) |
| 3 | High Security | P1 | Pending | 8h | [phase-03](./phase-03-high-security.md) |
| 4 | High UX/Performance | P1 | Pending | 8h | [phase-04](./phase-04-high-ux-performance.md) |
| 5 | Medium Priority | P2 | Pending | 4h | [phase-05](./phase-05-medium-priority.md) |

## Issue Summary

| Severity | Count | Phase |
|----------|-------|-------|
| Critical | 6 | 1, 2 |
| High | 22 | 3, 4 |
| Medium | 33 | 5 |
| Low | 9 | Backlog |

## Dependencies

- Redis (for JWT blacklist, rate limiting)
- PostgreSQL pg_trgm extension
- No breaking API changes

## Success Criteria

- [ ] All 6 Critical issues resolved
- [ ] Security Posture Score ≥ 8.0
- [ ] No N+1 queries in message list
- [ ] Real-time fallback working
- [ ] Mobile touch targets ≥ 44px

## Validation Summary

**Validated:** 2026-01-17
**Questions asked:** 7

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| JWT Strategy | Short-lived (15min) + Refresh Token (7 days) |
| Real-time Fallback | Custom WS→SSE→Polling (no Socket.io) |
| Audit IP Logging | Keep full IP (no anonymization) |
| Password Policy | 8 chars + complexity (upper, lower, number) |
| Pagination Strategy | Hybrid: cursor for messages, offset for admin |
| Extension CORS | Whitelist specific IDs via ENV variable |
| Phase Execution | Follow plan order (P0 → P1 → P2) |

### Action Items

- [ ] Update Phase 3: Remove IP anonymization step
- [ ] Update Phase 3: Add ALLOWED_EXTENSION_IDS to .env.example
- [ ] Confirm: Frontend team aware of refresh token changes
