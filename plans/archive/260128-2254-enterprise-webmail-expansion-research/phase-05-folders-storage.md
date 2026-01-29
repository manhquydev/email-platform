# Phase 05: Folders & Storage Hierarchy

## Context Links
- [Plan Overview](plan.md)
- [Phase 02 - IMAP](phase-02-imap-pop3-protocols.md)
- [Current Message Model](../../services/api/prisma/schema.prisma)

## Overview
- **Priority**: P1 (Required for IMAP)
- **Status**: pending
- **Effort**: 4h

Implement persistent folder hierarchy and message organization for enterprise email.

## Key Insights
- Current model is flat (inbox → messages) - no folders
- IMAP requires folder hierarchy with special-use flags
- Must support move/copy between folders
- Archive vs delete distinction critical for compliance

## Requirements

### Functional
- Standard folders: Inbox, Sent, Drafts, Trash, Archive, Spam
- Custom user-created folders with nesting
- Move/copy messages between folders
- Folder subscriptions for IMAP
- Message threading by conversation

### Non-Functional
- Support 100,000+ messages per mailbox
- Folder operations <100ms
- Efficient storage with deduplication

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Mailbox                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Special Folders (auto-created)                       │    │
│  │  ├─ INBOX          (specialUse: \Inbox)             │    │
│  │  ├─ Sent           (specialUse: \Sent)              │    │
│  │  ├─ Drafts         (specialUse: \Drafts)            │    │
│  │  ├─ Trash          (specialUse: \Trash)             │    │
│  │  ├─ Archive        (specialUse: \Archive)           │    │
│  │  └─ Spam           (specialUse: \Junk)              │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Custom Folders (user-created)                        │    │
│  │  ├─ Projects                                        │    │
│  │  │   ├─ Project Alpha                               │    │
│  │  │   └─ Project Beta                                │    │
│  │  └─ Personal                                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Related Code Files

### Modify
- `services/api/prisma/schema.prisma` - Add Folder model, update Message
- `services/api/src/routes/messages.ts` - Add folder operations
- `services/api/src/smtp.ts` - Deliver to INBOX folder

### Create
- `services/api/src/routes/folders.ts` - Folder CRUD endpoints
- `services/api/src/services/folder-service.ts` - Folder business logic
- `services/api/src/services/threading-service.ts` - Conversation threading

## Implementation Steps

1. **Schema Design**
   ```prisma
   model Folder {
     id           String    @id @default(cuid())
     inboxId      String
     inbox        Inbox     @relation(fields: [inboxId])
     parentId     String?   // For nesting
     parent       Folder?   @relation("FolderTree", fields: [parentId])
     children     Folder[]  @relation("FolderTree")
     name         String
     specialUse   String?   // \Inbox, \Sent, \Drafts, \Trash, \Archive, \Junk
     uidValidity  Int       @default(autoincrement())
     uidNext      Int       @default(1)
     subscribed   Boolean   @default(true)
     sortOrder    Int       @default(0)
     createdAt    DateTime  @default(now())
     messages     Message[]

     @@unique([inboxId, parentId, name])
     @@index([inboxId, specialUse])
   }

   model Message {
     // Existing fields...
     folderId     String
     folder       Folder    @relation(fields: [folderId])
     uid          Int       // IMAP UID within folder
     threadId     String?   // Conversation grouping
     flags        MessageFlag[]

     @@index([folderId, uid])
     @@index([threadId])
   }
   ```

2. **Folder Service**
   - Auto-create special folders on inbox creation
   - Validate folder names (no special chars, length limit)
   - Enforce hierarchy depth limit (max 5 levels)
   - Prevent deletion of special folders

3. **Folder CRUD Routes**
   ```
   GET    /inboxes/:inboxId/folders           - List folders
   POST   /inboxes/:inboxId/folders           - Create folder
   PATCH  /inboxes/:inboxId/folders/:id       - Rename/move folder
   DELETE /inboxes/:inboxId/folders/:id       - Delete folder
   POST   /inboxes/:inboxId/folders/:id/subscribe - Toggle subscription
   ```

4. **Message Operations**
   ```
   POST /messages/:id/move    { folderId }    - Move to folder
   POST /messages/:id/copy    { folderId }    - Copy to folder
   POST /messages/:id/archive                 - Move to Archive
   POST /messages/:id/trash                   - Move to Trash
   DELETE /messages/:id                       - Hard delete (from Trash only)
   ```

5. **Threading Service**
   - Extract References and In-Reply-To headers
   - Compute threadId from root message-id
   - Group messages by threadId in UI
   - Maintain thread summary (participants, last activity)

6. **SMTP Inbound Integration**
   - Lookup or create INBOX folder on delivery
   - Assign next UID from folder.uidNext
   - Increment uidNext atomically
   - Compute threadId for threading

7. **Trash/Archive Behavior**
   - Trash: auto-delete after retention period (configurable)
   - Archive: permanent storage, searchable
   - Empty Trash action for manual cleanup

## Todo List

- [ ] Design Folder model with hierarchy support
- [ ] Add folderId, uid, threadId to Message model
- [ ] Create migration with default folders
- [ ] Implement folder service with auto-creation
- [ ] Build folder CRUD routes
- [ ] Implement move/copy message endpoints
- [ ] Add threading service with header extraction
- [ ] Update SMTP inbound to use folders
- [ ] Integrate with IMAP server (Phase 02)
- [ ] Add trash auto-cleanup job
- [ ] Test folder operations with 10k+ messages

## Success Criteria

- [ ] New inbox gets 6 special folders automatically
- [ ] Users can create nested folder structure
- [ ] Messages movable between folders
- [ ] Conversations group correctly by thread
- [ ] IMAP shows correct folder hierarchy
- [ ] Trash auto-empties per retention policy

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Deep nesting performance | Medium | Limit depth, materialized path |
| UID consistency with IMAP | High | Atomic increment, locking |
| Threading mismatches | Low | Fallback to subject-based grouping |
| Folder delete with messages | Medium | Require empty or move to Trash |

## Security Considerations

- Validate folder operations against inbox ownership
- Prevent path traversal in folder names (../)
- Audit log folder deletions
- Rate limit folder creation (anti-abuse)
- Encrypt folder names at rest (optional)
