# Phase 2: Provider Adapters

## Context
We currently use `nodemailer` directly. To support Hybrid Outbound (switching providers based on cost/reputation), we need an abstraction layer.

## Requirements
1.  **Abstraction**: `EmailProvider` interface.
2.  **Flexibility**: Switch provider via ENV var `OUTBOUND_PROVIDER` (ses, mailgun, smtp).
3.  **Security**: DKIM signing support for all adapters.

## Architecture
**Pattern**: Strategy Pattern.

```typescript
interface EmailProvider {
  send(payload: EmailPayload): Promise<SendResult>;
}
```

## Implementation Steps
1.  **Define Interface**: `src/services/email-providers/interface.ts`.
2.  **Implement Adapters**:
    - `SmtpProvider` (wraps existing nodemailer logic).
    - `SesProvider` (uses `@aws-sdk/client-ses`).
    - `MailgunProvider` (uses `mailgun.js`).
3.  **Factory**:
    - Create `EmailProviderFactory` that reads `process.env.OUTBOUND_PROVIDER` and returns the correct instance.
4.  **Update Worker**:
    - Inject the provider from Factory into the worker created in Phase 1.

## Todo List
- [ ] Create `EmailProvider` interface
- [ ] Implement `SmtpProvider`
- [ ] Implement `SesProvider`
- [ ] Implement `MailgunProvider`
- [ ] Create Factory
- [ ] Update Worker to use Factory
