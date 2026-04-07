# Core Mail Flow Hardening Plan

Status: In Progress  
Scope: domain verification, inbox receive pipeline, Postfix sync consistency

## Phases
1. `phase-01-stop-critical-domain-drift.md` - Status: In Progress
2. `phase-02-hardening-inbound-delivery-path.md` - Status: Pending
3. `phase-03-test-observability-runbook.md` - Status: Pending

## Current Progress
- Completed: assign `savethetrailpetition.org` owner/org in production
- Completed: deploy SMTP early reject + multi-recipient runtime
- Completed: clear `bull:email-ingest:failed` and start 24h monitor
- Completed: P0 patch set for verify/sync rollback and strict domain validation
- Next: close remaining High risks (atomicity + bulk verify UX) and add targeted tests

## Key Dependencies
- Postfix sync path (`/app/shared/relay_domains`) stays healthy
- Redis queue health remains stable during 24h monitoring window
- Domain verification behavior unified across routes/services

## Unresolved Questions
1. For strict mode, should inbound accept only pre-created inboxes (`fail-closed`)?
2. Should admin bulk verify allow bypass DNS ownership, or always force DNS proof?
