# Brainstorm Report: Ephemera Browser Extension

**Date:** 2026-01-15
**Status:** Completed
**Target:** Chrome Web Store (Manifest V3)

---

## 1. Problem Statement

Ephemera là nền tảng email tạm thời đã hoàn thiện với web app đầy đủ tính năng. Cần phát triển browser extension để:
- Tăng accessibility - người dùng tạo/quản lý inbox ngay trong browser
- Cải thiện UX - không cần mở tab mới để check email
- Mở rộng user base - extension dễ cài đặt hơn web app
- Competitive advantage - các temp mail service lớn đều có extension

---

## 2. Target Users & Use Cases

### 2.1 End Users (Cá nhân)
- **Use case:** Đăng ký website/service cần email verify nhưng không muốn dùng email chính
- **Pain point:** Phải mở tab mới, tạo inbox, copy email, quay lại form
- **Solution:** 1-click tạo inbox, auto-fill vào form ngay lập tức

### 2.2 Developers/Power Users
- **Use case:** Testing email flows, QA automation, multiple test accounts
- **Pain point:** Quản lý nhiều inbox, track email đến nhiều địa chỉ
- **Solution:** Inbox management panel, search, bulk operations

---

## 3. Chrome Web Store Requirements (Manifest V3)

### 3.1 Technical Requirements
| Requirement | Impact | Solution |
|-------------|--------|----------|
| Manifest V3 | Background pages → Service workers | Event-driven architecture, no persistent state |
| No remote code | Logic must be bundled | All JS bundled with extension |
| Declarative Net Request | Limited dynamic blocking | Not applicable (no ad-blocking) |
| Single purpose | Clear, focused functionality | Temp email management only |
| Code readability | No obfuscation | Standard minification OK |

### 3.2 Privacy & Security
- **Privacy policy required** - must disclose data collection
- **User consent** - explicit permission for data access
- **Minimal permissions** - request only what's needed
- **Two-step verification** - developer account requirement

### 3.3 Policy Compliance
- No gambling, adult content, hate speech
- Clear appeals process (1 per violation)
- Enterprise store available for business

---

## 4. Proposed Extension Architecture

### 4.1 Component Structure (Manifest V3)

```
ephemera-extension/
├── manifest.json           # Extension config (MV3)
├── src/
│   ├── background/
│   │   └── service-worker.ts   # Event handling, API calls
│   ├── popup/
│   │   ├── popup.html          # Popup UI
│   │   ├── popup.tsx           # React app for popup
│   │   └── components/
│   ├── content/
│   │   └── content-script.ts   # Form detection, auto-fill
│   ├── options/
│   │   └── options.html        # Settings page
│   └── shared/
│       ├── api-client.ts       # Ephemera API wrapper
│       ├── storage.ts          # chrome.storage wrapper
│       └── types.ts            # TypeScript definitions
├── assets/
│   └── icons/                  # Extension icons (16,32,48,128)
└── _locales/                   # i18n support
```

### 4.2 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Service Worker** | API calls, push notification handling, badge updates, message passing |
| **Popup** | Main UI - inbox list, quick actions, message preview |
| **Content Script** | Detect email input fields, inject auto-fill button, context menu |
| **Options Page** | Settings, account management, domain preferences |

### 4.3 Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Content     │────►│  Service Worker  │────►│  Ephemera API   │
│ Script      │◄────│  (background)    │◄────│  (Backend)      │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                     │
       │              ┌──────┴──────┐
       │              │   Popup     │
       └──────────────│   (React)   │
                      └─────────────┘
```

---

## 5. Feature Specification

### 5.1 Core Features (Free Tier)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Quick Inbox Creation** | 1-click tạo inbox với random local part | P0 |
| **Email Copy** | Copy email address to clipboard | P0 |
| **Form Auto-fill** | Detect email fields, inject fill button | P0 |
| **Inbox List** | View recent inboxes in popup | P0 |
| **Message Preview** | View messages trong popup (limited) | P1 |
| **Badge Counter** | Unread count trên extension icon | P1 |

### 5.2 Premium Features

| Feature | Description | Tier |
|---------|-------------|------|
| **Real-time Notifications** | Push notification khi có email mới | Starter+ |
| **Custom Domain** | Chọn domain khi tạo inbox | Professional+ |
| **Inbox History** | Lưu unlimited inbox history | Professional+ |
| **Auto-delete Timer** | Tự động xóa inbox sau thời gian | Starter+ |
| **Export Messages** | Download .eml từ popup | Professional+ |
| **Bulk Operations** | Tạo/xóa nhiều inbox cùng lúc | Enterprise |

### 5.3 Anonymous Mode (No Login)

| Feature | Limitation |
|---------|------------|
| Create inbox | Public domains only, max 3 active |
| View messages | Last 10 messages, 2 hours retention |
| No sync | Local storage only, lost on clear |
| No notifications | Polling only (slower) |

---

## 6. API Integration Strategy (Hybrid)

### 6.1 Existing Endpoints (Reuse)

| Endpoint | Use Case |
|----------|----------|
| `POST /auth/login` | User authentication |
| `GET /auth/me` | Get user profile + limits |
| `POST /inboxes` | Create new inbox |
| `GET /inboxes` | List user's inboxes |
| `DELETE /inboxes/:id` | Delete inbox |
| `GET /inboxes/:id/messages` | Get messages for inbox |
| `GET /messages/:id` | Get message detail |
| `PATCH /messages/:id/read` | Mark as read |
| `GET /push/vapid-key` | Get VAPID key for push |
| `POST /push/subscribe` | Subscribe to push |

### 6.2 New Endpoints Needed (Extension-Optimized)

| Endpoint | Purpose | Rationale |
|----------|---------|-----------|
| `POST /extension/quick-inbox` | 1-click inbox creation | Simplified payload, returns minimal data |
| `GET /extension/dashboard` | Aggregated data for popup | Combines inboxes + unread counts in 1 call |
| `GET /extension/recent-messages` | Cross-inbox recent messages | Avoid multiple calls per inbox |
| `POST /extension/anonymous-inbox` | Create without auth | For anonymous mode, with captcha |

### 6.3 Real-time Strategy

| Mode | Mechanism | Latency |
|------|-----------|---------|
| **Logged in** | SSE (`/api/events`) hoặc Push API | Real-time |
| **Anonymous** | Polling every 30s | 30s delay |
| **Background** | Service Worker + Push | Real-time |

---

## 7. Technical Decisions

### 7.1 Framework/Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **UI Framework** | React 19 + Vite | Match web app, team familiarity |
| **Styling** | TailwindCSS | Match web app design system |
| **State** | Zustand | Lightweight, works with chrome.storage |
| **Build** | Vite + CRXJS | Modern bundler with MV3 support |
| **TypeScript** | Yes | Type safety, match codebase |

### 7.2 Storage Strategy

```typescript
// chrome.storage.local - Persist across sessions
{
  "token": "jwt...",           // Auth token (encrypted)
  "userId": "uuid",
  "inboxes": [...],            // Cached inbox list
  "settings": {...}            // User preferences
}

// chrome.storage.session - Tab-specific
{
  "tempInboxes": [...]         // Anonymous mode inboxes
}
```

### 7.3 Permission Model

```json
{
  "permissions": [
    "storage",           // Local data storage
    "notifications",     // Desktop notifications
    "alarms",           // Polling timer
    "clipboardWrite"    // Copy email to clipboard
  ],
  "host_permissions": [
    "https://api.manhquy.click/*"  // API access
  ],
  "optional_permissions": [
    "activeTab"         // Auto-fill (request on use)
  ]
}
```

---

## 8. Freemium Model Details

### 8.1 Feature Matrix

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| Quick inbox creation | ✓ | ✓ | ✓ | ✓ |
| Auto-fill | ✓ | ✓ | ✓ | ✓ |
| Active inboxes | 5 | 20 | 100 | Unlimited |
| Message retention | 7 days | 30 days | 90 days | 365 days |
| Push notifications | ✗ | ✓ | ✓ | ✓ |
| Custom domains | ✗ | ✗ | ✓ | ✓ |
| Export messages | ✗ | ✗ | ✓ | ✓ |
| Team features | ✗ | ✗ | ✗ | ✓ |

### 8.2 Upgrade Prompts (Non-intrusive)

- Subtle badge when hitting limits
- CTA in settings page
- One-time prompt after 10 uses
- **Never** block core functionality

---

## 9. Security Considerations

| Risk | Mitigation |
|------|------------|
| Token theft | Encrypt token in storage, short expiry |
| XSS via content script | CSP, sanitize all inputs |
| CSRF | Token-based auth, no cookies |
| Man-in-middle | HTTPS only, certificate pinning |
| Malicious forms | Whitelist trusted domains for auto-fill |

---

## 10. Implementation Phases

### Phase 1: MVP (2-3 weeks)
- [ ] Extension scaffold with Vite + CRXJS
- [ ] Basic popup UI (inbox list, create button)
- [ ] Authentication flow (login/logout)
- [ ] Quick inbox creation
- [ ] Copy to clipboard

### Phase 2: Core Features (2 weeks)
- [ ] Content script for form detection
- [ ] Auto-fill functionality
- [ ] Message preview in popup
- [ ] Badge counter for unread

### Phase 3: Premium & Polish (2 weeks)
- [ ] Push notifications
- [ ] Settings page
- [ ] Anonymous mode
- [ ] Tier-based feature gating

### Phase 4: Launch (1 week)
- [ ] Chrome Web Store assets (icons, screenshots, description)
- [ ] Privacy policy page
- [ ] Store submission
- [ ] Beta testing

---

## 11. Success Metrics

| Metric | Target (3 months) |
|--------|------------------|
| Installs | 1,000+ |
| Daily active users | 300+ |
| Conversion to paid | 5% |
| Store rating | 4.0+ stars |
| Uninstall rate | < 30% |

---

## 12. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Store rejection | Medium | High | Follow guidelines strictly, pre-review |
| Performance issues | Low | Medium | Optimize API calls, lazy load |
| Security breach | Low | Critical | Security audit, penetration testing |
| Low adoption | Medium | Medium | Marketing, SEO, referral program |

---

## 13. Competitive Analysis

| Extension | Strengths | Weaknesses | Ephemera Opportunity |
|-----------|-----------|------------|---------------------|
| Temp Mail | Simple, fast | No custom domains | Premium domain feature |
| Guerrilla Mail | More features | Clunky UI | Modern, clean design |
| 10 Minute Mail | Time-limited | Very limited | Flexible retention |

---

## 14. Recommended Solution

**Build a Manifest V3 Chrome extension** với:

1. **React-based popup** - consistent với web app
2. **Hybrid API** - reuse endpoints + new extension-optimized ones
3. **Freemium model** - free tier generous, premium for power users
4. **Anonymous + Login** - low friction onboarding
5. **Real-time notifications** - competitive differentiator

### Key Differentiators:
- **Integration với existing Ephemera platform** - sync across devices
- **Clean, modern UI** - match web app quality
- **Developer-friendly** - API access, custom domains
- **Privacy-first** - minimal permissions, transparent policy

---

## 15. Next Steps

1. **User approval** - Review và confirm approach
2. **Create implementation plan** - Detailed tasks với /plan:hard
3. **Setup extension scaffold** - Vite + CRXJS + React
4. **API endpoint development** - New extension-specific endpoints
5. **MVP development** - Phase 1 implementation

---

## Unresolved Questions

1. **Naming:** "Ephemera Extension" hay "Ephemera Quick Mail"?
2. **Firefox/Edge:** Khi nào prioritize cross-browser?
3. **Pricing:** Integrate với existing Stripe billing hay riêng?
4. **Analytics:** Google Analytics trong extension hay custom?
