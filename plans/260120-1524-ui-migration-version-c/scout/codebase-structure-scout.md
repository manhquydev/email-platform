# Codebase Structure Scout Report

**Context**: Ephemera UI Migration (Version C)
**Date**: 2026-01-20
**Status**: Complete

## 1. Layout Architecture
| Component | Path | Type | Purpose |
|-----------|------|------|---------|
| `MainLayout` | `src/layouts/MainLayout.tsx` | Wrapper | Protected app routes, health check, wraps `AppShell` |
| `PublicLayout` | `src/layouts/PublicLayout.tsx` | Wrapper | Public pages, includes `Navigation` (landing) & `SiteFooter` |
| `AuthLayout` | `src/layouts/AuthLayout.tsx` | Wrapper | Auth pages, animated background, minimal footer |
| `AppShell` | `src/components/AppShell.tsx` | Component | Main app shell (implied from usage) |
| `ResponsiveLayout`| `src/layouts/ResponsiveLayout.tsx` | Wrapper | Adaptive layout logic |

## 2. Page Classification
**Public**
- Landing: `LandingPage.tsx`, `Features.tsx`, `Pricing.tsx`
- Legal: `TermsOfService.tsx`, `PrivacyPolicy.tsx`, `GDPR.tsx`
- Support: `Support.tsx`, `Contact.tsx`

**Auth**
- `Login.tsx`, `Register.tsx`, `VerifyEmail.tsx`, `MagicLinkVerify.tsx`

**Dashboard / App**
- Core: `Dashboard.tsx`, `InboxManager.tsx`, `FocusDashboard.tsx`
- Settings: `Settings.tsx`, `MyDomains.tsx`, `Forwarding.tsx`
- Tools: `Authenticator.tsx`

**Admin**
- `Admin.tsx` (handles sub-routes)

## 3. Shared Components
- **UI Core**: `ui/GlassCard.tsx`, `ui/Button.tsx`, `ui/Input.tsx`, `ui/Dropdown.tsx`
- **Feedback**: `Loading.tsx`, `ErrorBoundary.tsx`, `ConfirmationModal.tsx`
- **Utils**: `ThemeToggle.tsx`, `ScrollToTop.tsx`

## 4. Navigation Structure
Located in `src/components/Navigation/`:
- **Entry**: `index.ts` (Exports main `Navigation` component)
- **Desktop**: `DesktopNav.tsx`
- **Mobile**: `MobileNav.tsx`, `HamburgerMenu.tsx`
- **Context**: `NavigationContext.tsx`

## 5. Form System
- **Input**: `src/components/ui/Input.tsx` (~70 lines, Tailwind + CN utility)
- **Button**: `src/components/ui/Button.tsx` (~90 lines, Variants: primary/ghost/danger)
- **Forms**: `LoginForm.tsx`, `MagicLinkRequestForm.tsx`

## 6. CSS Architecture
**Primary Approach**: Tailwind CSS + CSS Variables (Nebula Design System)
- **Main Entry**: `src/index.css` (~5500 lines) - Contains massive amount of custom CSS, animations, and component overrides.
- **Design Tokens**: `src/styles/design-tokens.css`
- **Theme**: `src/styles/nebula-glass.css`
- **Tailwind Config**: Used for utility classes, but heavy reliance on custom CSS classes in `index.css` (e.g., `.glass-panel`, `.btn-primary`).

## Unresolved Questions
- Exact location of `Sidebar` component (referenced in styles but file structure unclear in `components/`).
- `Select` component implementation (likely handled by `Dropdown.tsx` or native select styled in CSS).
