---
title: "Mobile Android Development - Ephemera Email Client"
description: "Implementation plan for Android-first mobile email client using Expo SDK 54"
status: pending
priority: P1
effort: 40h
branch: main
tags: [mobile, android, expo, react-native, email-client]
created: 2026-01-20
---

# Mobile Android Development Plan

## Overview

Phát triển ứng dụng mobile email client cho nền tảng Android sử dụng Expo SDK 54 + React Native 0.81.5.

**Current State:** ~35% implemented (scaffold + basic screens)
**Target:** Production-ready Android app on Google Play

## Research Reports

| Report | Path |
|--------|------|
| Expo/RN Best Practices | `./research-expo-rn-android.md` |
| Auth & Security | `./research-mobile-auth-security.md` |
| Push Notifications | `./research-push-notifications-android.md` |
| Offline Architecture | `./research-offline-first-architecture.md` |
| Codebase Scout | `./scout-codebase-mobile.md` |

## Implementation Approaches

### Approach A: Incremental Enhancement (Recommended)
### Approach B: Full Rebuild with Local-First Architecture

See detailed phase files for each approach.

## Phase Overview

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| 1 | Foundation & Configuration | 4h | pending |
| 2 | Authentication & Security | 6h | pending |
| 3 | Core Features (Inbox/Messages) | 8h | pending |
| 4 | Push Notifications (FCM) | 6h | pending |
| 5 | Offline Support | 8h | pending |
| 6 | Polish & Production | 8h | pending |

## Key Dependencies

- Firebase project setup (FCM)
- EAS Build configuration
- Backend API: `/auth/refresh-token` endpoint (verify exists)
- Google Play Developer account

## Success Criteria

- [ ] App runs smoothly on Android API 28-36
- [ ] Login/Register with biometric unlock
- [ ] Real-time email notifications
- [ ] Offline inbox viewing
- [ ] < 3s cold start time
- [ ] < 50MB APK size
