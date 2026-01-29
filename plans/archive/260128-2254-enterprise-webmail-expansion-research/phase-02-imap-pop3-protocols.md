# Phase 02: IMAP/POP3 Protocol Support

## Context Links
- [Plan Overview](plan.md)
- [Technical Requirements](research/researcher-02-technical-requirements.md)
- [Current SMTP Server](../../services/api/src/smtp.ts)

## Overview
- **Priority**: P1 (Critical for Enterprise)
- **Status**: pending
- **Effort**: 8h

Add IMAP4rev1 and POP3 servers enabling Outlook/Thunderbird/mobile client access.

## Key Insights
- Current architecture is HTTP/REST only - major enterprise blocker
- IMAP IDLE (push) required for real-time sync
- WildDuck is production-ready Node.js IMAP server
- Can reuse existing message storage with adapter layer

## Requirements

### Functional
- IMAP4rev1 with IDLE, CONDSTORE, QRESYNC extensions
- POP3 for legacy offline client support
- Folder operations (create, rename, delete, subscribe)
- Message flags (seen, flagged, answered, deleted, draft)
- STARTTLS and implicit TLS (ports 143, 993, 110, 995)

### Non-Functional
- Support 10,000+ concurrent IMAP connections
- IDLE push latency <500ms
- Compatible with major clients (Outlook, Thunderbird, Apple Mail, K-9)

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Email Clients                           │
│  (Outlook, Thunderbird, Apple Mail, K-9 Mail)              │
└──────────────┬─────────────────────┬───────────────────────┘
               │                     │
         Port 993/143          Port 995/110
               │                     │
    ┌──────────▼──────────┐ ┌───────▼────────┐
    │    IMAP Server      │ │   POP3 Server  │
    │  (wildduck/custom)  │ │                │
    └──────────┬──────────┘ └───────┬────────┘
               │                     │
               └──────────┬──────────┘
                          ▼
    ┌─────────────────────────────────────────┐
    │         Message Storage Adapter          │
    │   (bridges to existing Prisma models)    │
    └──────────────────┬──────────────────────┘
                       ▼
    ┌─────────────────────────────────────────┐
    │      PostgreSQL + Disk/S3 Storage       │
    └─────────────────────────────────────────┘
```

## Related Code Files

### Modify
- `services/api/prisma/schema.prisma` - Add Folder, MessageFlag models
- `services/api/src/smtp.ts` - Integrate with new message storage
- `docker-compose.yml` - Add IMAP/POP3 port mappings

### Create
- `services/api/src/imap/server.ts` - IMAP server setup
- `services/api/src/imap/handlers/` - Command handlers
- `services/api/src/pop3/server.ts` - POP3 server setup
- `services/api/src/storage/message-adapter.ts` - Storage abstraction

## Implementation Steps

1. **Evaluate IMAP Libraries**
   - Option A: WildDuck (full server, MongoDB-native)
   - Option B: imapflow + custom server (PostgreSQL-native)
   - Recommend: Build with `imapflow` for PostgreSQL compatibility

2. **Schema Extensions**
   ```prisma
   model Folder {
     id            String    @id @default(cuid())
     inboxId       String
     inbox         Inbox     @relation(fields: [inboxId])
     name          String
     specialUse    String?   // INBOX, Sent, Drafts, Trash, Archive
     uidValidity   Int       @default(autoincrement())
     uidNext       Int       @default(1)
     subscribed    Boolean   @default(true)
     messages      Message[]
   }

   model MessageFlag {
     id        String  @id @default(cuid())
     messageId String
     message   Message @relation(fields: [messageId])
     flag      String  // \Seen, \Flagged, \Answered, \Deleted, \Draft
     @@unique([messageId, flag])
   }
   ```

3. **IMAP Server Implementation**
   - Initialize server with TLS certificates
   - Implement AUTH PLAIN, LOGIN handlers
   - Map commands to Prisma operations:
     - SELECT/EXAMINE → Folder lookup
     - FETCH → Message retrieval with flags
     - STORE → Flag updates
     - COPY/MOVE → Message duplication
     - IDLE → Redis pub/sub for push

4. **POP3 Server Implementation**
   - Simpler protocol: USER, PASS, LIST, RETR, DELE, QUIT
   - Read from INBOX folder only
   - Mark deleted on QUIT commit

5. **Message Storage Adapter**
   - Abstract read/write for both HTTP API and IMAP
   - Handle UID assignment for IMAP
   - Maintain modseq for CONDSTORE

6. **Docker Integration**
   - Expose ports: 143 (IMAP), 993 (IMAPS), 110 (POP3), 995 (POP3S)
   - TLS certificate mounting
   - Health checks for IMAP/POP3 services

## Todo List

- [ ] Evaluate and select IMAP library
- [ ] Design Folder and MessageFlag schema
- [ ] Create database migration
- [ ] Implement IMAP server core
- [ ] Add AUTH handlers with JWT/password
- [ ] Implement FETCH, STORE, COPY commands
- [ ] Add IDLE with Redis pub/sub
- [ ] Implement POP3 server
- [ ] Configure TLS certificates
- [ ] Update Docker Compose
- [ ] Test with Thunderbird, Outlook, Apple Mail
- [ ] Performance test concurrent connections

## Success Criteria

- [ ] Thunderbird can connect via IMAP and sync folders
- [ ] Outlook 365 successfully authenticates and fetches mail
- [ ] Apple Mail on iOS receives push via IDLE
- [ ] POP3 download works for legacy clients
- [ ] 1000 concurrent IMAP connections stable

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| IMAP protocol complexity | High | Use battle-tested library, extensive testing |
| Connection memory overhead | Medium | Connection pooling, idle timeout |
| UID/modseq consistency | High | Atomic transactions, careful locking |
| TLS certificate management | Medium | Let's Encrypt automation, cert-manager |

## Security Considerations

- Require TLS for all connections (disable plaintext in prod)
- Rate limit failed auth attempts per IP
- Implement connection limits per user
- Audit log all IMAP DELETE operations
- Support app-specific passwords for MFA users
