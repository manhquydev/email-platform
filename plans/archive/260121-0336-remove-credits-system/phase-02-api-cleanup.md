# Phase 2: API Cleanup

**Effort:** 4 hours
**Status:** pending
**Risk:** MEDIUM

## Objective

Xóa tất cả credit-related logic trong API layer.

## Files to Modify

### 2.1 DELETE `services/api/src/services/credit.service.ts`

```bash
rm services/api/src/services/credit.service.ts
```

### 2.2 Modify `services/api/src/routes/outbound.ts`

**Remove lines 83-100** (credit check/deduct):
```typescript
// DELETE THIS BLOCK:
const { CreditService } = await import("../services/credit.service");
const { CreditTransactionType } = await import("@prisma/client");
try {
    await CreditService.deductCredits(...)
} catch (error) {
    if (error.message === "Insufficient credits") {
        return reply.status(402).send({ error: "Insufficient credits..." });
    }
}
```

**Remove lines 152, 166-172** (remainingCredits response, refund on fail):
```typescript
// DELETE: remainingCredits in response
remainingCredits: (user?.credits || 0) - CREDIT_COST

// DELETE: refund block
await CreditService.addCredits(...)
```

### 2.3 Modify `services/api/src/routes/subscription.ts`

**Lines 263-271** - Remove USAGE_BASED handling:
```typescript
// DELETE THIS BLOCK:
} else if (pkg.type === "USAGE_BASED") {
    const creditsToAdd = pkg.creditAmount || 0;
    await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: creditsToAdd } }
    });
}
```

### 2.4 Modify `services/api/src/routes/auth.ts`

Remove `credits` from user response objects.

### 2.5 DELETE Tests

```bash
rm services/api/src/test/credit.test.ts
```

Update `services/api/src/test/subscription.integration.test.ts` - remove USAGE_BASED tests.

## Todo

- [ ] Delete credit.service.ts
- [ ] Remove credit logic from outbound.ts
- [ ] Remove USAGE_BASED from subscription.ts
- [ ] Remove credits from auth responses
- [ ] Delete/update credit tests
- [ ] Run `npm run build` to verify no errors

## Success Criteria

- No import of CreditService anywhere
- `npm run build` passes
- No TypeScript errors
