# UI Consistency & Design System Audit Report

**Date:** 2026-01-10
**Author:** UI/UX Design System Architect
**Status:** In Progress

---

## Executive Summary

Conducted comprehensive audit of UI consistency and branding across the email-platform frontend. Found **58 components** with hardcoded color values that bypass the Nebula Glass design system tokens.

### Key Actions Completed
- [x] Audited all UI components (92 total files)
- [x] Fixed Button.tsx - migrated to nebula-* tokens
- [x] Fixed Dropdown.tsx - migrated to nebula-* tokens
- [x] Verified GlassCard.tsx uses valid CSS class approach
- [x] Verified Input.tsx uses proper tokens

---

## Design System Overview

### Architecture
```
tailwind.config.js (TailwindCSS tokens)
       ↓ references
nebula-glass.css (CSS custom properties)
       ↓ consumed by
React Components (.tsx)
```

### Token Categories
| Category | CSS Variable Pattern | Tailwind Token |
|----------|---------------------|----------------|
| Background | `--nebula-void`, `--nebula-surface` | `nebula-void`, `nebula-surface` |
| Text | `--nebula-text`, `--nebula-text-secondary` | `nebula-text`, `nebula-text-secondary` |
| Border | `--nebula-border`, `--nebula-border-subtle` | `nebula-border`, `nebula-border-subtle` |
| Accent | `--nebula-violet`, `--nebula-cyan`, `--nebula-pink` | `nebula-violet`, `nebula-cyan`, `nebula-pink` |
| Status | `--nebula-success`, `--nebula-error`, `--nebula-warning` | `success`, `danger`, `warning` |

---

## Migration Guide

### Color Mapping (Hardcoded → Token)

| Hardcoded Value | Replace With | Notes |
|-----------------|--------------|-------|
| `slate-50`, `slate-100` | `nebula-elevated` | Light backgrounds |
| `slate-200`, `slate-300` | `nebula-border` | Borders |
| `slate-400`, `slate-500` | `nebula-text-muted` | Muted text |
| `slate-600`, `slate-700` | `nebula-text-secondary` | Secondary text |
| `slate-800`, `slate-900` | `nebula-text` | Primary text |
| `gray-50` to `gray-300` | `nebula-elevated` | Backgrounds |
| `gray-400` to `gray-500` | `nebula-text-muted` | Muted text |
| `gray-600` to `gray-900` | `nebula-text` | Text colors |
| `white` | `nebula-surface` | Surface backgrounds |
| `#0a0a14`, `#0A0A0B` | `nebula-void` | Dark backgrounds |
| `purple-600`, `violet-600` | `nebula-violet-dark` | Accent dark |
| `purple-500`, `violet-500` | `nebula-violet` | Primary accent |
| `red-500`, `red-600` | `danger` | Error/danger states |
| `green-500`, `green-600` | `success` | Success states |
| `yellow-500`, `amber-500` | `warning` | Warning states |
| `blue-500`, `blue-600` | `info` | Info states |

### Dark Mode Handling
**Before (manual dark mode):**
```tsx
className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100"
```

**After (token-based):**
```tsx
className="bg-nebula-surface text-nebula-text"
```

Tokens automatically adapt to dark/light mode via CSS variables.

---

## Files Requiring Migration

### Priority 1: Core UI Components (4 files)
| File | Status | Issues |
|------|--------|--------|
| `ui/Button.tsx` | ✅ Fixed | Was using `purple-600` |
| `ui/Dropdown.tsx` | ✅ Fixed | Was using `slate-*`, hex codes |
| `ui/Input.tsx` | ✅ OK | Already using tokens |
| `ui/GlassCard.tsx` | ✅ OK | Uses CSS classes |

### Priority 2: Navigation Components (7 files)
- `Navigation/DesktopNav.tsx`
- `Navigation/MobileNav.tsx`
- `Navigation/HamburgerMenu.tsx`
- `Navigation/ResponsiveLayout.tsx`
- `NavigationSidebar.tsx`
- `AppHeader.tsx`
- `Sidebar.tsx`

### Priority 3: Dashboard Components (6 files)
- `dashboard/MessageListPane.tsx`
- `dashboard/MessageDetailPane.tsx`
- `dashboard/OTPHighlight.tsx`
- `MessageList.tsx`
- `MessageDetail.tsx`
- `EmailStream.tsx`

### Priority 4: Settings Components (9 files)
- `settings/GeneralSettings.tsx`
- `settings/SecuritySettings.tsx`
- `settings/SubscriptionSettings.tsx`
- `settings/DeveloperSettings.tsx`
- `settings/NotificationsSettings.tsx`
- `settings/TeamSettings.tsx`
- `settings/RetentionSettings.tsx`
- `settings/LabelsTab.tsx`
- `settings/WebhookLogs.tsx`

### Priority 5: Admin Components (8 files)
- `admin/AdminDashboard.tsx`
- `admin/AdminInboxes.tsx`
- `admin/AdminDomains.tsx`
- `admin/AdminEmails.tsx`
- `admin/AdminLogs.tsx`
- `admin/AdminOrders.tsx`
- `admin/AdminReports.tsx`
- `admin/AdminUIComponents.tsx`

### Priority 6: Modal/Form Components (10 files)
- `CreateInboxModal.tsx`
- `ComposeModal.tsx`
- `ConfirmationModal.tsx`
- `TransferInboxModal.tsx`
- `EmailPromptModal.tsx`
- `telegram-link-modal.tsx`
- `SearchAdvanced.tsx`
- `InboxToolbar.tsx`
- `QuickGenerateCard.tsx`
- `QuickActions.tsx`

### Priority 7: Auth Components (3 files)
- `Auth/PasskeyLogin.tsx`
- `Auth/PasskeyManager.tsx`
- `Auth/MagicLinkRequestForm.tsx`

### Priority 8: Other Components (11 files)
- `inbox-viewer/message-list.tsx`
- `inbox-viewer/message-detail.tsx`
- `inbox-viewer/search-form.tsx`
- `InboxSelector.tsx`
- `LegalPageLayout.tsx`
- `OnboardingHints.tsx`
- `SettingsTabs.tsx`
- `trust-badge.tsx`
- `AdminPanel.tsx`
- `TelegramSection.tsx`
- `UserSelect.tsx`

---

## Recommended Approach

### Phase 1: Automated Refactoring (Recommended)
Create a codemod script to batch replace common patterns:

```bash
# Example sed replacements
slate-100 → nebula-elevated
slate-700 → nebula-text-secondary
dark:bg-slate-800 → (remove, token handles it)
```

### Phase 2: Manual Review
After automated changes, review each component for:
- Correct semantic token usage
- Proper hover/focus states
- Consistent border treatments

### Phase 3: Visual QA
Test all pages in both light and dark modes to verify consistency.

---

## Unresolved Questions

1. **Should we create utility classes?** e.g., `.text-primary`, `.bg-card` for common patterns
2. **Animation tokens?** Many components use inline animation values - standardize?
3. **Component library extraction?** Consider extracting to separate package for reuse

---

## Next Steps

1. Run migration on Priority 2 (Navigation) components first - high visibility
2. Create automated test for color token compliance
3. Update `docs/design-guidelines.md` with token reference
4. Consider ESLint rule to prevent hardcoded colors

