---
title: "Real-time Features Implementation"
description: "Add WebSocket, SSE fallback, and Browser Push notifications to replace polling"
status: completed
priority: P1
effort: 16h
branch: main
tags: [realtime, websocket, sse, push-notifications, performance]
created: 2026-01-13
---

# Real-time Features Implementation Plan

## Overview

Replace 10-60s polling intervals with instant real-time updates using WebSocket (primary), SSE (fallback), and Browser Push notifications (background).

## Current State

- **Polling locations**: Dashboard.tsx (10s), FocusDashboard.tsx (10s), useDashboardData.ts (10s), NotificationCenter.tsx (60s)
- **Existing push**: Telegram Bot, Webhooks via BullMQ
- **No WebSocket/SSE infrastructure**

## Goals

1. Instant email notifications (<500ms latency)
2. Reduced server load (eliminate polling)
3. Works in WebSocket-blocked environments (SSE fallback)
4. Background notifications when tab closed (Push API)

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Browser   │────▶│  API Server      │◀────│   Worker    │
│  WebSocket  │     │  @fastify/ws     │     │  (BullMQ)   │
│  or SSE     │     │                  │     │             │
└─────────────┘     └────────┬─────────┘     └──────┬──────┘
                             │                      │
                    ┌────────▼─────────┐           │
                    │   Redis Pub/Sub  │◀──────────┘
                    │   email:events   │
                    └──────────────────┘
```

## Phases

| Phase | Title | Effort | Status |
|-------|-------|--------|--------|
| [01](./phase-01-backend-infrastructure.md) | Backend Infrastructure | 3h | completed |
| [02](./phase-02-websocket-implementation.md) | WebSocket Implementation | 4h | completed |
| [03](./phase-03-sse-fallback.md) | SSE Fallback | 2h | completed |
| [04](./phase-04-push-notifications.md) | Browser Push Notifications | 4h | completed |
| [05](./phase-05-frontend-integration.md) | Frontend Integration | 3h | completed |

## Events

| Event | Description | Payload |
|-------|-------------|---------|
| `email.new` | New email received | `{inboxId, messageId, from, subject}` |
| `email.read` | Email marked read | `{messageId, isRead}` |
| `email.deleted` | Email deleted | `{messageId}` |
| `inbox.created` | New inbox created | `{inboxId, email}` |
| `notification.new` | System notification | `{id, title, type}` |

## Dependencies

- `@fastify/websocket` v11+ (already installed)
- `web-push` (new)
- `vite-plugin-pwa` (new, frontend)

## Validated Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| WebSocket Auth | First message auth | Token không lộ trong URL/logs |
| Connection Priority | WebSocket first, SSE fallback | WS cho latency thấp, SSE cho môi trường bị block |
| Push Scope | All events | email.new, email.read, email.deleted, inbox.created, notification.new |
| Fallback Polling | 30s khi mất kết nối | Đảm bảo UX khi realtime disconnect |

## Success Criteria

- [x] WebSocket connects with JWT auth via first message
- [x] New emails appear <500ms after worker processing
- [x] SSE works when WebSocket blocked
- [x] Push notifications work for all event types
- [x] Fallback polling (30s) when realtime disconnected
- [x] No memory leaks in connection management

## Risks

| Risk | Mitigation |
|------|------------|
| Memory leaks from connections | ConnectionManager with cleanup |
| Redis connection failures | Reconnection logic with backoff |
| Service Worker caching issues | versioned sw.js, skipWaiting |
