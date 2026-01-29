# Phase 05: Folders & Storage Hierarchy Tests

## Overview
- **Priority**: P1
- **Effort**: 1h
- **Dependencies**: Phase 02 (IMAP)

## Test Categories

### Folder CRUD Tests

```typescript
// services/api/src/__tests__/integration/folders.test.ts
describe('Folder CRUD', () => {
  describe('POST /inboxes/:id/folders', () => {
    it('creates folder with valid name', async () => {
      const res = await api.post('/inboxes/inbox1/folders')
        .send({ name: 'Projects' })
      expect(res.status).toBe(201)
      expect(res.body.name).toBe('Projects')
    })

    it('creates nested folder', async () => {
      const parent = await createFolder('Projects')
      const res = await api.post('/inboxes/inbox1/folders')
        .send({ name: 'Alpha', parentId: parent.id })
      expect(res.body.parentId).toBe(parent.id)
    })

    it('rejects folder name with special chars', async () => {
      const res = await api.post('/inboxes/inbox1/folders')
        .send({ name: 'My/Folder' })
      expect(res.status).toBe(400)
    })

    it('enforces max nesting depth (5 levels)', async () => {
      // Create 5 nested folders
      let parentId = null
      for (let i = 0; i < 5; i++) {
        const folder = await createFolder(`Level${i}`, parentId)
        parentId = folder.id
      }

      // 6th level should fail
      const res = await api.post('/inboxes/inbox1/folders')
        .send({ name: 'Level5', parentId })
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /inboxes/:id/folders/:folderId', () => {
    it('deletes empty folder', async () => {
      const folder = await createFolder('ToDelete')
      const res = await api.delete(`/inboxes/inbox1/folders/${folder.id}`)
      expect(res.status).toBe(204)
    })

    it('prevents deletion of special folders', async () => {
      const inbox = await getSpecialFolder('INBOX')
      const res = await api.delete(`/inboxes/inbox1/folders/${inbox.id}`)
      expect(res.status).toBe(400)
    })

    it('requires empty folder or moves to Trash', async () => {
      const folder = await createFolderWithMessages('NonEmpty', 5)
      const res = await api.delete(`/inboxes/inbox1/folders/${folder.id}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('not empty')
    })
  })
})
```

### Special Folder Tests

```typescript
// services/api/src/__tests__/integration/special-folders.test.ts
describe('Special Folders', () => {
  it('auto-creates 6 special folders on inbox creation', async () => {
    const inbox = await createInbox('test@example.com')
    const folders = await prisma.folder.findMany({
      where: { inboxId: inbox.id, specialUse: { not: null } }
    })

    const specialUses = folders.map(f => f.specialUse)
    expect(specialUses).toContain('\\Inbox')
    expect(specialUses).toContain('\\Sent')
    expect(specialUses).toContain('\\Drafts')
    expect(specialUses).toContain('\\Trash')
    expect(specialUses).toContain('\\Archive')
    expect(specialUses).toContain('\\Junk')
  })

  it('IMAP LIST returns special-use flags', async () => {
    const client = await connectIMAP('test@example.com')
    const folders = await client.list()

    const inbox = folders.find(f => f.name === 'INBOX')
    expect(inbox.specialUse).toBe('\\Inbox')
  })
})
```

### Message Move/Copy Tests

```typescript
// services/api/src/__tests__/integration/message-operations.test.ts
describe('Message Operations', () => {
  describe('POST /messages/:id/move', () => {
    it('moves message to target folder', async () => {
      const message = await createMessage('INBOX')
      const archive = await getSpecialFolder('Archive')

      const res = await api.post(`/messages/${message.id}/move`)
        .send({ folderId: archive.id })
      expect(res.status).toBe(200)

      const updated = await prisma.message.findUnique({
        where: { id: message.id }
      })
      expect(updated.folderId).toBe(archive.id)
    })

    it('updates UID in target folder', async () => {
      const message = await createMessage('INBOX')
      const archive = await getSpecialFolder('Archive')
      const prevUidNext = archive.uidNext

      await api.post(`/messages/${message.id}/move`)
        .send({ folderId: archive.id })

      const updated = await prisma.message.findUnique({
        where: { id: message.id }
      })
      expect(updated.uid).toBe(prevUidNext)
    })
  })

  describe('POST /messages/:id/copy', () => {
    it('copies message to target folder', async () => {
      const message = await createMessage('INBOX')
      const archive = await getSpecialFolder('Archive')

      await api.post(`/messages/${message.id}/copy`)
        .send({ folderId: archive.id })

      // Original still exists
      const original = await prisma.message.findUnique({
        where: { id: message.id }
      })
      expect(original.folderId).not.toBe(archive.id)

      // Copy exists in Archive
      const copy = await prisma.message.findFirst({
        where: { folderId: archive.id, subject: message.subject }
      })
      expect(copy).toBeDefined()
    })
  })

  describe('POST /messages/:id/trash', () => {
    it('moves message to Trash folder', async () => {
      const message = await createMessage('INBOX')
      await api.post(`/messages/${message.id}/trash`)

      const trash = await getSpecialFolder('Trash')
      const updated = await prisma.message.findUnique({
        where: { id: message.id }
      })
      expect(updated.folderId).toBe(trash.id)
    })
  })

  describe('DELETE /messages/:id', () => {
    it('hard deletes from Trash only', async () => {
      const trash = await getSpecialFolder('Trash')
      const message = await createMessage(trash.id)

      await api.delete(`/messages/${message.id}`)

      const deleted = await prisma.message.findUnique({
        where: { id: message.id }
      })
      expect(deleted).toBeNull()
    })

    it('rejects delete from non-Trash folder', async () => {
      const message = await createMessage('INBOX')
      const res = await api.delete(`/messages/${message.id}`)
      expect(res.status).toBe(400)
    })
  })
})
```

### Threading Tests

```typescript
// services/api/src/__tests__/integration/threading.test.ts
describe('Message Threading', () => {
  it('groups messages by References header', async () => {
    const original = await createMessage('INBOX', {
      messageId: '<original@example.com>',
      subject: 'Thread Test'
    })

    const reply = await createMessage('INBOX', {
      subject: 'Re: Thread Test',
      references: '<original@example.com>'
    })

    expect(reply.threadId).toBe(original.threadId)
  })

  it('groups messages by In-Reply-To header', async () => {
    const original = await createMessage('INBOX', {
      messageId: '<original@example.com>'
    })

    const reply = await createMessage('INBOX', {
      inReplyTo: '<original@example.com>'
    })

    expect(reply.threadId).toBe(original.threadId)
  })

  it('returns thread summary with participants', async () => {
    const threadId = 'thread123'
    await createMessage('INBOX', { threadId, from: 'alice@example.com' })
    await createMessage('INBOX', { threadId, from: 'bob@example.com' })

    const res = await api.get(`/threads/${threadId}`)
    expect(res.body.participants).toContain('alice@example.com')
    expect(res.body.participants).toContain('bob@example.com')
    expect(res.body.messageCount).toBe(2)
  })
})
```

### Retention Policy Tests

```typescript
// services/api/src/__tests__/integration/retention.test.ts
describe('Retention Policies', () => {
  it('auto-deletes Trash messages after retention period', async () => {
    // Create old message in Trash
    const trash = await getSpecialFolder('Trash')
    await prisma.message.create({
      data: {
        folderId: trash.id,
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
        subject: 'Old Trash'
      }
    })

    // Run retention job
    await runRetentionJob()

    const messages = await prisma.message.findMany({
      where: { folderId: trash.id }
    })
    expect(messages.length).toBe(0)
  })

  it('respects legal hold on messages', async () => {
    await createLegalHold({ custodians: ['user1'] })
    const message = await createMessage('Trash', { userId: 'user1' })

    // Run retention job
    await runRetentionJob()

    // Message should not be deleted
    const exists = await prisma.message.findUnique({
      where: { id: message.id }
    })
    expect(exists).toBeDefined()
  })
})
```

## Docker Commands

```bash
# Run folder tests
docker compose -f docker-compose.test.yml exec test-api \
  npm test -- --grep "Folder|Threading|Retention"

# Test via IMAP client
docker compose -f docker-compose.test.yml exec test-api \
  node scripts/imap-folder-test.js

# Load test with many messages
docker compose -f docker-compose.test.yml exec test-api \
  npm run seed:messages -- --count 10000 --inbox inbox1
```

## Success Criteria

- [ ] New inbox gets 6 special folders automatically
- [ ] Users can create nested folder structure (max 5 levels)
- [ ] Messages movable between folders
- [ ] Conversations group correctly by thread
- [ ] IMAP shows correct folder hierarchy with special-use flags
- [ ] Trash auto-empties per retention policy
- [ ] Legal hold prevents retention deletion
