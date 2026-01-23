# API & SDK Ecosystem Development Plan

```yaml
status: pending
created: 2026-01-23
estimated_duration: 17-24 weeks
phases: 4
priority: HIGH
```

## Overview

Phát triển hệ thống API hỗ trợ SDKs toàn diện cho Ephemera Email Platform.

**Goals:**
- OpenAPI spec với 100% route coverage
- 7 SDKs published (Python, JS/TS, CLI, Go, PHP, Java, .NET)
- Developer portal với interactive playground
- Contract testing cho API stability

## Current State

| Component | Maturity | Files |
|-----------|----------|-------|
| API Backend | 85% | 46 routes in `services/api/src/routes/` |
| Python SDK | 60% | `packages/sdk-python/` (4 files) |
| JS/TS SDK | 65% | `packages/sdk-js/` (4 files) |
| CLI | 30% | `packages/cli/` (minimal) |

## Phases

| Phase | Name | Duration | Status |
|-------|------|----------|--------|
| 1 | [Foundation](./phase-01-foundation.md) | 4-6 weeks | ✅ DONE (5d7ebd0) |
| 2 | [Core SDKs](./phase-02-core-sdks.md) | 6-8 weeks | 🔄 IN_PROGRESS |
| 3 | [Extended SDKs](./phase-03-extended-sdks.md) | 4-6 weeks | ✅ DONE |
| 4 | [Developer Portal](./phase-04-developer-portal.md) | 3-4 weeks | pending |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    OpenAPI Spec                         │
│                  (Source of Truth)                      │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Auto-gen│  │ Docs    │  │Contract │
   │ SDKs    │  │ Site    │  │ Tests   │
   └────┬────┘  └─────────┘  └─────────┘
        │
        ▼
   ┌─────────────────────────────────────┐
   │           Manual Polish              │
   │  (DX improvements, helper methods)   │
   └─────────────────────────────────────┘
        │
        ▼
   ┌─────────────────────────────────────┐
   │   Published SDKs (7 languages)      │
   │  npm | PyPI | Go | Packagist | etc  │
   └─────────────────────────────────────┘
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Versioning | `/v1/` URL prefix | Industry standard, explicit |
| SDK Generator | OpenAPI Generator | Open-source, multi-language |
| Repository | Monorepo (`packages/`) | Cross-SDK maintenance |
| Testing | Contract testing | OpenAPI as contract |
| Docs | Docusaurus | Modern, searchable |

## Success Criteria

- [ ] OpenAPI 3.1 spec với 100% route coverage
- [ ] API versioning `/v1/` deployed
- [ ] Rate limit headers standardized
- [ ] Webhook HMAC signatures implemented
- [ ] All 7 SDKs published to package managers
- [ ] Developer portal live với <2s page load
- [ ] 90%+ documentation coverage
- [ ] CI/CD pipeline for all SDKs

## Dependencies

- Node.js 20+, TypeScript 5+
- Python 3.10+, Go 1.21+
- Java 17+, .NET 8+, PHP 8.2+
- OpenAPI Generator CLI
- Docusaurus 3.x

## Related Documents

- [Brainstorm Report](../reports/brainstorm-260123-1204-api-sdk-ecosystem-development.md)
- [System Architecture](../../docs/system-architecture.md)
- [Code Standards](../../docs/code-standards.md)
