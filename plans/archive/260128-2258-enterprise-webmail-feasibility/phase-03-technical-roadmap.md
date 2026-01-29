# Phase 3: Technical Roadmap

## Architecture Evolution Overview

```
Current Ephemera          →    Enterprise Ephemera
─────────────────              ─────────────────────
[SMTP Ingest]                  [SMTP Ingest] + [SMTP Submission]
      ↓                              ↓              ↓
[Fastify API]                  [Fastify API] + [IMAP Server]
      ↓                              ↓              ↓
[PostgreSQL]                   [PostgreSQL] + [Object Storage]
      ↓                              ↓
[React UI]                     [React UI] + [CalDAV/CardDAV]
                                     ↓
                               [LDAP/SSO Integration]
```

## Phase A: Multi-Tenant Foundation (Months 1-6)

### Objectives
- Harden data isolation between organizations
- Implement folder/label hierarchy
- Add encryption at rest
- Enable authenticated outbound (SMTP submission)

### Key Deliverables

| Deliverable | Effort | Description |
|-------------|--------|-------------|
| Org-level data isolation | 3 weeks | Row-level security, tenant context |
| Folder hierarchy | 4 weeks | Nested folders, IMAP-compatible structure |
| Encryption at rest | 2 weeks | AES-256 for message bodies |
| SMTP submission | 6 weeks | Port 587, auth'd outbound, DKIM signing |
| Storage quotas | 2 weeks | Hard/soft limits per user/org |

### Technical Decisions

**Build**: Folder hierarchy (tight Prisma integration)
**Build**: Encryption layer (control over key management)
**Build**: SMTP submission (extend existing smtp-server)

### Exit Criteria
- [ ] Create org with isolated data namespace
- [ ] Create nested folder structure
- [ ] Send email via SMTP submission with DKIM
- [ ] Verify encryption at rest working

## Phase B: Protocol Layer (Months 7-12)

### Objectives
- Implement IMAP4rev1 server
- Add basic POP3 support
- Ensure compatibility with Thunderbird, Apple Mail, Outlook

### Key Deliverables

| Deliverable | Effort | Description |
|-------------|--------|-------------|
| IMAP server core | 10 weeks | LOGIN, SELECT, FETCH, STORE, SEARCH |
| IMAP IDLE | 2 weeks | Push notifications to clients |
| IMAP folder sync | 3 weeks | CREATE, DELETE, RENAME, SUBSCRIBE |
| POP3 server | 3 weeks | Basic download/delete support |
| Client testing | 4 weeks | Thunderbird, Apple Mail, Outlook |

### Technical Decisions

**Critical Decision: Build vs Integrate IMAP**

| Option | Pros | Cons |
|--------|------|------|
| Build (Node.js) | Full control, single stack | 6+ months, high risk |
| Integrate Dovecot | Proven, fast | Extra infra, sync complexity |
| Fork wildduck | Node.js native, IMAP exists | Unmaintained, tech debt |

**Recommendation**: Start with custom build using `imap-server` npm package. Fallback to Dovecot integration if blocked after Month 9.

### Exit Criteria
- [ ] Thunderbird connects and syncs folders
- [ ] Apple Mail works with push (IDLE)
- [ ] Outlook 365 connects successfully
- [ ] 10,000 message mailbox performs <2s sync

## Phase C: Enterprise Auth (Months 13-16)

### Objectives
- LDAP/Active Directory integration
- SAML 2.0 and OIDC SSO
- SCIM automated provisioning

### Key Deliverables

| Deliverable | Effort | Description |
|-------------|--------|-------------|
| LDAP bind auth | 3 weeks | Auth against AD/OpenLDAP |
| LDAP user sync | 3 weeks | Import users, groups from directory |
| SAML 2.0 SP | 3 weeks | Okta, Azure AD, OneLogin |
| OIDC support | 2 weeks | Google, Auth0, Keycloak |
| SCIM provisioning | 3 weeks | Auto create/disable users |

### Technical Decisions

**Use existing libraries:**
- `passport-saml` for SAML
- `openid-client` for OIDC
- `ldapjs` for LDAP

### Exit Criteria
- [ ] Login via Azure AD SAML works
- [ ] Users sync from OpenLDAP hourly
- [ ] SCIM creates user when added in Okta

## Phase D: Productivity Suite (Months 17-20)

### Objectives
- CalDAV calendar server
- CardDAV contacts/address book
- Mobile sync (iOS, Android native apps)

### Key Deliverables

| Deliverable | Effort | Description |
|-------------|--------|-------------|
| CalDAV server | 6 weeks | Events, recurring, reminders |
| Calendar sharing | 2 weeks | Share calendars between users |
| CardDAV server | 4 weeks | Contacts, groups, photos |
| Global Address List | 2 weeks | Org-wide contact directory |
| Mobile PWA | 4 weeks | Background sync, notifications |

### Technical Decisions

**Critical Decision: Build vs Fork**

| Option | Pros | Cons |
|--------|------|------|
| Build custom | Full control, unified DB | 4+ months, CalDAV is complex |
| Fork Radicale | Python, proven | Different stack, sync issues |
| Integrate Baikal | PHP, simple | Another runtime, maintenance |

**Recommendation**: Fork and adapt Radicale (Python). Run as sidecar, sync with main DB via background jobs. Accept the multi-language stack tradeoff.

### Exit Criteria
- [ ] iOS Calendar syncs events via CalDAV
- [ ] Android Contacts syncs via CardDAV
- [ ] Create meeting invite, attendees receive email

## Phase E: Compliance Features (Months 21-24)

### Objectives
- Immutable audit logging
- Legal hold capability
- Basic eDiscovery search
- DLP for outbound

### Key Deliverables

| Deliverable | Effort | Description |
|-------------|--------|-------------|
| Audit log service | 3 weeks | Immutable, append-only logs |
| Legal hold | 2 weeks | Prevent deletion for flagged users |
| eDiscovery search | 4 weeks | Cross-mailbox search for compliance |
| DLP rules | 3 weeks | Block sensitive data in outbound |
| Retention policies | 2 weeks | Auto-archive/delete by age |

### Exit Criteria
- [ ] Compliance officer can search all mailboxes
- [ ] Legal hold prevents message deletion
- [ ] Audit log exports to SIEM (JSON/Syslog)

## Timeline Summary

| Phase | Months | Key Milestone |
|-------|--------|---------------|
| A: Foundation | 1-6 | SMTP submission working |
| B: Protocols | 7-12 | IMAP client compatibility |
| C: Enterprise Auth | 13-16 | SSO login working |
| D: Productivity | 17-20 | Calendar/Contacts sync |
| E: Compliance | 21-24 | Audit + Legal hold |

## Risk Mitigation

1. **IMAP complexity**: Build minimal viable first, expand flags/features iteratively
2. **CalDAV edge cases**: Extensive testing with iOS (strictest client)
3. **Scope creep**: Freeze scope per phase, defer to "Phase F" backlog
4. **Burnout**: Plan for 70% capacity, buffer for bugs/support
