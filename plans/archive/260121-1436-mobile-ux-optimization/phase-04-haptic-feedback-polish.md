# Phase 04: Haptic Feedback & Polish

> **Priority:** P1-P2 | **Status:** pending | **Effort:** 1 day

---

## Context

- [Touch Targets CSS](../../services/web/src/styles/touch-targets.css)
- [Design Guidelines](../../docs/design-guidelines.md)
- [SwipeableInboxCard](../../services/web/src/components/mobile/SwipeableInboxCard.tsx)

## Overview

Polish mobile experience với haptic feedback, responsive typography, skeleton streaming, và các improvements nhỏ khác.

## Key Insights

- Vibration API đơn giản, hỗ trợ tốt trên Android
- iOS Safari hạn chế Vibration API, dùng AudioContext workaround
- `clamp()` CSS cho fluid typography không cần JS

## Requirements

### Functional
- Haptic feedback on swipe actions
- Haptic on button presses (optional)
- Skeleton loading with stagger animation
- Responsive font sizes

### Non-functional
- Vibration duration < 50ms (subtle)
- No performance impact from haptics
- Typography readable on all screen sizes

## Implementation Steps

### Step 1: Create useHaptic hook
```tsx
// services/web/src/hooks/useHaptic.ts

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],  // double tap feel
  warning: [25, 50, 25],
  error: [50, 100, 50],
};

export function useHaptic() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const trigger = useCallback((type: HapticType = 'light') => {
    if (!isSupported) return;

    try {
      const pattern = HAPTIC_PATTERNS[type];
      navigator.vibrate(pattern);
    } catch (e) {
      // Silently fail - haptics are optional enhancement
      console.debug('Haptic feedback failed:', e);
    }
  }, [isSupported]);

  return { trigger, isSupported };
}
```

### Step 2: Integrate haptics into swipe actions
```tsx
// Update SwipeableInboxCard.tsx
import { useHaptic } from '../../hooks/useHaptic';

export function SwipeableInboxCard({ ... }) {
  const { trigger } = useHaptic();

  const handleSwipeLeft = useCallback(() => {
    trigger('medium'); // Haptic on delete
    onDelete?.();
  }, [onDelete, trigger]);

  const handleSwipeRight = useCallback(() => {
    trigger('light'); // Lighter haptic on copy
    onCopy?.();
  }, [onCopy, trigger]);

  // Also trigger haptic when swipe threshold reached
  const handleSwipeProgress = useCallback((progress: number) => {
    if (Math.abs(progress) >= 0.5 && !hasTriggeredHaptic.current) {
      trigger('light');
      hasTriggeredHaptic.current = true;
    }
    if (Math.abs(progress) < 0.5) {
      hasTriggeredHaptic.current = false;
    }
  }, [trigger]);

  // ...
}
```

### Step 3: Add responsive typography CSS
```css
/* services/web/src/styles/responsive-typography.css */

:root {
  /* Base sizes with fluid scaling */
  --text-xs: clamp(0.625rem, 2.5vw, 0.75rem);     /* 10-12px */
  --text-sm: clamp(0.75rem, 3vw, 0.875rem);       /* 12-14px */
  --text-base: clamp(0.875rem, 3.5vw, 1rem);      /* 14-16px */
  --text-lg: clamp(1rem, 4vw, 1.125rem);          /* 16-18px */
  --text-xl: clamp(1.125rem, 4.5vw, 1.25rem);     /* 18-20px */
  --text-2xl: clamp(1.25rem, 5vw, 1.5rem);        /* 20-24px */
  --text-3xl: clamp(1.5rem, 6vw, 1.875rem);       /* 24-30px */
}

/* Apply to common elements */
.text-responsive-xs { font-size: var(--text-xs); }
.text-responsive-sm { font-size: var(--text-sm); }
.text-responsive-base { font-size: var(--text-base); }
.text-responsive-lg { font-size: var(--text-lg); }
.text-responsive-xl { font-size: var(--text-xl); }
.text-responsive-2xl { font-size: var(--text-2xl); }
.text-responsive-3xl { font-size: var(--text-3xl); }

/* Mobile-specific adjustments */
@media (max-width: 375px) {
  :root {
    --text-base: 0.8125rem; /* 13px on very small screens */
  }
}
```

### Step 4: Add skeleton streaming animation
```tsx
// services/web/src/components/mobile/SkeletonStream.tsx
import { motion } from 'framer-motion';

interface SkeletonStreamProps {
  count: number;
  renderSkeleton: (index: number) => React.ReactNode;
  staggerDelay?: number;
}

export function SkeletonStream({
  count,
  renderSkeleton,
  staggerDelay = 0.08
}: SkeletonStreamProps) {
  return (
    <>
      {Array(count).fill(0).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: i * staggerDelay,
            duration: 0.2,
            ease: 'easeOut'
          }}
        >
          {renderSkeleton(i)}
        </motion.div>
      ))}
    </>
  );
}

// Usage in mobile-inboxes-tab.tsx:
{busy && inboxes.length === 0 && (
  <SkeletonStream
    count={6}
    renderSkeleton={(i) => <InboxCardSkeleton key={i} />}
  />
)}
```

### Step 5: Increase touch targets to 48px
```css
/* Update touch-targets.css */
@media (max-width: 768px) {
  button:not(.touch-exempt),
  [role="button"]:not(.touch-exempt) {
    min-height: 48px;  /* Upgraded from 44px */
    min-width: 48px;
  }

  /* Icon buttons with larger tap area */
  .icon-btn,
  button[aria-label]:not(.touch-exempt) {
    min-height: 48px;
    min-width: 48px;
    padding: 12px;  /* Ensure visual icon centered in larger area */
  }
}
```

### Step 6: Add offline indicator (optional)
```tsx
// services/web/src/components/mobile/OfflineIndicator.tsx
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      exit={{ y: -100 }}
      className="fixed top-0 inset-x-0 z-50 bg-v3-accent-warning text-black py-2 px-4 text-center text-sm font-medium safe-area-top"
    >
      You're offline. Some features may not work.
    </motion.div>
  );
}

// Hook
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

## Todo List

- [ ] Create `useHaptic.ts` hook
- [ ] Integrate haptics into `SwipeableInboxCard`
- [ ] Integrate haptics into `SwipeableEmailItem`
- [ ] Add haptics to FAB press
- [ ] Create `responsive-typography.css`
- [ ] Import typography CSS in main styles
- [ ] Create `SkeletonStream.tsx` component
- [ ] Update skeleton loading to use stagger
- [ ] Upgrade touch targets to 48px
- [ ] Create `OfflineIndicator.tsx` (optional)
- [ ] Test haptics on Android devices
- [ ] Test typography on various screen sizes

## Success Criteria

- [ ] Haptic feedback works on Android
- [ ] Swipe actions have tactile feel
- [ ] Typography readable on 320px-428px screens
- [ ] Skeleton loading feels progressive
- [ ] Touch targets >= 48px verified

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Haptic not supported on iOS | Known | Low | Graceful degradation, haptic optional |
| Font too small on edge cases | Low | Medium | Test on 320px width |
| Skeleton animation janky | Low | Low | Use `will-change: transform` |

## Security Considerations

- No security impact - UX polish only
- Vibration API requires no permissions

## Summary

Phase 04 completes the mobile optimization with:
- Tactile feedback for better user interaction
- Fluid typography for all screen sizes
- Progressive loading animations
- Larger touch targets for accessibility
- Optional offline status indicator

---

## All Phases Complete Checklist

After all phases:
- [ ] Run Lighthouse mobile audit
- [ ] Test on real iOS device (Safari)
- [ ] Test on real Android device (Chrome)
- [ ] Verify no desktop regression
- [ ] Update documentation
- [ ] Remove feature flags if all good
