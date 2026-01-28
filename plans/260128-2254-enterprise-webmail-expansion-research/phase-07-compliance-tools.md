# Phase 07: Compliance Tools

## Context Links
- [Plan Overview](plan.md)
- [Technical Requirements](research/researcher-02-technical-requirements.md)
- [Current Audit Routes](../../services/api/src/routes/admin/audit.ts)

## Overview
- **Priority**: P2 (Enterprise requirement)
- **Status**: pending
- **Effort**: 5h

Implement audit logging, legal hold, eDiscovery, DLP, and retention policies.

## Key Insights
- GDPR/HIPAA compliance required for enterprise sales
- Current audit logging is basic - needs immutability
- Legal hold prevents deletion during litigation
- DLP scans outbound for sensitive data

## Requirements

### Functional
- Immutable audit logs with tamper detection
- Legal hold: prevent deletion of held data
- eDiscovery: cross-mailbox search for compliance
- DLP: outbound content scanning for PII/secrets
- Retention policies: auto-archive/delete by age
- Data export for GDPR subject access requests

### Non-Functional
- Audit logs queryable for 7 years
- Legal hold applies within 60 seconds
- eDiscovery search <30s for 1M messages
- DLP scan adds <500ms to send

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Compliance Dashboard                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │Audit Logs │  │Legal Hold │  │eDiscovery │  │   DLP    │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────┬─────┘ │
└────────┼──────────────┼──────────────┼─────────────┼───────┘
         │              │              │             │
         ▼              ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Compliance Engine                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Audit Logger (append-only with hash chain)          │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Hold Manager (block delete, flag held items)        │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Search Indexer (Elasticsearch/PostgreSQL FTS)       │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ DLP Scanner (regex patterns, ML classifier)         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Related Code Files

### Modify
- `services/api/prisma/schema.prisma` - Add compliance models
- `services/api/src/routes/admin/audit.ts` - Enhance audit API
- `services/api/src/routes/messages.ts` - Add hold checks

### Create
- `services/api/src/compliance/audit-logger.ts` - Immutable logging
- `services/api/src/compliance/legal-hold.ts` - Hold management
- `services/api/src/compliance/ediscovery.ts` - Cross-mailbox search
- `services/api/src/compliance/dlp-scanner.ts` - Content scanning
- `services/api/src/compliance/retention.ts` - Policy enforcement
- `services/api/src/routes/admin/compliance.ts` - Compliance endpoints

## Implementation Steps

1. **Schema Design**
   ```prisma
   model AuditLog {
     id            String   @id @default(cuid())
     organizationId String
     organization  Organization @relation(fields: [organizationId])
     timestamp     DateTime @default(now())
     actorId       String?
     actorEmail    String
     action        String   // login, read, delete, export, etc.
     resource      String   // message, user, domain
     resourceId    String?
     metadata      Json?
     ipAddress     String?
     userAgent     String?
     prevHash      String?  // Chain to previous log
     hash          String   // SHA-256 of content

     @@index([organizationId, timestamp])
     @@index([actorId])
     @@index([resource, resourceId])
   }

   model LegalHold {
     id            String   @id @default(cuid())
     organizationId String
     organization  Organization @relation(fields: [organizationId])
     name          String
     description   String?
     custodians    String[] // User IDs under hold
     keywords      String[] // Search terms
     startDate     DateTime?
     endDate       DateTime?
     createdBy     String
     createdAt     DateTime @default(now())
     releasedAt    DateTime?
     status        String   // active, released
   }

   model RetentionPolicy {
     id            String   @id @default(cuid())
     organizationId String
     organization  Organization @relation(fields: [organizationId])
     name          String
     foldersMatch  String[] // Folder types to apply
     retainDays    Int      // Days before action
     action        String   // archive, delete
     enabled       Boolean  @default(true)
   }
   ```

2. **Immutable Audit Logger**
   - Append-only log with hash chain
   - Each entry: `hash = SHA256(prevHash + content)`
   - Verify chain integrity on query
   - Archive to cold storage after 1 year

3. **Legal Hold Manager**
   - Create hold with custodians and keywords
   - Block DELETE on held messages/attachments
   - Mark held items with holdId
   - Preserve even if user deleted before hold
   - Release hold to allow normal lifecycle

4. **eDiscovery Search**
   - Cross-mailbox search for compliance officers
   - Full-text search on body, subject, headers
   - Filter by date range, sender, recipient
   - Export results as PST/MBOX/EML
   - Requires Compliance Officer role

5. **DLP Scanner**
   - Pattern library:
     - SSN: `\d{3}-\d{2}-\d{4}`
     - Credit Card: Luhn-validated 16 digits
     - API Keys: common formats
   - Scan outbound before send
   - Actions: warn, block, quarantine
   - Admin configures policies per org

6. **Retention Policies**
   - Define per folder type (Trash, Sent, etc.)
   - Actions: archive (move), delete (hard)
   - Cron job: daily sweep
   - Respect legal hold (skip held items)

7. **GDPR Data Export**
   - Endpoint: `POST /compliance/export/:userId`
   - Package all user data as ZIP
   - Include: messages, contacts, calendar, logs
   - Audit log the export action

## Todo List

- [ ] Add AuditLog, LegalHold, RetentionPolicy models
- [ ] Implement hash-chain audit logger
- [ ] Build legal hold CRUD and enforcement
- [ ] Create eDiscovery search with export
- [ ] Implement DLP pattern scanner
- [ ] Add retention policy engine
- [ ] Build GDPR data export endpoint
- [ ] Create compliance admin dashboard
- [ ] Add Compliance Officer role
- [ ] Test audit log integrity verification
- [ ] Performance test search on 1M messages

## Success Criteria

- [ ] All user actions logged with hash chain
- [ ] Legal hold blocks message deletion
- [ ] eDiscovery finds messages across org
- [ ] DLP blocks email with credit card number
- [ ] Retention policy auto-deletes old trash
- [ ] GDPR export produces complete user data

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Audit log tampering | Critical | Hash chain, separate storage |
| Legal hold bypass | Critical | Database-level constraints |
| DLP false positives | Medium | Review queue, whitelist |
| Retention deletes held data | High | Check hold before delete |

## Security Considerations

- Audit logs in separate schema/database
- Compliance Officer role with least privilege
- Encrypt export files with recipient key
- Rate limit export requests
- DLP patterns are admin-only
- Audit access to audit logs (meta-audit)
