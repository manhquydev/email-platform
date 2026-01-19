# Mobile App Development Plan

**Project:** Ephemera Email Platform - Mobile App
**Created:** 2026-01-20
**Target:** 2026-Q3
**Status:** Planning

---

## 1. Executive Summary

Build a cross-platform mobile app for Ephemera email platform with core inbox management, real-time notifications, and offline support.

## 2. Technology Recommendation

### Decision: **React Native** (Recommended)

| Factor | React Native | Flutter |
|--------|--------------|---------|
| **Code Sharing** | Can share types with web (TypeScript) | Dart only |
| **Team Expertise** | Existing React/TS codebase | New language |
| **API Client** | Reuse existing `api.ts` patterns | Rewrite |
| **Bundle Size** | ~7-12MB | ~5-8MB |
| **Performance** | Excellent for this use case | Slightly better |
| **Ecosystem** | Mature, large community | Growing |

**Rationale:** React Native allows maximum code reuse with existing TypeScript types, API patterns, and React component logic from the web app.

---

## 3. API Endpoints (30 routes available)

### Core (MVP)
| Endpoint | Description |
|----------|-------------|
| `POST /auth/login` | Email/password auth |
| `POST /auth/register` | User registration |
| `GET /auth/me` | User profile |
| `GET /domains` | List user domains |
| `GET /inboxes` | List user inboxes |
| `POST /inboxes` | Create inbox |
| `GET /inboxes/:id/messages` | List messages |
| `GET /messages/:id` | Message detail |
| `PATCH /messages/:id/read` | Mark read/unread |
| `DELETE /messages/:id` | Delete message |
| `GET /attachments/:id/download` | Download attachment |

### Enhanced Features
| Endpoint | Description |
|----------|-------------|
| `POST /messages/:id/summarize` | AI summary |
| `GET /notifications` | User notifications |
| `POST /push/subscribe` | Push notification |
| `GET /realtime/sse` | Real-time events |
| `GET /teams` | Team management |

---

## 4. Authentication Flows

### Supported Methods
1. **Email/Password** - Primary for mobile
2. **Magic Link** - Passwordless option
3. **Biometric** - Local device unlock
4. **Telegram Login** - Social auth option

### Token Management
- JWT stored in secure storage (Keychain/Keystore)
- Refresh token rotation
- Background token refresh

---

## 5. Implementation Phases

### Phase 1: Foundation (2 weeks)
- [ ] Project setup (React Native + Expo)
- [ ] Navigation structure (React Navigation)
- [ ] API client with token management
- [ ] Secure storage for credentials
- [ ] Login/Register screens
- [ ] Biometric unlock setup

### Phase 2: Core Features (3 weeks)
- [ ] Inbox list screen with pull-to-refresh
- [ ] Message list with pagination
- [ ] Message detail view (HTML rendering)
- [ ] Attachment preview/download
- [ ] Mark read/unread, delete
- [ ] Search functionality

### Phase 3: Real-time & Notifications (2 weeks)
- [ ] Push notification setup (FCM/APNs)
- [ ] SSE connection for real-time updates
- [ ] Background fetch for new emails
- [ ] Notification badges
- [ ] In-app notification center

### Phase 4: Offline & Polish (2 weeks)
- [ ] SQLite local database (WatermelonDB)
- [ ] Offline message caching
- [ ] Optimistic UI updates
- [ ] Pull-to-sync
- [ ] Dark mode support
- [ ] Haptic feedback

### Phase 5: Advanced Features (2 weeks)
- [ ] AI email summarization
- [ ] Team inbox management
- [ ] Settings & preferences
- [ ] OTP copy to clipboard
- [ ] Share extension

### Phase 6: Release (1 week)
- [ ] App Store assets (screenshots, description)
- [ ] Play Store listing
- [ ] Beta testing (TestFlight/Play Console)
- [ ] Production release

---

## 6. Project Structure

```
mobile/
├── src/
│   ├── api/
│   │   ├── client.ts          # API client (from web)
│   │   ├── auth.ts            # Auth endpoints
│   │   ├── inboxes.ts         # Inbox endpoints
│   │   └── messages.ts        # Message endpoints
│   ├── components/
│   │   ├── MessageItem.tsx
│   │   ├── InboxCard.tsx
│   │   ├── EmailViewer.tsx
│   │   └── AttachmentList.tsx
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── InboxListScreen.tsx
│   │   ├── MessageListScreen.tsx
│   │   └── MessageDetailScreen.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useInboxes.ts
│   │   └── useMessages.ts
│   ├── store/
│   │   └── authStore.ts       # Zustand store
│   ├── utils/
│   │   ├── secureStorage.ts
│   │   └── notifications.ts
│   └── types/
│       └── index.ts           # Shared from web
├── app.json
├── package.json
└── tsconfig.json
```

---

## 7. Shared Code Strategy

### From Web App (`services/web/src/`)
| File | Reuse |
|------|-------|
| `types.ts` | 100% - All type definitions |
| `utils/api.ts` | 80% - API patterns, error handling |
| `utils/format.ts` | 100% - Date/size formatting |
| `context/AuthContext.tsx` | 50% - Auth logic |

### Platform-Specific
- Navigation (React Navigation vs React Router)
- Storage (SecureStore vs localStorage)
- Notifications (FCM/APNs vs Web Push)
- HTML rendering (react-native-render-html)

---

## 8. Key Dependencies

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "react-native": "0.74.x",
    "@react-navigation/native": "^6.x",
    "@react-navigation/native-stack": "^6.x",
    "react-native-render-html": "^6.x",
    "expo-secure-store": "~13.0.0",
    "expo-notifications": "~0.28.0",
    "expo-local-authentication": "~14.0.0",
    "@tanstack/react-query": "^5.x",
    "zustand": "^4.x",
    "@nozbe/watermelondb": "^0.27.x"
  }
}
```

---

## 9. Success Criteria

| Metric | Target |
|--------|--------|
| App Store rating | ≥ 4.5 stars |
| Crash-free rate | ≥ 99.5% |
| Cold start time | < 2 seconds |
| API response cache hit | ≥ 80% |
| Push notification delivery | ≥ 95% |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| HTML email rendering issues | Use react-native-render-html with sanitization |
| Large attachment downloads | Stream downloads, show progress |
| Background sync battery drain | Use WorkManager/BackgroundTasks sparingly |
| App Store rejection | Follow guidelines, avoid web views |

---

## 11. Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Foundation | 2 weeks | Week 2 |
| Core Features | 3 weeks | Week 5 |
| Real-time & Notifications | 2 weeks | Week 7 |
| Offline & Polish | 2 weeks | Week 9 |
| Advanced Features | 2 weeks | Week 11 |
| Release | 1 week | Week 12 |

**Total Estimated Duration:** 12 weeks (3 months)
