# Phase 5: Loading States and Transitions

## Context Links

- [Plan Overview](./plan.md)
- [Dark Theme Research](./research/researcher-260124-2307-dark-theme-minimal-ui-trends.md)
- [Design System V3](../../docs/design-system-version-c.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P2 - Important |
| Status | pending |
| Effort | 1h |
| Dependencies | Phase 1-4 complete |

Polish loading UX with skeleton loaders matching Version C aesthetic. Replace spinners with subtle skeleton animations. Ensure all transitions are <= 150ms per design spec.

## Key Insights

From research:
- "Skeleton loaders in `zinc-900` with subtle `zinc-800` pulse"
- "Avoid high contrast shimmer"
- "duration-75 or duration-100 for hover/press"
- "Focus on perceived instantaneity"

## Requirements

### Functional
- Skeleton loaders for message list
- Skeleton loader for message detail
- Skeleton loader for search form (optional, fast operation)
- Loading state for refresh action

### Non-Functional
- Skeleton uses `bg-zinc-900` with subtle pulse
- All transitions <= 150ms
- No layout shift when content loads
- Respect `prefers-reduced-motion`

## Architecture

### Skeleton Components

```
Skeletons
├── MessageListSkeleton (already in Phase 4)
├── MessageDetailSkeleton (new)
└── HeroEmailSkeleton (new)
```

### Animation Strategy

```css
/* Version C pulse animation */
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}
```

## Related Code Files

### Files to Modify
1. `services/web/src/components/inbox-viewer/message-detail.tsx`
2. `services/web/src/components/inbox-viewer/message-list.tsx` (enhance skeleton)
3. `services/web/tailwind.config.js` (add custom animation)

### Files to Create
1. `services/web/src/components/inbox-viewer/skeletons.tsx`

## Implementation Steps

### Step 1: Create centralized skeletons.tsx

```tsx
// services/web/src/components/inbox-viewer/skeletons.tsx

// Skeleton base component
interface SkeletonProps {
  className?: string;
}

function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-zinc-900 rounded animate-pulse ${className}`}
      style={{ animationDuration: "2s" }}
    />
  );
}

// Message list skeleton (5 items)
export function MessageListSkeleton() {
  return (
    <div className="divide-y divide-zinc-900">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex justify-between items-start mb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

// Message detail skeleton
export function MessageDetailSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="p-4 border-b border-zinc-800">
        <Skeleton className="h-6 w-2/3 mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* Body skeleton */}
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

// Hero email skeleton (for initial load)
export function HeroEmailSkeleton() {
  return (
    <div className="flex items-center justify-center gap-3 py-6 px-4
      bg-zinc-950 border-b border-zinc-800">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-10 rounded-md" />
    </div>
  );
}

// Inline loading indicator (for refresh)
export function RefreshIndicator() {
  return (
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-900 overflow-hidden">
      <div
        className="h-full w-1/3 bg-white animate-slide-right"
        style={{ animationDuration: "1s", animationIterationCount: "infinite" }}
      />
    </div>
  );
}
```

### Step 2: Update message-detail.tsx loading state

Replace spinner with skeleton:

```tsx
import { MessageDetailSkeleton } from "./skeletons";

export function MessageDetail({ message, loading, apiUrl }: MessageDetailProps) {
  // ...existing sanitization logic

  if (loading) {
    return <MessageDetailSkeleton />;
  }

  if (!message) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <svg className="w-12 h-12 mb-3 text-zinc-700" fill="none"
          stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">Select an email to view</p>
        <p className="text-xs text-zinc-600 mt-1">
          Use <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800
            rounded font-mono text-[10px]">j</kbd> /
          <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800
            rounded font-mono text-[10px]">k</kbd> to navigate
        </p>
      </div>
    );
  }

  // ...rest of component
}
```

### Step 3: Add refresh progress indicator

Update toolbar in `inbox-viewer-components.tsx`:

```tsx
import { RefreshIndicator } from "../../components/inbox-viewer/skeletons";

export function MessageListPane({ ... loading, ... }) {
  return (
    <div className="lg:w-1/3 bg-zinc-950 border border-zinc-800 rounded-lg
      overflow-hidden relative">
      {/* Refresh progress bar */}
      {loading && <RefreshIndicator />}

      <HeroEmailAddress email={email} />
      {/* ...rest */}
    </div>
  );
}
```

### Step 4: Add custom animation to Tailwind config

```javascript
// services/web/tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'slide-right': 'slideRight 1s ease-in-out infinite',
      },
      keyframes: {
        slideRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
    },
  },
};
```

### Step 5: Add prefers-reduced-motion support

```css
/* In global CSS or Tailwind config */
@media (prefers-reduced-motion: reduce) {
  .animate-pulse,
  .animate-slide-right {
    animation: none !important;
  }
}
```

### Step 6: Ensure all transitions use correct duration

Audit all components for transition classes:

```tsx
// CORRECT: duration-100 or duration-150
className="transition-colors duration-100"

// INCORRECT: no duration or too long
className="transition" // defaults to 150ms, OK
className="transition duration-300" // TOO SLOW
```

## Todo List

- [ ] Create `skeletons.tsx` with all skeleton components
- [ ] Update message-detail.tsx to use MessageDetailSkeleton
- [ ] Add RefreshIndicator to MessageListPane
- [ ] Add custom slide animation to Tailwind config
- [ ] Add prefers-reduced-motion support
- [ ] Audit all transitions for <= 150ms
- [ ] Test skeleton appearance matches Version C
- [ ] Test reduced motion preference
- [ ] Verify no layout shift on content load

## Success Criteria

- [ ] All loading states use skeleton loaders (no spinners)
- [ ] Skeletons use `bg-zinc-900` with subtle pulse
- [ ] Refresh action shows progress indicator
- [ ] All transitions <= 150ms
- [ ] prefers-reduced-motion disables animations
- [ ] No layout shift when real content replaces skeleton

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Skeleton height mismatch | Low | Match skeleton dimensions to real content |
| Animation performance | Low | Use CSS transforms only |
| Flicker on fast loads | Low | Use minimum display time of 200ms |

## Security Considerations

- No security impact
- Purely visual enhancement

## Next Steps

After Phase 5:
- All phases complete
- Run full QA pass across all viewports
- Performance profiling with React DevTools
- Accessibility audit with screen reader
