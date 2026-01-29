# Phase 02: DKIM Service

**Status:** planned
**Effort:** 3h
**Dependencies:** Phase 01 (Database Schema)
**Owner:** Backend

## Objective

Implement DKIM key generation, storage, and signing service with DNS record helpers.

## Implementation

### 1. DKIM Service (`services/dkim.service.ts`)

```typescript
// Key responsibilities:
// 1. Generate RSA 2048-bit keypairs
// 2. Encrypt private key before storage
// 3. Format DNS TXT record for public key
// 4. Sign email headers with private key
// 5. Support key rotation

import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { encrypt, decrypt } from '../utils/crypto';

export class DkimService {
  private static DEFAULT_SELECTOR_PREFIX = 'ephemera';
  private static DEFAULT_KEY_SIZE = 2048;

  // Generate DKIM keypair for domain
  async generateKeys(domainId: string): Promise<{
    selector: string;
    dnsRecord: { name: string; type: string; value: string };
  }>;

  // Get DKIM config for domain
  async getDkimConfig(domainId: string): Promise<DkimConfig | null>;

  // Rotate keys (creates new keypair, keeps old for overlap)
  async rotateKeys(domainId: string): Promise<RotationResult>;

  // Sign email message
  async signMessage(domainId: string, emailData: Buffer): Promise<string>;

  // Format public key as DNS TXT record value
  private formatDnsRecord(publicKey: string): string;
}
```

### 2. Crypto Utilities Extension (`utils/crypto.ts`)

```typescript
// Extend existing TOTP encryption for DKIM keys
export function encrypt(data: string, key?: string): string;
export function decrypt(data: string, key?: string): string;

// Use same TOTP_ENCRYPTION_KEY or dedicated DKIM_ENCRYPTION_KEY
```

### 3. DKIM Routes (`routes/dkim.ts`)

```typescript
// POST /domains/:id/dkim/generate
// - Check domain ownership
// - Check if DKIM already exists (error if so, must rotate)
// - Generate keypair
// - Return DNS record for user to add

// GET /domains/:id/dkim
// - Return selector, algorithm, createdAt, dnsRecord
// - Never expose privateKey

// POST /domains/:id/dkim/rotate
// - Generate new keypair with incremented selector
// - Mark old key as rotatedAt
// - Return new DNS record
```

## API Specifications

### Generate DKIM Keys

```http
POST /domains/:id/dkim/generate
Authorization: Bearer <token>

Response 201:
{
  "selector": "ephemera2026",
  "dnsRecord": {
    "name": "ephemera2026._domainkey.example.com",
    "type": "TXT",
    "value": "v=DKIM1; k=rsa; p=MIIBIjAN..."
  },
  "instructions": "Add this TXT record to your DNS"
}

Response 409: { "error": "DKIM already configured, use rotate" }
```

### Get DKIM Config

```http
GET /domains/:id/dkim
Authorization: Bearer <token>

Response 200:
{
  "enabled": true,
  "selector": "ephemera2026",
  "algorithm": "rsa-sha256",
  "keySize": 2048,
  "createdAt": "2026-01-08T...",
  "rotatedAt": null,
  "dnsRecord": {
    "name": "ephemera2026._domainkey.example.com",
    "type": "TXT",
    "value": "v=DKIM1; k=rsa; p=MIIBIjAN..."
  }
}

Response 404: { "error": "DKIM not configured" }
```

### Rotate DKIM Keys

```http
POST /domains/:id/dkim/rotate
Authorization: Bearer <token>

Response 200:
{
  "previousSelector": "ephemera2026",
  "newSelector": "ephemera202602",
  "dnsRecord": { ... },
  "note": "Keep old DNS record for 48h during propagation"
}
```

## Environment Variables

```bash
DKIM_KEY_SIZE=2048              # RSA key size (2048 recommended)
DKIM_SELECTOR_PREFIX=ephemera   # Prefix for selector naming
```

## Selector Naming Strategy

- Initial: `{prefix}{YYYY}` (e.g., `ephemera2026`)
- Rotation: `{prefix}{YYYYMM}` (e.g., `ephemera202602`)
- Further: `{prefix}{YYYYMMDD}` if needed

## Security Considerations

1. **Key Storage**
   - Private key encrypted with AES-256-GCM
   - Use `TOTP_ENCRYPTION_KEY` (already exists for TOTP secrets)
   - Never log or return private key in API responses

2. **Key Size**
   - Default 2048-bit (NIST recommended minimum)
   - Support 4096-bit for paranoid users (config override)

3. **Algorithm**
   - `rsa-sha256` only (sha1 deprecated)

## Files to Create/Modify

| File | Action |
|------|--------|
| `services/dkim.service.ts` | Create |
| `routes/dkim.ts` | Create |
| `utils/crypto.ts` | Modify (or create if not exists) |
| `config.ts` | Modify - add DKIM config vars |
| `index.ts` | Modify - register dkim routes |

## Acceptance Criteria

- [ ] Generate 2048-bit RSA keypair
- [ ] Encrypt private key before DB storage
- [ ] Format public key as valid DKIM DNS TXT record
- [ ] Sign sample message with generated key
- [ ] Verify signature with public key
- [ ] Rotate keys with selector increment
- [ ] API endpoints return correct responses
- [ ] Domain ownership verified for all operations

## Dependencies

- Node.js `crypto` module (built-in)
- Prisma client for DB operations
- Existing auth middleware

## Notes

- DKIM signing will be used by outboundWorker in Phase 03
- DNS record verification is out of scope (user must add manually)
- Consider adding DNS lookup to verify record propagation (future enhancement)
