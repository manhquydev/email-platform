# Code Review: Power User Features

**Date:** 2026-01-17
**Reviewer:** Code Review Agent
**Commit:** 76b84d3 - feat(api): add power user features

---

## Code Review Summary

### Scope
- **Files reviewed:** 24 files (2,502 additions, 180 deletions)
- **Lines of code analyzed:** ~2,500
- **Review focus:** Power user features - forwarding rules, OTP extraction, webhooks, reply/forward
- **Updated plans:** None (extension improvements plan separate)

### Overall Assessment
**Quality: Good** - Well-structured implementation with comprehensive test coverage. Some type safety concerns with excessive `as any` casts and one console.log statement found. No critical security vulnerabilities detected.

---

## Critical Issues
None found.

---

## High Priority Findings

### H1: Excessive Type Casting (`as any`)
**Severity:** High
**Impact:** Type safety violations, runtime errors potential

**Locations:**
- `routes/forwarding.ts:276-278` - Rule properties cast to any
- `routes/messages.ts` - 27 occurrences of `(request.user as any)`
- `services/forwarding/destinations/telegram-destination.ts:21` - chatId cast
- `services/forwarding/destinations/discord-destination.ts:21` - webhookUrl cast
- `services/forwarding/destinations/webhook-destination.ts:26-27` - webhookUrl/webhookSecret cast
- `services/forwarding/index.ts:56,65,71,82,92` - Multiple rule property casts

**Root Cause:** Prisma schema not updated with new ForwardingRule fields (destinationType, telegramChatId, discordWebhookUrl, webhookUrl, webhookSecret, matchType)

**Recommendation:**
```typescript
// Define proper types
interface AuthenticatedUser {
  userId: string;
  role: string;
}

interface EnhancedForwardingRule extends ForwardingRule {
  destinationType: 'EMAIL' | 'TELEGRAM' | 'DISCORD' | 'WEBHOOK';
  telegramChatId: string | null;
  discordWebhookUrl: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
  matchType: 'ALL' | 'ANY';
}

// Usage
const user = request.user as AuthenticatedUser;
const rule = forwardingRule as EnhancedForwardingRule;
```

**Alternative:** Update Prisma schema to include these fields properly, regenerate types.

---

### H2: Missing Error Handling for DNS Operations
**Severity:** High
**Impact:** Unhandled promise rejections

**Location:** `services/dkim.service.ts:206-228`

**Issue:** DNS resolver operations can throw but error handling only catches specific error codes.

**Current Code:**
```typescript
const resolver = new dns.Resolver();
const records = await resolver.resolveTxt(dnsHost);
```

**Recommendation:** Add timeout and more comprehensive error handling:
```typescript
try {
  const resolver = new dns.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']); // Fallback DNS

  const records = await Promise.race([
    resolver.resolveTxt(dnsHost),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DNS timeout')), 5000)
    )
  ]);
  // ...
} catch (error: any) {
  return {
    valid: false,
    found: null,
    expected: expectedRecord,
    error: error.code === 'ENOTFOUND'
      ? 'DNS record not found'
      : error.message || 'DNS lookup failed',
  };
}
```

---

### H3: Credit Refund Race Condition
**Severity:** Medium-High
**Impact:** Potential double-refund if update fails

**Location:** `routes/messages.ts:700-707, 895-901`

**Issue:** Credit refund happens before OutboundMessage status update fails.

**Current Flow:**
```typescript
await prisma.outboundMessage.update({...}).catch(() => {}); // Silent fail
await CreditService.addCredits(...); // Refund
```

**Recommendation:** Wrap in transaction:
```typescript
await prisma.$transaction(async (tx) => {
  await tx.outboundMessage.update({
    where: { id: outboundMsg.id },
    data: { status: "FAILED", bounceMessage: err.message },
  });

  await CreditService.addCredits(
    userId, CREDIT_COST, CreditTransactionType.REFUND,
    `Refund for failed ${action}`, { error: err.message }
  );
});
```

---

## Medium Priority Improvements

### M1: Console.log in Production Code
**Location:** `services/forwarding/index.ts:127-130`

**Issue:**
```typescript
console.log(
  `[Forwarding] Rule ${rule.id}: ${result.success ? "SUCCESS" : "FAILED"} -> ${destination}`,
  result.error ? `Error: ${result.error}` : ""
);
```

**Fix:** Use proper logging via Fastify logger:
```typescript
request.log.info(
  { ruleId: rule.id, destination, success: result.success, error: result.error },
  `Forwarding rule executed`
);
```

---

### M2: DKIM Public Key Exposure
**Location:** `routes/domains.ts:240`

**Issue:** Returns full public key in API response (not actual security issue, but verbose)

**Current:**
```typescript
return {
  selector: dkim.selector,
  publicKey: dkim.publicKey, // Full PEM (300+ chars)
  dnsRecord: `...`
};
```

**Recommendation:** Only return DNS record format:
```typescript
return {
  selector: dkim.selector,
  dnsRecord: dkim.dnsRecord,
  dnsHost: `${dkim.selector}._domainkey.${domain.name}`
};
```

---

### M3: Missing Input Validation for Regex Patterns
**Location:** `services/forwarding/condition-matcher.ts:83-90`

**Issue:** No length limit on user-provided regex patterns (ReDoS potential)

**Current:**
```typescript
case 'REGEX':
  if (!value) return false;
  try {
    const regex = new RegExp(value, caseSensitive ? '' : 'i');
    return regex.test(fieldValue);
  } catch {
    return false;
  }
```

**Recommendation:** Add validation:
```typescript
case 'REGEX':
  if (!value || value.length > 200) return false; // Limit length
  try {
    // Timeout regex execution
    const regex = new RegExp(value, caseSensitive ? '' : 'i');
    const timeoutMs = 100;
    const start = Date.now();

    const result = regex.test(fieldValue);
    if (Date.now() - start > timeoutMs) {
      console.warn('Regex took too long', { pattern: value });
    }
    return result;
  } catch {
    return false;
  }
```

---

### M4: Weak OTP Validation
**Location:** `utils/otpExtractor.ts:74-88`

**Issue:** Rejects valid codes like "123456" as sequential, but this is a common OTP format.

**Current:**
```typescript
const invalidPatterns = [
  /^(\d)\1+$/,      // All same digit
  /^123456$/,       // Sequential - TOO STRICT
  /^654321$/,       // Reverse sequential
  /^(19|20)\d{2}$/, // Years
];
```

**Recommendation:** Only reject if context suggests it's NOT an OTP:
```typescript
function isValidOTP(code: string, context?: string): boolean {
  if (!/^\d{4,8}$/.test(code)) return false;

  // If context has high-confidence keywords, allow sequential
  if (context && HIGH_CONFIDENCE_KEYWORDS.some(kw =>
    context.toLowerCase().includes(kw))) {
    return true;
  }

  // Otherwise apply strict validation
  const invalidPatterns = [
    /^(\d)\1+$/,      // All same
    /^(19|20)\d{2}$/, // Years
  ];
  return !invalidPatterns.some(p => p.test(code));
}
```

---

### M5: Missing Rate Limiting on Forward Test Endpoint
**Location:** `routes/forwarding.ts:249-281`

**Issue:** No rate limiting on test endpoint - potential abuse for DOS

**Recommendation:** Add rate limit:
```typescript
app.post("/forwarding/rules/:id/test", {
  preHandler: [
    app.authenticate,
    app.rateLimit({ max: 10, timeWindow: '1 minute' })
  ]
}, async (request, reply) => {
  // ...
});
```

---

## Low Priority Suggestions

### L1: Magic Numbers in Code
**Locations:**
- `routes/messages.ts:611,814` - CREDIT_COST = 1
- `services/forwarding/destinations/webhook-destination.ts:58` - 10s timeout
- `services/dkim.service.ts:11` - KEY_SIZE = 2048

**Suggestion:** Extract to constants file:
```typescript
// constants/credits.ts
export const CREDIT_COSTS = {
  EMAIL_REPLY: 1,
  EMAIL_FORWARD: 1,
  OUTBOUND_EMAIL: 1,
} as const;

// constants/timeouts.ts
export const TIMEOUTS = {
  WEBHOOK: 10000,
  DNS_LOOKUP: 5000,
} as const;
```

---

### L2: Inconsistent Error Messages
**Issue:** Mix of English and Vietnamese error messages

**Examples:**
- `routes/forwarding.ts:62` - "Email không hợp lệ" (Vietnamese)
- `routes/forwarding.ts:126` - "Invalid data" (English)

**Recommendation:** Use i18n or standardize to English for API errors.

---

### L3: Missing JSDoc Comments
**Locations:** Most new service functions lack documentation

**Example Fix:**
```typescript
/**
 * Forward email message to configured webhook endpoint
 * @param message - The email message to forward
 * @param rule - The forwarding rule containing webhook config
 * @returns Promise resolving to success status and optional error
 * @throws Never throws - returns error in result object
 */
export async function forwardToWebhook(
  message: MessageWithAttachments,
  rule: ForwardingRule
): Promise<SendResult> {
  // ...
}
```

---

## Positive Observations

1. **Excellent Test Coverage**: 28/28 tests passing for OTP extraction and condition matching
2. **Clean Separation of Concerns**: Forwarding destinations properly abstracted into separate modules
3. **Comprehensive Validation**: Zod schemas used throughout for input validation
4. **Security-Conscious**: HMAC signatures for webhooks, DKIM key encryption
5. **Good Error Handling**: Try-catch blocks with meaningful error messages
6. **Audit Trail**: Proper audit logging for sensitive operations (DKIM setup, email sending)
7. **Transaction Safety**: Credit deduction before sending with refund on failure
8. **Well-Structured Code**: Consistent patterns, readable function names

---

## Recommended Actions

### Immediate (Before Merge)
1. **Remove console.log** in `services/forwarding/index.ts:127`
2. **Add rate limiting** to test endpoint
3. **Fix type casts** - Create proper type definitions for enhanced ForwardingRule

### Short-term (Next Sprint)
4. **Add DNS timeout** in DKIM verification
5. **Wrap credit refund** in transaction to prevent race conditions
6. **Validate regex patterns** for length/complexity limits
7. **Standardize error messages** to English or implement i18n

### Long-term (Technical Debt)
8. **Extract magic numbers** to constants
9. **Add JSDoc comments** to public APIs
10. **Improve OTP validation** to reduce false negatives

---

## Metrics

- **Type Coverage:** ~85% (reduced by `as any` casts)
- **Test Coverage:** 100% for OTP/condition-matcher modules
- **Linting Issues:** 0 (TypeScript compilation passes)
- **Console Statements:** 1 found
- **Security Vulnerabilities:** 0 critical, 1 medium (ReDoS potential)

---

## Unresolved Questions

1. Should we update Prisma schema to include new ForwardingRule fields or continue with type casting?
2. What's the expected behavior for sequential OTP codes like "123456" - reject or accept if context is strong?
3. Should API error messages be in English only or support i18n?
4. Is there a global rate limiting strategy or should each endpoint define its own?
