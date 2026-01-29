---
title: "Enterprise Webmail Test Plan"
description: "Docker-based comprehensive testing for 8-phase Enterprise Webmail implementation"
status: pending
priority: P1
effort: 12h
branch: main
tags: [testing, docker, imap, smtp, enterprise]
created: 2026-01-29
---

# Enterprise Webmail Test Plan

## Summary

Docker-based test suite for Enterprise Webmail expansion covering multi-tenancy, IMAP/POP3, SMTP submission, identity integration, folders, CalDAV/CardDAV, compliance, and admin dashboard.

## Phase Overview

| Phase | Test File | Focus | Priority |
|-------|-----------|-------|----------|
| 01 | [phase-01-test-multitenancy.md](phase-01-test-multitenancy.md) | Tenant isolation, domains, RBAC | P1 |
| 02 | [phase-02-test-imap-pop3.md](phase-02-test-imap-pop3.md) | Protocol compliance, client compat | P1 |
| 03 | [phase-03-test-smtp.md](phase-03-test-smtp.md) | Submission, DKIM, delivery | P1 |
| 04 | [phase-04-test-identity.md](phase-04-test-identity.md) | LDAP, SAML, OIDC, SCIM | P2 |
| 05 | [phase-05-test-folders.md](phase-05-test-folders.md) | Hierarchy, move/copy, threading | P1 |
| 06 | [phase-06-test-caldav-carddav.md](phase-06-test-caldav-carddav.md) | Calendar/contact sync | P2 |
| 07 | [phase-07-test-compliance.md](phase-07-test-compliance.md) | Audit, legal hold, DLP | P2 |
| 08 | [phase-08-test-admin.md](phase-08-test-admin.md) | RBAC, migration, monitoring | P3 |

## Test Infrastructure

### Docker Compose Test Stack

```yaml
# docker-compose.test.yml
services:
  test-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: email_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    tmpfs: /var/lib/postgresql/data

  test-redis:
    image: redis:7-alpine
    tmpfs: /data

  test-ldap:
    image: osixia/openldap:1.5.0
    environment:
      LDAP_ORGANISATION: "Test Org"
      LDAP_DOMAIN: "test.local"
      LDAP_ADMIN_PASSWORD: "admin"

  test-api:
    build: ./services/api
    depends_on: [test-db, test-redis]
    environment:
      DATABASE_URL: postgresql://test:test@test-db:5432/email_test
      REDIS_HOST: test-redis
      NODE_ENV: test
    ports:
      - "3001:3001"
      - "143:143"
      - "993:993"
      - "110:110"
      - "995:995"
      - "587:587"
      - "465:465"
```

### Run Commands

```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d

# Run all tests
docker compose -f docker-compose.test.yml exec test-api npm test

# Run specific phase tests
docker compose -f docker-compose.test.yml exec test-api npm test -- --grep "Phase01"

# Protocol tests with external clients
docker run --rm --network host imaptest thunderbird-compat.js
```

## Test Categories

1. **Unit Tests** - Service/function level
2. **Integration Tests** - API endpoints with DB
3. **Protocol Tests** - IMAP/POP3/SMTP wire protocol
4. **E2E Tests** - Full user flows
5. **Client Compatibility** - Thunderbird, Outlook simulation

## Success Metrics

- All P1 phases: 100% test pass rate
- Protocol tests: RFC compliance verified
- Client compat: Thunderbird, Outlook, Apple Mail
- Performance: 1000 concurrent IMAP connections stable
- Security: No tenant data leakage

## Dependencies

- Node.js test runner (vitest/jest)
- `imapflow` for IMAP client tests
- `nodemailer` for SMTP tests
- `ldapjs` for LDAP mock
- Docker Compose 2.x
