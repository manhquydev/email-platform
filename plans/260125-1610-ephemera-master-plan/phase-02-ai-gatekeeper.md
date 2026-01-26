# Phase 2: AI Gatekeeper

**Effort**: 10h | **Priority**: P0 | **Week**: 2-3

## Overview
Transform AI from passive summarizer to active protector. Strip tracking, extract OTPs, detect threats.

## Key Features
- Auto OTP/verification code extraction
- Tracking pixel stripping
- Phishing/scam detection
- Smart categorization

## Technical Tasks

### 1. OTP Extraction Service (3h)
**File**: `services/api/src/services/otp-extractor.service.ts`
```typescript
interface OTPResult {
  code: string;
  type: 'numeric' | 'alphanumeric' | 'link';
  confidence: number;
  source: 'regex' | 'ai';
}

// Regex patterns for common formats
// LLM fallback for complex cases
// Cache results in message metadata
```

**API**: `GET /v1/messages/:id/otp`

### 2. Tracking Sanitizer (2h)
**File**: `services/api/src/services/email-sanitizer.service.ts`
- Strip 1x1 tracking pixels
- Rewrite tracking URLs through proxy
- Remove email open trackers
- Run on SMTP ingestion (before storage)

### 3. Phishing Detection (3h)
**File**: `services/api/src/services/phishing-detector.service.ts`
- Check sender reputation (SPF/DKIM results)
- Analyze URL patterns (suspicious TLDs, lookalikes)
- LLM content analysis for social engineering
- Return risk score (0-100)
- Flag messages with warning banner

### 4. Smart Categorization (2h)
**File**: `services/api/src/services/email-categorizer.service.ts`
- Categories: `verification`, `newsletter`, `receipt`, `promotional`, `personal`
- Auto-tag on ingestion
- Store in message metadata
- Filter API: `?category=verification`

## AI Tier Limits
| Tier | Operations/day |
|------|----------------|
| Free | 10 |
| Shield | 100 |
| Guard+ | Unlimited |

## Success Criteria
- [ ] OTP extraction 95%+ accuracy on top 50 services
- [ ] Tracking pixels 100% stripped
- [ ] Phishing detection < 1% false positive
- [ ] Categorization 90%+ accuracy
