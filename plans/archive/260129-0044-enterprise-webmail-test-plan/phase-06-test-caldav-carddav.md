# Phase 06: CalDAV/CardDAV Tests

## Overview
- **Priority**: P2
- **Effort**: 1.5h
- **Dependencies**: WebDAV server

## Test Categories

### CalDAV Protocol Tests

```typescript
// services/api/src/__tests__/integration/caldav.test.ts
import { DAVClient } from 'tsdav'

describe('CalDAV Protocol', () => {
  let client: DAVClient

  beforeAll(async () => {
    client = new DAVClient({
      serverUrl: 'http://localhost:3001',
      credentials: {
        username: 'test@example.com',
        password: 'password'
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav'
    })
    await client.login()
  })

  describe('Calendar Discovery', () => {
    it('returns calendar home from .well-known/caldav', async () => {
      const res = await fetch('http://localhost:3001/.well-known/caldav', {
        redirect: 'manual'
      })
      expect(res.status).toBe(301)
      expect(res.headers.get('location')).toContain('/calendars/')
    })

    it('lists user calendars via PROPFIND', async () => {
      const calendars = await client.fetchCalendars()
      expect(calendars.length).toBeGreaterThan(0)
      expect(calendars[0].displayName).toBeDefined()
    })
  })

  describe('Event Operations', () => {
    it('creates event with PUT', async () => {
      const event = {
        summary: 'Test Meeting',
        start: new Date('2026-02-01T10:00:00Z'),
        end: new Date('2026-02-01T11:00:00Z')
      }

      const result = await client.createCalendarObject({
        calendar: calendars[0],
        filename: 'test-event.ics',
        iCalString: generateICS(event)
      })
      expect(result.ok).toBe(true)
    })

    it('retrieves events with calendar-query REPORT', async () => {
      const events = await client.fetchCalendarObjects({
        calendar: calendars[0],
        timeRange: {
          start: '2026-02-01',
          end: '2026-02-28'
        }
      })
      expect(events.length).toBeGreaterThan(0)
    })

    it('updates event with PUT', async () => {
      const updated = await client.updateCalendarObject({
        calendarObject: existingEvent,
        iCalString: generateICS({ ...event, summary: 'Updated Meeting' })
      })
      expect(updated.ok).toBe(true)
    })

    it('deletes event with DELETE', async () => {
      await client.deleteCalendarObject({ calendarObject: event })
      const events = await client.fetchCalendarObjects({ calendar: calendars[0] })
      expect(events.find(e => e.url === event.url)).toBeUndefined()
    })
  })

  describe('Sync Token', () => {
    it('returns ctag for change detection', async () => {
      const calendar = await client.fetchCalendars()
      expect(calendar[0].ctag).toBeDefined()
    })

    it('returns only changed events with sync-token', async () => {
      const initial = await client.syncCalendar({ calendar: calendars[0] })

      // Create new event
      await createEvent()

      const delta = await client.syncCalendar({
        calendar: calendars[0],
        syncToken: initial.syncToken
      })
      expect(delta.objects.length).toBe(1)
    })
  })
})
```

### CardDAV Protocol Tests

```typescript
// services/api/src/__tests__/integration/carddav.test.ts
describe('CardDAV Protocol', () => {
  describe('Addressbook Discovery', () => {
    it('returns addressbook home from .well-known/carddav', async () => {
      const res = await fetch('http://localhost:3001/.well-known/carddav', {
        redirect: 'manual'
      })
      expect(res.status).toBe(301)
      expect(res.headers.get('location')).toContain('/contacts/')
    })

    it('lists addressbooks via PROPFIND', async () => {
      const addressbooks = await client.fetchAddressBooks()
      expect(addressbooks.length).toBeGreaterThan(0)
    })
  })

  describe('Contact Operations', () => {
    it('creates contact with PUT', async () => {
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
EMAIL:john@example.com
TEL:+1234567890
END:VCARD`

      const result = await client.createVCard({
        addressBook: addressbooks[0],
        filename: 'john.vcf',
        vCardString: vcard
      })
      expect(result.ok).toBe(true)
    })

    it('retrieves contacts with addressbook-query', async () => {
      const contacts = await client.fetchVCards({
        addressBook: addressbooks[0]
      })
      expect(contacts.length).toBeGreaterThan(0)
    })

    it('searches contacts by email', async () => {
      const contacts = await client.fetchVCards({
        addressBook: addressbooks[0],
        filters: [{ type: 'email', match: 'john@example.com' }]
      })
      expect(contacts.length).toBe(1)
    })
  })
})
```

### Global Address List Tests

```typescript
// services/api/src/__tests__/integration/gal.test.ts
describe('Global Address List', () => {
  it('auto-populates from org members', async () => {
    await prisma.user.create({
      data: { email: 'employee@org1.com', organizationId: 'org1' }
    })

    await galService.syncOrganization('org1')

    const galContacts = await prisma.contact.findMany({
      where: { organizationId: 'org1', isGal: true }
    })
    expect(galContacts.map(c => c.email)).toContain('employee@org1.com')
  })

  it('exposes GAL as read-only CardDAV collection', async () => {
    const addressbooks = await client.fetchAddressBooks()
    const gal = addressbooks.find(ab => ab.displayName === 'Global Address List')

    expect(gal).toBeDefined()

    // Try to create - should fail
    await expect(client.createVCard({
      addressBook: gal,
      vCardString: 'BEGIN:VCARD...'
    })).rejects.toThrow(/read-only/)
  })

  it('searches GAL via REST API', async () => {
    const res = await api.get('/contacts/gal?q=john')
    expect(res.body.contacts.length).toBeGreaterThan(0)
  })
})
```

### Client Compatibility Tests

```typescript
// services/api/src/__tests__/e2e/calendar-clients.test.ts
describe('Calendar Client Compatibility', () => {
  describe('Apple Calendar', () => {
    it('discovers calendars via .well-known')
    it('syncs events bidirectionally')
    it('handles all-day events correctly')
    it('supports recurring events')
  })

  describe('Thunderbird Lightning', () => {
    it('connects via CalDAV URL')
    it('syncs with ctag change detection')
    it('handles timezone conversions')
  })

  describe('DAVx5 (Android)', () => {
    it('discovers via .well-known')
    it('syncs contacts and calendars')
  })
})
```

### iMIP Meeting Invite Tests

```typescript
// services/api/src/__tests__/integration/imip.test.ts
describe('iMIP Meeting Invites', () => {
  it('parses VCALENDAR from inbound email', async () => {
    const email = await receiveEmailWithICS({
      method: 'REQUEST',
      summary: 'Team Standup',
      organizer: 'boss@example.com',
      attendees: ['user@example.com']
    })

    // Event should be created in user's calendar
    const events = await prisma.event.findMany({
      where: { calendar: { userId: 'user1' } }
    })
    expect(events.find(e => e.summary === 'Team Standup')).toBeDefined()
  })

  it('updates event from REPLY', async () => {
    const event = await createEvent({ attendees: ['guest@example.com'] })

    await receiveEmailWithICS({
      method: 'REPLY',
      uid: event.uid,
      partstat: 'ACCEPTED'
    })

    const updated = await prisma.event.findUnique({ where: { id: event.id } })
    expect(updated.attendees).toContainEqual({
      email: 'guest@example.com',
      status: 'ACCEPTED'
    })
  })

  it('cancels event from CANCEL', async () => {
    const event = await createEvent()

    await receiveEmailWithICS({
      method: 'CANCEL',
      uid: event.uid
    })

    const deleted = await prisma.event.findUnique({ where: { id: event.id } })
    expect(deleted).toBeNull()
  })
})
```

## Docker Commands

```bash
# Run CalDAV/CardDAV tests
docker compose -f docker-compose.test.yml exec test-api \
  npm test -- --grep "CalDAV|CardDAV|GAL|iMIP"

# Test with curl (WebDAV PROPFIND)
curl -X PROPFIND http://localhost:3001/calendars/user1/ \
  -H "Content-Type: application/xml" \
  -H "Depth: 1" \
  -u test@example.com:password \
  -d '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:displayname/></d:prop></d:propfind>'

# Test with DAVx5 validator
docker run --rm --network host \
  bitfireorg/davx5-validator \
  http://localhost:3001/.well-known/caldav
```

## Success Criteria

- [ ] Apple Calendar syncs events via CalDAV
- [ ] Contacts.app syncs contacts via CardDAV
- [ ] Thunderbird Lightning connects successfully
- [ ] GAL appears as read-only addressbook
- [ ] Meeting invites create/update events
- [ ] Sync tokens work for incremental sync
