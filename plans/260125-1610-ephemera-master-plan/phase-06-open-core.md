# Phase 6: Open-Core & Community

**Effort**: 6h | **Priority**: P2 | **Week**: 6-7

## Overview
Build trust through transparency. Open source core, monetize cloud convenience.

## Key Features
- AGPL-licensed core on GitHub
- Docker one-liner self-hosting
- Anonymous referral program
- Community forum

## Technical Tasks

### 1. Repository Restructure (2h)
```
ephemera/
├── core/                    # AGPL - Community Edition
│   ├── services/api/        # Core API
│   ├── services/smtp/       # SMTP handler
│   ├── docker-compose.yml   # Self-host stack
│   └── README.md            # Self-hosting guide
├── cloud/                   # Proprietary - Cloud Edition
│   ├── services/billing/    # Stripe/SePay
│   └── features/enterprise/ # SSO, audit logs
└── docs/                    # Public documentation
```

### 2. Feature Flags (1h)
**File**: `core/src/lib/feature-flags.ts`
```typescript
const CLOUD_FEATURES = [
  'sso',
  'audit-logs',
  'priority-support',
  'data-broker-removal'
];

export function isCloudFeature(feature: string): boolean {
  return process.env.EPHEMERA_EDITION === 'cloud'
    && CLOUD_FEATURES.includes(feature);
}
```

### 3. Self-Host Docker Setup (1h)
**File**: `core/docker-compose.yml`
- PostgreSQL + Redis + API + SMTP + Web
- Environment variable configuration
- Volume mounts for persistence
- Health checks

### 4. Anonymous Referral System (1h)
**File**: `services/api/src/services/referral.service.ts`
- Hash-based referral codes (no PII linking)
- Double-blind rewards (both parties get bonus)
- Rewards: +10 aliases or +1 month free
- Dashboard showing referral count (not identities)

### 5. Documentation Site (1h)
- VitePress or Docusaurus
- Self-hosting guide
- API reference (OpenAPI)
- Contributing guidelines

## Enterprise-Only Features
- SSO/SAML authentication
- Audit logging with export
- SLA guarantees (99.9% uptime)
- Priority support queue

## Success Criteria
- [ ] `docker compose up` works < 5 minutes
- [ ] 100+ GitHub stars in 3 months
- [ ] 10+ community contributors
- [ ] Referral system generating signups
