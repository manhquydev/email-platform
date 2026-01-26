# Phase 2: AI Gatekeeper UI Enhancements

## Context Links

- OTP Highlight: `services/web/src/components/dashboard/OTPHighlight.tsx`
- Message Detail: `services/web/src/pages/dashboard-modules/message-detail-pane.tsx`

## Overview

| Field | Value |
|-------|-------|
| Priority | P2 |
| Status | Pending |
| Effort | 4h |

Enhance existing email viewer with AI-extracted OTP display and phishing warnings.

## Key Insights

- OTP extraction already exists in `OTPHighlight.tsx`
- Backend may already extract OTPs (check message payload)
- Need prominent copy-first design
- Phishing detection needs visual warning

## Requirements

### Functional

- Auto-detect OTP codes in emails
- One-click copy OTP
- Phishing warning banner
- Link safety indicators

### Non-Functional

- OTP visible within 1s of email open
- Copy works on mobile
- Warning colors meet accessibility contrast

## Architecture

Enhance existing components:

```
MessageDetailPane
├── OTPBanner (if OTP detected) ← Enhance
├── PhishingWarning (if flagged) ← NEW
├── EmailBody
│   └── SafetyIndicators (on links) ← NEW
└── AttachmentList
```

## Related Code Files

### Create

- `services/web/src/components/security/PhishingWarning.tsx`
- `services/web/src/components/security/LinkSafetyIndicator.tsx`

### Modify

- `services/web/src/components/copy-first/OTPBanner.tsx` - Enhance visibility
- `services/web/src/pages/dashboard-modules/message-detail-pane.tsx` - Add phishing warning

## Implementation Steps

1. Enhance OTPBanner component
   - Larger, more prominent display
   - Auto-copy on render (with user preference)
   - Visual countdown if OTP has expiry
   - Success animation on copy

2. Create PhishingWarning component
   ```tsx
   interface PhishingWarningProps {
     level: 'low' | 'medium' | 'high';
     reasons: string[];
     onDismiss?: () => void;
   }
   ```
   - Red/orange/yellow based on level
   - Expandable details
   - Report false positive option

3. Create LinkSafetyIndicator
   - Small icon next to external links
   - Tooltip with domain info
   - Warning for suspicious domains

4. Integrate with MessageDetailPane
   - Check message flags for phishing score
   - Show warning above email body
   - Add safety indicators to rendered HTML links

## Todo List

- [ ] Enhance OTPBanner visibility
- [ ] Add auto-copy preference
- [ ] Create PhishingWarning component
- [ ] Create LinkSafetyIndicator component
- [ ] Integrate with message detail pane
- [ ] Add phishing flag to message type
- [ ] Test with various email formats

## Success Criteria

- [ ] OTP visible immediately on email open
- [ ] One-click copy works
- [ ] Phishing warnings display for flagged emails
- [ ] Link indicators show on hover
- [ ] Mobile-friendly interactions

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| False positive phishing | Medium | Allow dismiss + report |
| OTP regex misses codes | Low | Backend handles extraction |
| Auto-copy annoys users | Low | Make it a preference |

## Security Considerations

- Don't expose phishing algorithm details
- Sanitize HTML before rendering
- External links open in new tab with noopener

## Next Steps

Backend may need to expose phishing scores in message API response.
