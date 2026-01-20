# Phase 1: Foundation & Configuration

## Priority: P0 (Critical)
## Effort: 4h
## Status: pending

## Context Links
- Research: `./research-expo-rn-android.md`
- Codebase: `./scout-codebase-mobile.md`

## Overview
Cấu hình project cho Android production, setup EAS Build, và optimize performance foundations.

## Key Insights
- New Architecture enabled by default (RN 0.81)
- Edge-to-edge UI mandatory for Android 16+
- Hermes engine chuẩn trong SDK 54

## Requirements

### Functional
- App build được trên Android API 28-36
- Deep linking hoạt động (ephemera://)
- Development builds qua EAS

### Non-functional
- Cold start < 3s
- APK size < 50MB

## Implementation Steps

### 1.1 Update app.json (30min)
```json
{
  "expo": {
    "android": {
      "package": "app.ephemera.mobile",
      "versionCode": 1,
      "adaptiveIcon": {...},
      "permissions": ["RECEIVE_BOOT_COMPLETED", "VIBRATE", "USE_BIOMETRIC"],
      "edgeToEdgeEnabled": true
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      ["expo-local-authentication", {...}],
      ["expo-notifications", {"color": "#8B5CF6"}]
    ]
  }
}
```

### 1.2 Create eas.json (30min)
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### 1.3 Install FlashList (1h)
```bash
npx expo install @shopify/flash-list
```
- Replace FlatList in `inboxes.tsx` with FlashList
- Add `estimatedItemSize` prop

### 1.4 Setup Environment (1h)
- Create `.env.example` for mobile
- Configure `expo-constants` for API_URL injection
- Setup babel-plugin-module-resolver aliases

### 1.5 Verify TypeScript (1h)
- Update tsconfig.json paths
- Run `npx tsc --noEmit` to check errors
- Fix any type issues in existing code

## Todo List
- [ ] Update app.json with Android production config
- [ ] Create eas.json for build profiles
- [ ] Install and configure FlashList
- [ ] Setup environment variables
- [ ] Verify TypeScript compilation
- [ ] Run first EAS development build

## Success Criteria
- [ ] `eas build --platform android --profile development` succeeds
- [ ] App opens on Android emulator API 34+
- [ ] No TypeScript errors

## Files to Modify
- `services/mobile/app.json`
- `services/mobile/eas.json` (new)
- `services/mobile/package.json`
- `services/mobile/tsconfig.json`
- `services/mobile/app/(tabs)/inboxes.tsx`
