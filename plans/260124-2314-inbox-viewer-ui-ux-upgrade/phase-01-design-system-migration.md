# Phase 1: Design System Migration to Version C

## Context Links

- [Plan Overview](./plan.md)
- [Design Guidelines](../../docs/design-guidelines.md)
- [Design System V3](../../docs/design-system-version-c.md)
- [Dark Theme Research](./research/researcher-260124-2307-dark-theme-minimal-ui-trends.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 - Critical |
| Status | pending |
| Effort | 2h |
| Dependencies | None |

Migrate all inbox-viewer components from deprecated glassmorphism patterns to Version C design system. Remove all `backdrop-blur`, `bg-white/80`, `shadow`, slate colors, and replace with pure black backgrounds, zinc palette, and border-based elevation.

## Key Insights

From research:
- Pure black (#000) for OLED optimization and Linear-style sharpness
- Borders as primary divider mechanism, not shadows
- Text hierarchy: `zinc-50` headings, `zinc-300` body, `zinc-500` muted
- Hover states: `bg-zinc-900` with `duration-100` transitions

## Requirements

### Functional
- Maintain all existing functionality during migration
- Preserve Vietnamese language strings

### Non-Functional
- All transitions <= 150ms (use `duration-100`)
- Border radius <= 8px (`rounded-lg` max)
- No glassmorphism effects

## Architecture

### Color Token Mapping

| Old Pattern | New Pattern |
|-------------|-------------|
| `bg-white/80 dark:bg-gray-800/80` | `bg-black` |
| `backdrop-blur-lg` | (remove) |
| `shadow` | `border border-zinc-800` |
| `bg-nebula-elevated` | `bg-zinc-950` |
| `bg-nebula-surface` | `bg-zinc-900` |
| `border-nebula-border` | `border-zinc-800` |
| `text-nebula-text-muted` | `text-zinc-500` |
| `text-gray-900 dark:text-white` | `text-white` |
| `bg-nebula-violet` | `bg-white text-black` (primary btn) |
| `hover:bg-nebula-violet-dark` | `hover:bg-zinc-200` |

## Related Code Files

### Files to Modify
1. `services/web/src/pages/inbox-viewer-modules/inbox-viewer-components.tsx`
2. `services/web/src/components/inbox-viewer/message-list.tsx`
3. `services/web/src/components/inbox-viewer/message-detail.tsx`
4. `services/web/src/components/inbox-viewer/search-form.tsx`

## Implementation Steps

### Step 1: Update inbox-viewer-components.tsx (Header + Error Display)

1. Replace header glassmorphism:
   ```tsx
   // FROM:
   <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow">
   // TO:
   <header className="bg-black border-b border-zinc-800">
   ```

2. Update button styles:
   ```tsx
   // Primary button (Share):
   className="px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-200 text-sm"

   // Secondary button (Telegram):
   className="px-4 py-2 border border-zinc-800 text-zinc-300 hover:border-zinc-700 rounded-md text-sm"
   ```

3. Update error icons colors: `text-gray-400` -> `text-zinc-600`

4. Update MessageListPane container:
   ```tsx
   // FROM:
   <div className="lg:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow">
   // TO:
   <div className="lg:w-1/3 bg-zinc-950 border border-zinc-800 rounded-lg">
   ```

### Step 2: Update message-list.tsx

1. Replace skeleton colors:
   ```tsx
   // FROM:
   <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded">
   // TO:
   <div className="h-4 bg-zinc-900 rounded animate-pulse">
   ```

2. Update list item styles:
   ```tsx
   <li className={`p-4 cursor-pointer bg-black hover:bg-zinc-900
     border-b border-zinc-900 transition-colors duration-100
     ${selectedId === msg.id ? "bg-zinc-900 border-l-2 border-l-white" : ""}`}>
   ```

3. Update empty state: `text-gray-300` -> `text-zinc-600`

4. Update pagination buttons:
   ```tsx
   className="px-3 py-1 rounded-md border border-zinc-800 text-zinc-400
     hover:border-zinc-700 hover:text-white disabled:opacity-50 transition-colors"
   ```

### Step 3: Update message-detail.tsx

1. Update header section:
   ```tsx
   <div className="p-4 border-b border-zinc-800">
     <h2 className="text-xl font-bold text-white mb-2">
     <div className="text-sm text-zinc-500 space-y-1">
   ```

2. Update attachments section:
   ```tsx
   <div className="p-4 border-b border-zinc-800 bg-zinc-950">
   ```

3. Update attachment links:
   ```tsx
   className="inline-flex items-center gap-2 px-3 py-1.5
     bg-zinc-900 border border-zinc-800 rounded-md text-sm
     hover:bg-zinc-800 transition-colors"
   ```

4. Update loading spinner:
   ```tsx
   <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
   ```

### Step 4: Update search-form.tsx

1. Update input field:
   ```tsx
   className={`flex-1 px-4 py-3 bg-zinc-900 border rounded-lg
     text-white placeholder:text-zinc-600
     focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-colors
     ${error ? "border-red-500" : "border-zinc-800"}`}
   ```

2. Update submit button:
   ```tsx
   className="px-6 py-3 bg-white text-black rounded-lg
     hover:bg-zinc-200 disabled:opacity-50 font-medium transition-colors"
   ```

3. Update label and helper text: use `text-zinc-500`

## Todo List

- [ ] Update inbox-viewer-components.tsx header
- [ ] Update inbox-viewer-components.tsx AccessErrorDisplay
- [ ] Update inbox-viewer-components.tsx MessageListPane
- [ ] Update inbox-viewer-components.tsx MessageDetailPane
- [ ] Update message-list.tsx skeleton
- [ ] Update message-list.tsx list items
- [ ] Update message-list.tsx pagination
- [ ] Update message-detail.tsx header
- [ ] Update message-detail.tsx attachments
- [ ] Update message-detail.tsx body container
- [ ] Update search-form.tsx input/button
- [ ] Run `pnpm build` to verify no errors
- [ ] Visual QA in browser

## Success Criteria

- [ ] No `backdrop-blur` classes remain
- [ ] No `bg-white/80` or similar opacity patterns
- [ ] No `shadow` classes on containers
- [ ] All backgrounds use `bg-black`, `bg-zinc-950`, or `bg-zinc-900`
- [ ] All borders use `border-zinc-800` or `border-zinc-900`
- [ ] All text follows zinc hierarchy
- [ ] Transitions use `duration-100` or `duration-150`

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Broken dark mode toggle | Low | Version C is dark-only; remove toggle if exists |
| Vietnamese text readability | Medium | Test with actual Vietnamese strings |
| Inconsistent hover states | Low | Use consistent `hover:bg-zinc-900` pattern |

## Security Considerations

- No security impact; purely visual changes
- Maintain existing DOMPurify sanitization in message-detail

## Next Steps

After completing Phase 1:
- Proceed to Phase 2: Hero Address Component
- All subsequent phases build on Version C foundation
