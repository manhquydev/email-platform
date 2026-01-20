# Phase 1: Foundation

> **Status:** Complete | **Priority:** Critical | **Est. Time:** 2-3 hours | **Completed:** 2026-01-20

## Overview

Set up CSS foundation for Version C design system - create new tokens, update Tailwind config if needed.

## Files to Modify

| File | Action |
|------|--------|
| `services/web/src/styles/version-c-tokens.css` | CREATE - New design tokens |
| `services/web/src/index.css` | MODIFY - Import new tokens |
| `services/web/tailwind.config.js` | REVIEW - Ensure zinc colors available |

## Implementation Steps

### 1. Create Version C Tokens CSS
```css
/* version-c-tokens.css */
:root {
  /* Backgrounds */
  --v3-bg-primary: #000000;
  --v3-bg-elevated: #09090b;
  --v3-bg-surface: #18181b;
  --v3-bg-hover: #27272a;

  /* Borders */
  --v3-border-subtle: #18181b;
  --v3-border-default: #27272a;
  --v3-border-strong: #3f3f46;

  /* Text */
  --v3-text-primary: #ffffff;
  --v3-text-secondary: #a1a1aa;
  --v3-text-muted: #71717a;
  --v3-text-disabled: #52525b;

  /* Accent */
  --v3-accent-success: #34d399;
  --v3-accent-error: #f87171;
  --v3-accent-warning: #fbbf24;
}
```

### 2. Update index.css
- Add import for version-c-tokens.css at top
- Keep old nebula tokens for backward compatibility during migration

### 3. Verify Tailwind Config
- Confirm `zinc` color palette is available (default in Tailwind)
- No custom config changes needed

## Todo List

- [x] Create `version-c-tokens.css` file
- [x] Import tokens in `index.css`
- [x] Verify Tailwind zinc colors work
- [x] Test with MockupVersionC page

## Success Criteria

- [x] New tokens file created and imported
- [x] No build errors
- [x] MockupVersionC renders correctly

## Next Steps

→ Phase 2: Layouts & Navigation
