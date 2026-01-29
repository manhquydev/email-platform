# Implementation Plan: Outbound DKIM Signing

## Goal
Enable automatic DKIM signing for outbound emails using domain-specific private keys stored in the database.

## Architecture
- **Storage**: `DomainDkim` table stores encrypted private keys, selectors, and public keys.
- **Service**: `OutboundService` (in `services/api/src/services/outbound.ts`) will be updated to fetch and apply DKIM settings.
- **Crypto**: `AES-256-GCM` via `services/api/src/utils/encryption.ts` for key security.
- **Library**: `nodemailer` (already in use) for header signing.

## Step-by-Step Implementation

### 1. Enhanced OutboundService
Modify `services/api/src/services/outbound.ts`:
- Import `prisma` from `../lib/prisma`.
- Import `decrypt` from `../utils/encryption`.
- Update `sendEmail` to accept an optional `domainId`.
- Implement `fetchDkimConfig(domainId: string)` to retrieve and decrypt the key.
- Apply `dkim` object to `this.transporter.sendMail()` options.

### 2. Domain Management Logic
Ensure the system can handle:
- Domain lookup from the `from` address if `domainId` is not provided.
- Graceful fallback: if no DKIM record exists, send unsigned (or signed by system default if configured).

### 3. Key Decryption & Formatting
- Private keys are stored as encrypted strings in the DB.
- Decrypt at runtime using `appConfig.totpEncryptionKey`.
- Ensure PEM format is preserved for `nodemailer`.

### 4. Verification & Health Checks
- Implement a method to verify if a domain has a valid DKIM record before attempting to sign.
- Log failures to sign without blocking the actual email delivery (if deliverability is prioritized over authentication, though signed is always better).

## Testing Plan
1. **Mock Test**: Create a test case in `services/api/src/test/outbound.test.ts` (new file) to mock Prisma returning a `DomainDkim` record and verify `nodemailer` receives the `dkim` options.
2. **End-to-End**: Use a test domain, generate a keypair, store it, and send an email to a service like Mail-Tester.com to verify DKIM signature validity.
3. **Encryption Test**: Verify that keys are correctly encrypted/decrypted and don't leak in logs.

## Security Considerations
- **Key Access**: Only the API service should have access to the encryption key.
- **DB Leak**: If the DB is compromised, the keys are still protected by AES-256-GCM.
- **Rotation**: Selectors allow for seamless transition between keys.

## Unresolved Questions
- Should we support multiple selectors per domain for gradual rotation?
- Do we need to automate DNS verification of the public key?
