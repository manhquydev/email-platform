# Phase 04: Pilot Partner Onboarding

## Context Links
- [Plan Overview](./plan.md)
- [Integration Strategy](./research/researcher-01-integration-strategy.md)
- API Docs: To be created in this phase
- WHMCS Module: `plugins/whmcs/` (existing)

## Overview
| Field | Value |
|-------|-------|
| Priority | P1 - Critical |
| Status | Pending |
| Effort | 3 days |
| Owner | TBD |

Create partner onboarding documentation, test with 2-3 pilot hosting providers, and iterate based on feedback. This phase validates the entire integration before public launch.

## Key Insights
- Hosting providers need: API docs, WHMCS module, support contact
- Competitor analysis: Mailcow offers 6-month free trial for early adopters
- White-label kit is #1 requested feature for resellers
- Need Tier-1 support boundary defined contractually

## Requirements

### Functional
- FR1: Complete API documentation (OpenAPI/Swagger)
- FR2: WHMCS module installation guide
- FR3: Partner onboarding checklist
- FR4: Support escalation process documented

### Non-Functional
- NFR1: Documentation in English (primary) + Vietnamese (optional)
- NFR2: API docs auto-generated from code
- NFR3: Onboarding < 2 hours for technical partner

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Partner Portal (Future)                   │
│         (Self-service dashboard for partners)                │
└─────────────────────────────────────────────────────────────┘
                              ↑
                    Phase C (Scale)

┌─────────────────────────────────────────────────────────────┐
│                  Current: Manual Onboarding                  │
│  1. Admin creates provider via UI                            │
│  2. Share API key securely                                   │
│  3. Partner installs WHMCS module                            │
│  4. Partner configures and tests                             │
└─────────────────────────────────────────────────────────────┘
```

## Deliverables

### Documentation to CREATE
| File | Purpose |
|------|---------|
| `docs/provider-api/README.md` | API overview for partners |
| `docs/provider-api/authentication.md` | API key usage |
| `docs/provider-api/endpoints.md` | Full endpoint reference |
| `docs/provider-api/webhooks.md` | Webhook events guide |
| `docs/provider-api/whmcs-module.md` | WHMCS installation |
| `docs/provider-api/troubleshooting.md` | Common issues |
| `docs/internal/partner-onboarding-checklist.md` | Internal process |

### OpenAPI Spec
| File | Purpose |
|------|---------|
| `services/api/openapi/provider-api.yaml` | OpenAPI 3.0 spec |

## Implementation Steps

### Day 1: API Documentation

1. **Create API documentation structure**
```
docs/provider-api/
├── README.md           # Overview, quick start
├── authentication.md   # X-Provider-Key header
├── endpoints/
│   ├── tenants.md      # Tenant CRUD
│   ├── domains.md      # Domain management
│   ├── mailboxes.md    # Mailbox CRUD
│   ├── sso.md          # SSO token generation
│   └── usage.md        # Usage metrics
├── webhooks.md         # Event types, verification
├── whmcs-module.md     # Installation guide
└── troubleshooting.md  # FAQ, common errors
```

2. **Write README.md (Quick Start)**
```markdown
# Ephemera Provider API

## Overview
Integrate Ephemera email services into your hosting platform.

## Quick Start
1. Contact us to register as a provider
2. Receive your API key (shown once)
3. Install WHMCS module or call API directly
4. Create tenants for your customers

## Base URL
- Production: `https://api.ephemera.email/v1/provider`
- Sandbox: `https://sandbox-api.ephemera.email/v1/provider`

## Authentication
All requests require `X-Provider-Key` header:
\`\`\`bash
curl -H "X-Provider-Key: ep_live_abc123..." \
  https://api.ephemera.email/v1/provider/me
\`\`\`

## Rate Limits
- 100 requests/minute per provider
- 1000 requests/hour per provider
```

3. **Generate OpenAPI spec from routes**
```yaml
# services/api/openapi/provider-api.yaml
openapi: 3.0.3
info:
  title: Ephemera Provider API
  version: 1.0.0
  description: API for hosting providers to manage email services

servers:
  - url: https://api.ephemera.email/v1/provider
    description: Production

security:
  - ApiKeyAuth: []

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-Provider-Key

paths:
  /me:
    get:
      summary: Get current provider info
      responses:
        '200':
          description: Provider details

  /tenants:
    post:
      summary: Create tenant
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTenant'
    # ... more endpoints
```

### Day 2: WHMCS Module Documentation

4. **Write WHMCS installation guide**
```markdown
# WHMCS Module Installation

## Requirements
- WHMCS 8.0+
- PHP 7.4+
- cURL extension enabled

## Installation

### Step 1: Upload Module
Upload `modules/servers/ephemera/` to your WHMCS installation:
\`\`\`
/path/to/whmcs/modules/servers/ephemera/
├── ephemera.php
├── lib/
│   └── EphemeraApi.php
└── templates/
    └── clientarea.tpl
\`\`\`

### Step 2: Configure Server
1. Go to **Setup > Products/Services > Servers**
2. Add new server:
   - Name: Ephemera Email
   - Hostname: api.ephemera.email
   - API Key: Your provider API key

### Step 3: Create Product
1. Go to **Setup > Products/Services > Products/Services**
2. Create product with Module: Ephemera
3. Configure package settings (plan, limits)

## Client Area Features
- Login to Webmail (SSO)
- View mailbox list
- Usage statistics
```

5. **Create troubleshooting guide**
```markdown
# Troubleshooting

## Common Errors

### 401 Unauthorized
- Check API key is correct
- Verify X-Provider-Key header format
- Ensure provider status is ACTIVE

### 429 Too Many Requests
- Rate limit exceeded
- Wait 60 seconds and retry
- Consider caching responses

### Domain Verification Failed
- DNS propagation takes up to 48 hours
- Verify TXT record: `_ephemera.yourdomain.com`
- Use `dig TXT _ephemera.yourdomain.com` to check

## Support
- Technical: api-support@ephemera.email
- Integration help: partners@ephemera.email
```

### Day 3: Partner Onboarding Process

6. **Create internal onboarding checklist**
```markdown
# Partner Onboarding Checklist (Internal)

## Pre-Onboarding
- [ ] Verify partner company details
- [ ] Determine tier (STARTER/GROWTH/ENTERPRISE)
- [ ] NDA signed (if required)
- [ ] Billing terms agreed

## Technical Setup
- [ ] Create provider via Admin UI
- [ ] Share API key securely (1Password/encrypted email)
- [ ] Provide sandbox access
- [ ] Schedule integration call (30 min)

## Integration Support
- [ ] Partner installs WHMCS module
- [ ] Test tenant creation
- [ ] Test domain verification
- [ ] Test mailbox creation
- [ ] Test SSO login
- [ ] Verify webhook delivery

## Go-Live
- [ ] Partner confirms testing complete
- [ ] Switch to production API key
- [ ] Monitor first 10 tenants
- [ ] Weekly check-in for first month

## Partner Details Template
| Field | Value |
|-------|-------|
| Company | |
| Contact | |
| Email | |
| Tier | |
| Provider ID | |
| Onboarded | |
| Notes | |
```

7. **Reach out to pilot partners**
- Identify 2-3 mid-sized hosting providers using cPanel
- Offer: 6 months free, priority support
- Goal: Real-world feedback before public launch

## Todo List
- [ ] Create docs/provider-api/ directory structure
- [ ] Write README.md quick start guide
- [ ] Write authentication.md
- [ ] Write endpoints documentation (5 files)
- [ ] Write webhooks.md
- [ ] Write whmcs-module.md installation guide
- [ ] Write troubleshooting.md
- [ ] Generate OpenAPI spec
- [ ] Create internal onboarding checklist
- [ ] Identify 2-3 pilot partners
- [ ] Send outreach emails to pilots
- [ ] Schedule onboarding calls
- [ ] Document feedback from each partner

## Success Criteria
- [ ] Complete API documentation published
- [ ] OpenAPI spec generated and validated
- [ ] 2-3 pilot partners onboarded
- [ ] Each pilot successfully creates tenants
- [ ] Feedback collected and issues logged
- [ ] < 2 hours onboarding time achieved

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| No pilot interest | High | Offer incentives (free tier) |
| Integration issues | Medium | Dedicated support during pilot |
| Documentation gaps | Medium | Iterate based on questions |
| Support overload | Medium | Define Tier-1 boundary |

## Security Considerations
- API keys shared via secure channel only
- Sandbox environment for testing
- Production keys only after successful sandbox test
- Audit log of partner onboarding

## Pilot Partner Evaluation Criteria
1. **Technical Capability**: Has technical staff for integration
2. **Size**: 100-1000 hosting customers (manageable scale)
3. **Platform**: Uses cPanel + WHMCS
4. **Responsiveness**: Willing to provide feedback
5. **Geography**: Diverse locations for timezone coverage

## Feedback Collection Template
```markdown
## Partner: [Name]
## Date: [Date]

### Integration Experience
- Time to complete:
- Blockers encountered:
- Documentation gaps:

### Feature Requests
1.
2.

### Issues Found
1.
2.

### Overall Rating (1-5):
### Would Recommend (Y/N):
```

## Next Steps
After pilot phase:
1. Compile feedback into improvement backlog
2. Fix critical issues identified
3. Update documentation based on questions
4. Plan Phase C: Scale (Partner Portal, Marketplace listing)
