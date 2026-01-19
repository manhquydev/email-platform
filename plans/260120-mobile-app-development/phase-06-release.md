# Phase 7.1.6: Release

**Duration:** 1 week
**Status:** Planned
**Prerequisites:** Phase 7.1.5 Advanced Features Complete

---

## Overview

Prepare app for production release: create store assets, configure builds, beta testing, and submit to App Store & Google Play.

---

## Day 74-75: App Store Assets

### App Icons

```
assets/
├── icon.png              # 1024x1024 (App Store)
├── adaptive-icon.png     # 1024x1024 (Android adaptive)
└── splash.png            # 1284x2778 (splash screen)
```

### Screenshots Required

| Platform | Size | Count |
|----------|------|-------|
| iPhone 6.7" | 1290x2796 | 5-10 |
| iPhone 6.5" | 1284x2778 | 5-10 |
| iPhone 5.5" | 1242x2208 | 5-10 |
| iPad Pro 12.9" | 2048x2732 | 5-10 |
| Android Phone | 1080x1920 | 4-8 |
| Android Tablet | 1920x1200 | 4-8 |

### Screenshot Scenes

1. **Inbox List** - Clean inbox view with multiple emails
2. **Message Detail** - Email content with AI summary
3. **Real-time Notifications** - Push notification preview
4. **Dark Mode** - Same screens in dark theme
5. **Team Collaboration** - Shared inbox with members

### Tasks
- [ ] Create 1024x1024 app icon
- [ ] Create adaptive icon for Android
- [ ] Design splash screen
- [ ] Capture iPhone screenshots (3 sizes)
- [ ] Capture iPad screenshots
- [ ] Capture Android screenshots
- [ ] Create promotional graphics (1024x500)

---

## Day 76: Store Listings

### App Store Connect

```yaml
# App Information
App Name: Ephemera Mail
Subtitle: Secure Disposable Email
Category: Productivity
Secondary Category: Utilities

# Description (4000 chars max)
description: |
  Ephemera Mail - Quản lý email tạm thời an toàn và tiện lợi.

  ✉️ TẠO HỘP THƯ NGAY LẬP TỨC
  • Tạo hộp thư tạm thời trong vài giây
  • Hỗ trợ nhiều domain tùy chỉnh
  • Nhận email real-time với thông báo đẩy

  🔒 BẢO MẬT HÀNG ĐẦU
  • Mã hóa end-to-end
  • Xác thực sinh trắc học
  • Tự động xóa email theo thời gian

  🤖 TÍNH NĂNG THÔNG MINH
  • AI tóm tắt email (Premium)
  • Tự động phát hiện mã OTP
  • Tìm kiếm nhanh chóng

  👥 CỘNG TÁC NHÓM
  • Chia sẻ hộp thư với team
  • Quản lý quyền truy cập
  • Hoạt động đồng bộ real-time

  🌙 TRẢI NGHIỆM MƯỢT MÀ
  • Chế độ tối
  • Hoạt động offline
  • Đồng bộ tự động

  Tải ngay để bảo vệ quyền riêng tư của bạn!

# Keywords (100 chars)
keywords: email,temporary,disposable,privacy,secure,inbox,mail,otp,spam,protection

# What's New
whats_new: |
  Phiên bản 1.0.0
  • Ra mắt ứng dụng chính thức
  • Tạo và quản lý hộp thư tạm thời
  • Thông báo đẩy real-time
  • AI tóm tắt email
  • Chế độ tối
  • Hỗ trợ offline

# Privacy Policy URL
privacy_url: https://ephemera.app/privacy

# Support URL
support_url: https://ephemera.app/support
```

### Google Play Console

```yaml
# Store Listing
App Name: Ephemera Mail
Short Description: Secure disposable email with AI features
Full Description: (same as App Store)

# Categorization
Category: Productivity
Content Rating: Everyone

# Contact Details
Email: support@ephemera.app
Website: https://ephemera.app
Privacy Policy: https://ephemera.app/privacy
```

### Tasks
- [ ] Write App Store description (EN + VI)
- [ ] Write Google Play description
- [ ] Set keywords and categories
- [ ] Configure privacy policy URL
- [ ] Set up support URL
- [ ] Add contact information

---

## Day 77: Build Configuration

### EAS Build Configuration

```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      },
      "android": {
        "autoIncrement": true,
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "developer@ephemera.app",
        "ascAppId": "123456789",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### App Configuration

```json
// app.json
{
  "expo": {
    "name": "Ephemera Mail",
    "slug": "ephemera-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#8B5CF6"
    },
    "ios": {
      "bundleIdentifier": "app.ephemera.mobile",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSFaceIDUsageDescription": "Mở khóa ứng dụng bằng Face ID",
        "NSCameraUsageDescription": "Quét mã QR"
      }
    },
    "android": {
      "package": "app.ephemera.mobile",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#8B5CF6"
      },
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-local-authentication",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#8B5CF6"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### Tasks
- [ ] Configure eas.json for all environments
- [ ] Set up iOS certificates and profiles
- [ ] Set up Android keystore
- [ ] Configure app.json with correct identifiers
- [ ] Set up push notification credentials
- [ ] Test production build locally

---

## Day 78-79: Beta Testing

### TestFlight (iOS)

```bash
# Build and submit to TestFlight
eas build --platform ios --profile production
eas submit --platform ios

# Internal testing checklist
- [ ] Install via TestFlight
- [ ] Test login/register flow
- [ ] Test inbox creation
- [ ] Test message viewing
- [ ] Test push notifications
- [ ] Test offline mode
- [ ] Test dark mode
- [ ] Test on different iPhone models
- [ ] Test on iPad
```

### Google Play Internal Testing

```bash
# Build and submit to Play Console
eas build --platform android --profile production
eas submit --platform android

# Internal testing checklist
- [ ] Install via Play Console internal track
- [ ] Test on different Android versions (10-14)
- [ ] Test on different screen sizes
- [ ] Test biometric unlock
- [ ] Test background sync
- [ ] Test notification channels
```

### Beta Tester Feedback Form

```
1. Device model and OS version?
2. Any crashes encountered? (steps to reproduce)
3. Performance issues? (slow loading, lag)
4. UI issues? (layout, text, colors)
5. Missing features?
6. Overall rating (1-5)?
7. Would you recommend to others?
```

### Tasks
- [ ] Submit iOS build to TestFlight
- [ ] Submit Android build to internal track
- [ ] Invite 10-20 beta testers
- [ ] Create feedback collection form
- [ ] Monitor crash reports (Sentry/Crashlytics)
- [ ] Collect and prioritize feedback
- [ ] Fix critical bugs

---

## Day 80: Production Release

### Pre-release Checklist

```markdown
## iOS
- [ ] App Review Guidelines compliance
- [ ] Privacy nutrition labels configured
- [ ] App Tracking Transparency (if needed)
- [ ] In-app purchases configured (if any)
- [ ] Age rating set correctly
- [ ] Export compliance (encryption)

## Android
- [ ] Target API level 34+
- [ ] Privacy policy linked
- [ ] Data safety form completed
- [ ] Content rating questionnaire
- [ ] App signing by Google Play

## Both Platforms
- [ ] Production API endpoint configured
- [ ] Analytics enabled (Firebase/Mixpanel)
- [ ] Crash reporting enabled
- [ ] Deep links working
- [ ] Push notifications tested
- [ ] All beta bugs fixed
```

### Release Commands

```bash
# Final production builds
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production

# Monitor release
# - App Store Connect: Review status
# - Play Console: Release status
```

### Post-Release Monitoring

```typescript
// Monitor key metrics for first 48 hours
const METRICS_TO_WATCH = {
  crashFreeRate: '>= 99.5%',
  apiErrorRate: '< 1%',
  avgLoadTime: '< 2s',
  dailyActiveUsers: 'baseline',
  pushDeliveryRate: '>= 95%',
  userRetention: 'D1 >= 40%',
};
```

### Tasks
- [ ] Complete pre-release checklist
- [ ] Build final production versions
- [ ] Submit to App Store
- [ ] Submit to Google Play
- [ ] Prepare hotfix branch
- [ ] Set up monitoring dashboards
- [ ] Announce release on social media

---

## Deliverables

| Deliverable | Status |
|-------------|--------|
| App icons and splash screens | ⬜ |
| Store screenshots (iOS + Android) | ⬜ |
| App Store listing complete | ⬜ |
| Google Play listing complete | ⬜ |
| TestFlight beta tested | ⬜ |
| Play Console beta tested | ⬜ |
| Production release submitted | ⬜ |

---

## Success Criteria

- [ ] App approved by App Store review
- [ ] App approved by Google Play review
- [ ] Crash-free rate >= 99.5% in first week
- [ ] Average rating >= 4.0 stars
- [ ] No critical bugs in production
- [ ] Push notifications working reliably
- [ ] At least 100 downloads in first week

---

## Post-Release Plan

### Week 1-2 After Launch
- Monitor crash reports and fix critical issues
- Respond to user reviews
- Track key metrics and user feedback
- Plan v1.1 features based on feedback

### Version 1.1 Candidates
- Performance optimizations
- Additional language support
- Widget support (iOS 14+, Android)
- Apple Watch companion (stretch)

---

## Files to Create

```
assets/
├── icon.png
├── adaptive-icon.png
├── splash.png
├── notification-icon.png
└── screenshots/
    ├── ios/
    │   ├── 6.7/
    │   ├── 6.5/
    │   └── 5.5/
    └── android/
        ├── phone/
        └── tablet/
app.json
eas.json
```

---

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| 7.1.1 Foundation | 2 weeks | ⬜ |
| 7.1.2 Core Features | 3 weeks | ⬜ |
| 7.1.3 Real-time & Notifications | 2 weeks | ⬜ |
| 7.1.4 Offline & Polish | 2 weeks | ⬜ |
| 7.1.5 Advanced Features | 2 weeks | ⬜ |
| 7.1.6 Release | 1 week | ⬜ |
| **Total** | **12 weeks** | |

---

## 🎉 Congratulations!

Upon completing this phase, the Ephemera Mobile App will be live on both App Store and Google Play, providing users with a native mobile experience for managing their disposable email inboxes.
