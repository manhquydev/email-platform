---
title: "Telegram Authentication Integration"
description: "Add Telegram Login Widget for user registration and login"
status: completed
priority: P2
effort: 8h
branch: main
tags: [auth, telegram, security]
created: 2026-01-09
---

# Telegram Authentication Implementation Plan

## Overview

Add Telegram-based authentication using Telegram Login Widget. Users can:
- Login with existing account linked to Telegram
- Link Telegram to existing account (post-login)
- New users via Telegram must provide email (hybrid registration)

**Why Login Widget**: Simplest official solution, reuses existing bot, good UX.

**Key Limitation**: Telegram does NOT provide email. Platform requires email for inbox management.

## Architecture Decision

| Option | Approach | Chosen |
|--------|----------|--------|
| A | Telegram = link only (requires existing account) | No |
| B | Telegram + email prompt for new users | **Yes** |
| C | Mini Apps (TWA) | Overkill |

## Phases

| Phase | File | Effort | Status |
|-------|------|--------|--------|
| 01 | [Database Schema](./phase-01-database-schema.md) | 1h | completed |
| 02 | [Backend Auth Routes](./phase-02-backend-auth-routes.md) | 3h | completed |
| 03 | [Frontend Integration](./phase-03-frontend-integration.md) | 2h | completed |
| 04 | [Account Linking](./phase-04-account-linking.md) | 1h | completed |
| 05 | [Testing & Security](./phase-05-testing-security.md) | 1h | completed |

## Dependencies

- Existing Telegram bot (already configured for notifications)
- BotFather domain setup for Login Widget
- `TELEGRAM_BOT_TOKEN` env var (already exists)

## Security Requirements

- HMAC-SHA256 verification of all widget data
- `auth_date` freshness check (reject >24h)
- Rate limiting on `/auth/telegram` endpoints
- Audit logging for all Telegram auth events

## Research References

- [Telegram Login API](./research/researcher-01-telegram-login-api.md)
- [Alternative Methods](./research/researcher-02-telegram-alternative-auth.md)

## Success Criteria

1. Users can login via Telegram button on Login page
2. Existing users can link/unlink Telegram in Settings
3. New Telegram users prompted to provide email
4. All auth events logged to AuditLog
5. Security verification passes (HMAC, timestamp, rate limits)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Domain not configured in BotFather | Widget fails | Document setup in deployment guide |
| Telegram user has no username | Minor UX issue | Handle gracefully, display ID |
| Replay attacks | Security breach | Enforce `auth_date` < 24h |
