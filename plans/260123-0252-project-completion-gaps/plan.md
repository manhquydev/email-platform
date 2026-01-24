---
title: "Project Completion - Sales Form & Admin Orders"
description: "Complete missing functionality for Sales form and fix Admin Orders UI"
status: pending
priority: P1
effort: 4h
branch: main
tags: [sales, admin, payments, sepay]
created: 2026-01-23
---

# Project Completion Plan

## Overview

Two critical gaps identified in the email-platform project:
1. **Sales Form** (`/sales`) - UI exists but no backend/submit handler
2. **Admin Orders UI** - Displays legacy `stripePaymentId` instead of `sepayTransactionId`

## Approach Comparison

| Aspect | Approach A: Minimal MVP | Approach B: Full Implementation |
|--------|------------------------|--------------------------------|
| **Sales Form** | Simple POST endpoint + email notification | Honeypot, rate limiting, DB persistence, async email |
| **Admin Orders** | Direct field swap to `sepayTransactionId` | Dual ID display, copy button, enhanced UX |
| **Effort** | ~2h | ~4h |
| **Spam Protection** | None | Honeypot + rate limit |
| **Lead Tracking** | None (email only) | DB persistence for analytics |

## Recommendation

**Start with Approach A**, then iterate to B if needed. Rationale:
- Sales form is blocking zero leads currently (nothing works)
- Admin Orders fix is cosmetic but important for operations
- Getting to "works" fast > perfect implementation

## Phase Summary

| Phase | Description | Effort (A) | Effort (B) |
|-------|-------------|------------|------------|
| [Phase 1](./phase-01-sales-form-backend.md) | Sales form API endpoint | 30min | 1.5h |
| [Phase 2](./phase-02-sales-form-frontend.md) | Wire form with state/submit | 30min | 1h |
| [Phase 3](./phase-03-admin-orders-fix.md) | Update Admin Orders to show SePay IDs | 30min | 1h |

**Total:** ~1.5h (A) or ~3.5h (B)

## Files Affected

### Backend (API)
- `services/api/src/routes/public.ts` - Add contact endpoint
- `services/api/src/services/email-notification.service.ts` - (Optional B) Notification helper

### Frontend (Web)
- `services/web/src/pages/Support.tsx` - Wire Sales form
- `services/web/src/components/admin/AdminOrders.tsx` - Fix transaction ID display

### Database (Optional - Approach B only)
- `services/api/prisma/schema.prisma` - Add `SalesInquiry` model

## Dependencies

- Existing email service (Resend) for notifications
- `sepayTransactionId` already exists in Payment model

## Unresolved Questions

1. Should sales inquiries be persisted to DB for tracking? (Approach B adds this)
2. Is SePay refund API available, or manual-only? (Research suggests manual)
3. Auto-responder email for sales inquiries needed?
