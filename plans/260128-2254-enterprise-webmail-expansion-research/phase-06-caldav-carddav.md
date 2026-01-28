# Phase 06: CalDAV/CardDAV Productivity

## Context Links
- [Plan Overview](plan.md)
- [Technical Requirements](research/researcher-02-technical-requirements.md)
- [Market Analysis](research/researcher-01-market-analysis.md)

## Overview
- **Priority**: P2 (Productivity suite)
- **Status**: pending
- **Effort**: 6h

Add calendar (CalDAV) and contacts (CardDAV) sync for productivity suite parity.

## Key Insights
- CalDAV/CardDAV critical for Outlook, Apple, Thunderbird sync
- Global Address List (GAL) highly requested by enterprises
- Can leverage existing calendar/contact libraries
- Differentiator: integrated with email (meeting invites)

## Requirements

### Functional
- CalDAV server for calendar sync (iOS, macOS, Thunderbird)
- Multiple calendars per user with sharing
- CardDAV server for contacts sync
- Global Address List (org-wide contacts)
- Meeting invite handling (iMIP via email)
- Scheduling (free/busy lookup)

### Non-Functional
- CalDAV sync <2s for 1000 events
- Support 10,000 contacts per org (GAL)
- Compatible with Apple Calendar, Outlook, Thunderbird

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Calendar/Contact Clients                  │
│  (Apple Calendar, Contacts.app, Outlook, Thunderbird)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                     WebDAV Protocol
                     (HTTP + Extensions)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    WebDAV Server                             │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │ CalDAV Handler  │  │ CardDAV Handler                 │   │
│  │ /calendars/     │  │ /contacts/                      │   │
│  └────────┬────────┘  └───────────────┬─────────────────┘   │
└───────────┼───────────────────────────┼─────────────────────┘
            │                           │
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────────────┐
│   Calendar Storage    │   │     Contact Storage           │
│  - Events (iCal)      │   │  - Personal contacts (vCard)  │
│  - Recurrence         │   │  - Global Address List        │
│  - Alarms             │   │  - Groups                     │
└───────────────────────┘   └───────────────────────────────┘
```

## Related Code Files

### Modify
- `services/api/prisma/schema.prisma` - Add Calendar, Event, Contact models
- `services/api/src/index.ts` - Mount WebDAV routes

### Create
- `services/api/src/webdav/server.ts` - WebDAV server setup
- `services/api/src/webdav/caldav-handler.ts` - CalDAV operations
- `services/api/src/webdav/carddav-handler.ts` - CardDAV operations
- `services/api/src/routes/calendars.ts` - REST API for calendars
- `services/api/src/routes/contacts.ts` - REST API for contacts
- `services/api/src/services/gal-service.ts` - Global Address List

## Implementation Steps

1. **Schema Design**
   ```prisma
   model Calendar {
     id            String   @id @default(cuid())
     userId        String
     user          User     @relation(fields: [userId])
     name          String
     color         String   @default("#3B82F6")
     timezone      String   @default("UTC")
     isDefault     Boolean  @default(false)
     ctag          String   @default(cuid()) // Sync token
     events        Event[]
     shares        CalendarShare[]
   }

   model Event {
     id            String   @id @default(cuid())
     calendarId    String
     calendar      Calendar @relation(fields: [calendarId])
     uid           String   // iCal UID
     summary       String
     description   String?
     location      String?
     startAt       DateTime
     endAt         DateTime
     allDay        Boolean  @default(false)
     rrule         String?  // Recurrence rule
     icalData      String   // Raw iCal for sync
     etag          String   @default(cuid())
     @@unique([calendarId, uid])
   }

   model Contact {
     id            String   @id @default(cuid())
     userId        String?  // null for GAL entries
     user          User?    @relation(fields: [userId])
     organizationId String?
     organization  Organization? @relation(fields: [organizationId])
     uid           String   // vCard UID
     fullName      String
     email         String?
     phone         String?
     vcardData     String   // Raw vCard
     etag          String   @default(cuid())
     isGal         Boolean  @default(false)
   }
   ```

2. **WebDAV Server Setup**
   - Use `webdav-server` or build custom handlers
   - Mount at `/.well-known/caldav` and `/.well-known/carddav`
   - Principal URLs: `/principals/users/{userId}/`
   - Calendar home: `/calendars/{userId}/`
   - Addressbook home: `/contacts/{userId}/`

3. **CalDAV Handler**
   - PROPFIND: Return calendar properties
   - REPORT: calendar-query, calendar-multiget
   - PUT: Create/update event (parse iCal)
   - DELETE: Remove event
   - Support VTIMEZONE, VEVENT, VALARM

4. **CardDAV Handler**
   - PROPFIND: Return addressbook properties
   - REPORT: addressbook-query, addressbook-multiget
   - PUT: Create/update contact (parse vCard)
   - DELETE: Remove contact
   - Support vCard 3.0 and 4.0

5. **Global Address List**
   - Auto-populate from org members
   - Sync on user create/update/delete
   - Expose as read-only CardDAV collection
   - Search API for GAL lookup

6. **Meeting Invites (iMIP)**
   - Parse VCALENDAR from inbound emails
   - Detect METHOD: REQUEST, REPLY, CANCEL
   - Update event status from replies
   - Generate invite emails on event create

7. **REST API Endpoints**
   ```
   # Calendars
   GET    /calendars                    - List user calendars
   POST   /calendars                    - Create calendar
   GET    /calendars/:id/events         - List events
   POST   /calendars/:id/events         - Create event

   # Contacts
   GET    /contacts                     - List contacts
   POST   /contacts                     - Create contact
   GET    /contacts/gal                 - Search GAL
   ```

## Todo List

- [ ] Add Calendar, Event, Contact models
- [ ] Implement WebDAV server foundation
- [ ] Build CalDAV PROPFIND/REPORT handlers
- [ ] Implement iCal parsing/serialization
- [ ] Build CardDAV handlers
- [ ] Implement vCard parsing/serialization
- [ ] Create Global Address List service
- [ ] Add REST endpoints for web UI
- [ ] Implement meeting invite handling
- [ ] Test with Apple Calendar, Thunderbird
- [ ] Add calendar sharing with permissions

## Success Criteria

- [ ] Apple Calendar syncs events via CalDAV
- [ ] Contacts.app syncs contacts via CardDAV
- [ ] Thunderbird Lightning connects successfully
- [ ] GAL appears as read-only addressbook
- [ ] Meeting invites create/update events

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebDAV protocol complexity | High | Use tested library, extensive testing |
| iCal recurrence edge cases | Medium | Use ical.js for parsing |
| Client compatibility | Medium | Test matrix with major clients |
| Timezone handling | Medium | Store in UTC, convert on sync |

## Security Considerations

- Authenticate all WebDAV requests
- Validate calendar/contact ownership
- Sanitize vCard/iCal content
- Rate limit sync operations
- Audit log calendar sharing changes
- Encrypt contact data at rest
