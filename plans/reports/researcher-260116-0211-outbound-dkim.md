# Outbound Email Deliverability & DKIM Implementation Research

## Executive Summary
Implementation of robust outbound deliverability requires strict adherence to SPF, DKIM, and DMARC. For Node.js, `nodemailer` is the industry standard and natively supports dynamic DKIM signing using stored private keys. Key rotation and alignment are critical for maintaining sender reputation.

## Core Deliverability Pillars (2026 Standards)

### 1. SPF (Sender Policy Framework)
- **Mechanism**: DNS TXT record listing authorized IP/domains.
- **Best Practice**: Use `~all` (softfail) to allow DMARC to handle failures via DKIM. Avoid exceeding 10 DNS lookups.
- **Alignment**: `Return-Path` domain should match the `From` domain.

### 2. DKIM (DomainKeys Identified Mail)
- **Mechanism**: Cryptographic signature in mail headers.
- **Best Practice**: Use 2048-bit RSA keys. Sign with `rsa-sha256`.
- **Rotation**: Rotate every 6-12 months using selectors (e.g., `v1._domainkey`, `v2._domainkey`) to prevent delivery gaps.

### 3. DMARC (Domain-based Message Authentication)
- **Mechanism**: Policy for handling SPF/DKIM failures.
- **Strategy**: Start with `p=none` (monitoring), move to `p=quarantine`, finally `p=reject`.
- **Alignment**: Requires either SPF or DKIM domain to match the visible `From` domain (relaxed alignment is usually sufficient).

## Implementation in Node.js

### Library Selection
- **Nodemailer**: Best-in-class. Supports built-in DKIM signing. No need for `nodemailer-dkim` or `mailbuild` (Nodemailer uses its own composer).
- **Dynamic Signing**: Supports per-message DKIM configuration, allowing keys to be fetched from the database at runtime.

### Data Model & Security
- **Model**: `DomainDkim` (already in `schema.prisma`).
- **Storage**: Private keys MUST be encrypted. Use `services/api/src/utils/encryption.ts` (AES-256-GCM) with `appConfig.totpEncryptionKey`.
- **Retrieval**:
  1. Fetch `DomainDkim` for the sending domain.
  2. Decrypt `privateKey`.
  3. Pass to `nodemailer`.

### Code Pattern for Dynamic Signing
```typescript
const dkimConfig = {
    domainName: domain.name,
    keySelector: dkim.selector,
    privateKey: decrypt(dkim.privateKey)
};

await transporter.sendMail({
    from: '"Sender" <user@domain.com>',
    to: 'recipient@example.com',
    subject: 'Signed Email',
    dkim: dkimConfig // Per-message override
});
```

## Key Rotation Strategy
1. **Generate New Key**: Create new 2048-bit RSA pair with a new selector (e.g., `2026-q1`).
2. **Publish DNS**: Add the new public key to DNS.
3. **Wait for TTL**: Ensure DNS propagation (24-48h).
4. **Update DB**: Update `DomainDkim` record with new `privateKey` and `selector`.
5. **Clean up**: Remove old DNS record after successful rotation.

## SPF/DMARC Alignment Recommendations
- **Custom Return-Path**: For multi-tenant platforms, use a custom `Return-Path` (e.g., `bounces.yourdomain.com`) that aligns with the sending domain to satisfy SPF alignment.
- **DKIM Focus**: Rely on DKIM alignment for DMARC pass, as it survives forwarding better than SPF.

## Unresolved Questions
1. Does the current `OutboundService` support multi-tenant `Return-Path` headers?
2. Should we implement a "DKIM Health Check" service to verify DNS records before enabling signing?
3. Is `appConfig.totpEncryptionKey` sufficient for DKIM keys, or should we use a dedicated `DKIM_ENCRYPTION_KEY`?

## Sources:
- [Nodemailer DKIM Documentation](https://nodemailer.com/dkim/)
- [RFC 6376 (DKIM)](https://tools.ietf.org/html/rfc6376)
- [Google & Yahoo 2024/2025 Sender Requirements](https://blog.google/products/gmail/gmail-security-authentication-spam-protection/)
- [Prisma Schema (Local)](D:/project/Clone/email-platform/services/api/prisma/schema.prisma)
