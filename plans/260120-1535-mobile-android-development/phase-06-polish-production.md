# Phase 6: Polish & Production

## Priority: P1 (High)
## Effort: 8h
## Status: pending

## Context Links
- Research: `./research-expo-rn-android.md`

## Overview
Final polish, testing, và preparation cho Google Play release.

## Requirements

### Functional
- All features working end-to-end
- Error handling comprehensive
- Loading states polished

### Non-functional
- Crash-free rate > 99%
- ANR rate < 0.1%
- Play Store listing ready

## Implementation Steps

### 6.1 Error Boundaries (1h)
```typescript
// src/components/ErrorBoundary.tsx
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryPrimitive
      fallback={<ErrorFallback />}
      onError={(error) => {
        // Log to Sentry/Crashlytics
        console.error('App Error:', error);
      }}
    >
      {children}
    </ErrorBoundaryPrimitive>
  );
}
```

### 6.2 Loading States & Skeletons (1.5h)
```typescript
// src/components/InboxSkeleton.tsx
export function InboxSkeleton() {
  return (
    <View style={styles.container}>
      {[...Array(5)].map((_, i) => (
        <View key={i} style={styles.item}>
          <View style={styles.avatar} />
          <View style={styles.content}>
            <View style={styles.title} />
            <View style={styles.subtitle} />
          </View>
        </View>
      ))}
    </View>
  );
}
```

### 6.3 Haptic Feedback (0.5h)
```typescript
// src/utils/haptics.ts
import * as Haptics from 'expo-haptics';

export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
```

### 6.4 Android-Specific Polish (1h)
- Ripple effects on Pressable
- Proper elevation/shadows
- Edge-to-edge status bar
- Back gesture handling

```typescript
// Native Android ripple
<Pressable
  android_ripple={{ color: 'rgba(139, 92, 246, 0.2)' }}
  style={styles.button}
>
```

### 6.5 Testing (2h)
- Manual testing on Android 10, 12, 14
- Test offline scenarios
- Test push notifications
- Test deep links
- Performance profiling

### 6.6 Play Store Preparation (2h)

1. **Assets**
   - App icon (512x512)
   - Feature graphic (1024x500)
   - Screenshots (phone + tablet)

2. **Metadata**
   - Title: "Ephemera Mail - Secure Temp Email"
   - Short description (80 chars)
   - Full description (4000 chars)
   - Keywords/tags

3. **Privacy Policy**
   - URL required for Play Store
   - Data safety form

4. **Build & Submit**
```bash
# Production build
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

## Todo List
- [ ] Add ErrorBoundary to app
- [ ] Create skeleton components
- [ ] Implement haptic feedback
- [ ] Polish Android-specific UI
- [ ] Manual testing checklist
- [ ] Create Play Store assets
- [ ] Write app description
- [ ] Privacy policy URL
- [ ] Production build
- [ ] Submit to Play Store

## Success Criteria
- [ ] No crashes in 1 hour of testing
- [ ] All flows complete successfully
- [ ] App approved on Play Store

## Testing Checklist

### Authentication
- [ ] Login with email/password
- [ ] Register new account
- [ ] Biometric unlock
- [ ] 2FA flow
- [ ] Logout

### Core Features
- [ ] View inbox list
- [ ] Pull to refresh
- [ ] View message detail
- [ ] Delete message
- [ ] Mark as read/unread
- [ ] Download attachment
- [ ] Search messages

### Notifications
- [ ] Receive push
- [ ] Tap opens email
- [ ] Action buttons work

### Offline
- [ ] View cached inbox
- [ ] Offline indicator shows
- [ ] Actions queue and sync

### Edge Cases
- [ ] No internet on launch
- [ ] Session expired
- [ ] Empty inbox
- [ ] Large attachment
- [ ] Long email body

## Files to Create/Modify
- `src/components/ErrorBoundary.tsx`
- `src/components/InboxSkeleton.tsx`
- `src/utils/haptics.ts`
- `assets/` (icons, screenshots)
- `eas.json` (production profile)
