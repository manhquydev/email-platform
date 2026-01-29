# Phase 2: Hero Email Address Component

## Context Links

- [Plan Overview](./plan.md)
- [Email UI Patterns Research](./research/researcher-260124-2307-email-inbox-ui-patterns.md)
- [Design System V3](../../docs/design-system-version-c.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 - Critical |
| Status | pending |
| Effort | 1h |
| Dependencies | Phase 1 complete |

Create a prominent "Hero" email address display as the dominant UI element. Research indicates this is critical for public inbox UX - the address + copy button should be immediately visible and one-click copyable.

## Key Insights

From research:
- "Hero Copy Button: The address + Copy button is the most dominant UI element"
- "Instant Provisioning: No Generate button. Address exists the moment page loads"
- Monospace font for email addresses enhances readability

## Requirements

### Functional
- Large, prominent email address display
- One-click copy to clipboard
- Visual feedback on copy (toast + button state change)
- Show copy success state briefly (1.5s)

### Non-Functional
- Address uses monospace font (`font-mono`)
- Copy button uses Version C ghost button style
- Transition on copy state <= 150ms

## Architecture

### Component Structure

```
HeroEmailAddress
├── EmailDisplay (monospace, large)
├── CopyButton (icon + tooltip)
└── CopySuccessIndicator (checkmark flash)
```

### Props Interface

```typescript
interface HeroEmailAddressProps {
  email: string;
  onCopy: () => void;
}
```

## Related Code Files

### Files to Create
- `services/web/src/components/inbox-viewer/hero-email-address.tsx`

### Files to Modify
- `services/web/src/pages/inbox-viewer-modules/inbox-viewer-components.tsx`

## Implementation Steps

### Step 1: Create hero-email-address.tsx

```tsx
// services/web/src/components/inbox-viewer/hero-email-address.tsx
import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";

interface HeroEmailAddressProps {
  email: string;
}

export function HeroEmailAddress({ email }: HeroEmailAddressProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  }, [email]);

  return (
    <div className="flex items-center justify-center gap-3 py-6 px-4
      bg-zinc-950 border-b border-zinc-800">
      {/* Email Address */}
      <span className="text-2xl md:text-3xl font-mono font-medium text-white
        tracking-tight truncate max-w-[70%]">
        {email}
      </span>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className={`p-2.5 rounded-md border transition-all duration-100
          ${copied
            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
          }`}
        title="Copy email address"
        aria-label="Copy email address"
      >
        {copied ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
```

### Step 2: Integrate into MessageListPane

Update `inbox-viewer-components.tsx`:

1. Import the new component:
   ```tsx
   import { HeroEmailAddress } from "../../components/inbox-viewer/hero-email-address";
   ```

2. Replace the existing email toolbar in MessageListPane:
   ```tsx
   export function MessageListPane({ ... }) {
     return (
       <div className="lg:w-1/3 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
         {/* Hero Email Address - NEW */}
         <HeroEmailAddress email={email} />

         {/* Toolbar Actions - Simplified */}
         <div className="px-3 py-2 border-b border-zinc-800 flex justify-end gap-2">
           <button onClick={onCopyShareLink}
             className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900
               rounded-md transition-colors" title="Share link">
             {/* Share icon */}
           </button>
           <button onClick={onRefresh} disabled={loading}
             className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900
               rounded-md transition-colors disabled:opacity-50" title="Refresh">
             {/* Refresh icon */}
           </button>
           <button onClick={onChangeEmail}
             className="px-2 py-1 text-sm text-zinc-500 hover:text-white
               transition-colors">
             Change
           </button>
         </div>

         <MessageList ... />
       </div>
     );
   }
   ```

### Step 3: Remove duplicate copy functionality

The hero component now handles email copying. Remove:
- Duplicate `onCopyEmail` button from toolbar
- Keep only share link, refresh, and change email buttons

## Todo List

- [ ] Create `hero-email-address.tsx` component
- [ ] Add copy success state with checkmark icon
- [ ] Integrate into MessageListPane
- [ ] Remove duplicate copy button from toolbar
- [ ] Test clipboard functionality
- [ ] Test on mobile viewport (truncation)
- [ ] Verify toast messages work

## Success Criteria

- [ ] Email address is largest text element in left pane
- [ ] Uses monospace font
- [ ] One-click copy works
- [ ] Visual feedback (checkmark + color change) on copy
- [ ] Toast confirmation appears
- [ ] Truncates gracefully on small screens

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Clipboard API not supported | Low | Already have fallback in existing code |
| Long email truncation | Low | Use `truncate` + `max-w-[70%]` |
| Mobile tap target too small | Medium | Use `p-2.5` for 40px touch target |

## Security Considerations

- No new security concerns
- Clipboard write is user-initiated action

## Next Steps

After Phase 2:
- Proceed to Phase 3: Keyboard Navigation
- Hero component provides visual anchor for keyboard focus
