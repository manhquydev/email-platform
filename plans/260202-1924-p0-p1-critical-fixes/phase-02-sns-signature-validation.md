---
parent: plan.md
priority: P0
status: pending
effort: 2h
---

# Phase 2: AWS SNS Signature Validation

## Context
- **Issue:** `services/api/src/routes/webhooks/ses.ts:51` skips signature validation
- **Current behavior:** Only checks if `Signature` and `SigningCertURL` fields exist
- **Impact:** Attackers can send fake bounce/complaint events
- **Risk:** Critical - can DoS legitimate email delivery by falsely marking addresses as bounced

## Key Insights
- AWS SNS requires cryptographic signature verification
- `sns-validator` npm package handles cert fetching, caching, and verification
- Must validate: cert URL domain, signature, message timestamp

## Related Code Files

### Modify
- `services/api/src/routes/webhooks/ses.ts` - Add proper validation

### Install
- `sns-validator` - NPM package for SNS validation
- `@types/sns-validator` - TypeScript definitions (if available)

## Implementation Steps

1. **Install package**
   ```bash
   cd services/api && npm install sns-validator
   ```

2. **Import validator**
   ```typescript
   import MessageValidator from "sns-validator";
   const snsValidator = new MessageValidator();
   ```

3. **Create promisified wrapper**
   ```typescript
   function validateSnsMessage(message: unknown): Promise<void> {
     return new Promise((resolve, reject) => {
       snsValidator.validate(message, (err) => {
         if (err) reject(err);
         else resolve();
       });
     });
   }
   ```

4. **Update `validateSignature` method**
   ```typescript
   async validateSignature(payload: SnsNotification): Promise<boolean> {
     try {
       await validateSnsMessage(payload);
       return true;
     } catch (err) {
       console.error("[SES-Webhook] SNS validation failed:", err);
       return false;
     }
   }
   ```

5. **Update handler** to reject invalid signatures with 401

6. **Remove TODO comment** at line 51

## Todo List
- [ ] Install `sns-validator` package
- [ ] Import and initialize MessageValidator
- [ ] Create async wrapper function
- [ ] Replace `validateSignature` implementation
- [ ] Update handler to return 401 on validation failure
- [ ] Remove TODO comment
- [ ] Test with real AWS SNS messages
- [ ] Test rejection of forged messages

## Success Criteria
- [ ] Valid AWS SNS messages accepted
- [ ] Forged messages rejected with 401
- [ ] Subscription confirmations still work
- [ ] Bounce/complaint processing unchanged

## Security Considerations
- Never trust messages without signature validation in production
- Log validation failures for security monitoring
- Consider rate limiting webhook endpoint
