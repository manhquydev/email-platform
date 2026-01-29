# Phase 03: ErrorPage Component

## Context Links
- [Plan](./plan.md)
- [Phase 02](./phase-02-error-illustrations.md)

## Overview

Create single reusable ErrorPage component with props-driven configuration for all error types (404, 403, 500, 503). Uses i18n translations and custom illustrations.

## Key Insights

- Single component approach follows DRY principle
- Props determine error type, illustration, and available actions
- Must work both standalone and within PublicLayout
- Should match glassmorphism design with backdrop-blur, gradients

## Requirements

1. Single ErrorPage.tsx component with props interface
2. Auto-select illustration based on error code
3. i18n integration for title/description
4. Action buttons: "Retry", "Go Home", "Back"
5. Keyboard accessible
6. Responsive design (mobile-first)

## Architecture

```tsx
interface ErrorPageProps {
  code: 404 | 403 | 500 | 503;
  title?: string;           // Override i18n default
  description?: string;     // Override i18n default
  showRetry?: boolean;      // Default: true for 500/503
  showHome?: boolean;       // Default: true
  showBack?: boolean;       // Default: true
  onRetry?: () => void;     // Custom retry handler
}

export function ErrorPage({ code, ... }: ErrorPageProps) {
  const { t } = useTranslation('errors');

  const config = {
    404: { Illustration: Error404Illustration, color: 'warning' },
    403: { Illustration: Error403Illustration, color: 'danger' },
    500: { Illustration: Error500Illustration, color: 'danger' },
    503: { Illustration: Error503Illustration, color: 'warning' },
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="neo-glass-card text-center max-w-md">
        <Illustration />
        <h1>{title || t(`${code}.title`)}</h1>
        <p>{description || t(`${code}.description`)}</p>
        <div className="flex gap-2">
          {showBack && <BackButton />}
          {showHome && <HomeButton />}
          {showRetry && <RetryButton onClick={onRetry} />}
        </div>
      </div>
    </div>
  );
}
```

## Related Code Files

- `services/web/src/components/illustrations/` - SVG components
- `services/web/src/i18n/locales/*.json` - Translations
- `services/web/src/layouts/PublicLayout.tsx` - Wrapper layout

## Implementation Steps

1. Create `pages/ErrorPage.tsx` with props interface
2. Import illustrations and map to error codes
3. Integrate useTranslation hook for i18n
4. Implement action buttons with navigation
5. Add glassmorphism styling matching existing UI
6. Add keyboard navigation support
7. Test all 4 error types render correctly

## Translation Keys Structure

```json
{
  "errors": {
    "404": {
      "title": "Page Not Found",
      "description": "The page you're looking for doesn't exist or has been moved."
    },
    "403": {
      "title": "Access Denied",
      "description": "You don't have permission to access this resource."
    },
    "500": {
      "title": "Server Error",
      "description": "Something went wrong on our end. Please try again later."
    },
    "503": {
      "title": "Service Unavailable",
      "description": "We're performing maintenance. Please check back soon."
    },
    "actions": {
      "retry": "Try Again",
      "home": "Go Home",
      "back": "Go Back"
    }
  }
}
```

## Todo List

- [ ] Create ErrorPage.tsx with TypeScript interface
- [ ] Implement error code to illustration mapping
- [ ] Add i18n integration with useTranslation
- [ ] Implement action buttons (retry, home, back)
- [ ] Apply glassmorphism styling
- [ ] Add keyboard accessibility (focus management)
- [ ] Test all error variants

## Success Criteria

- [ ] `<ErrorPage code={404} />` renders 404 page
- [ ] All 4 error types display correct illustration
- [ ] Translations work for vi/en
- [ ] Buttons navigate correctly
- [ ] Responsive on mobile/desktop
- [ ] Keyboard navigable

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Prop drilling complexity | Low | Low | Simple flat props |
| Style conflicts | Low | Medium | Use scoped classes |

## Security Considerations

- No user input rendered - XSS safe
- Navigation uses react-router, not window.location

## Next Steps

Proceed to Phase 04 (Routing Integration) to wire up ErrorPage.
