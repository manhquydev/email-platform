# Mail Hardening Status - 2026-04-04

## Current state
- strict mode active: `ALLOW_AUTO_DOMAIN_CREATION=false`
- domain `savethetrailpetition.org` is `VERIFIED`
- mapped owner/org:
  - ownerId: `bacbc6ac-bfe6-4aa0-a8f7-0a067141a8de`
  - organizationId: `edffedae-2659-4caa-8052-74181be52afe`
- provisioned inbox localparts: `postmaster`, `info`, `admin`, `contact`
- queue `bull:email-ingest:failed` currently `0`

## Runtime verification (VPS)
- valid recipient test: `postmaster@savethetrailpetition.org`
  - result: accepted and persisted
  - DB check: message count for domain increased to `1`
- invalid recipient test: `ghost@savethetrailpetition.org`
  - result: rejected by API SMTP RCPT policy
  - Postfix log confirms bounce: `550 Recipient ghost@savethetrailpetition.org not provisioned`
  - DB check: message count unchanged

## Policy decisions (recommended default)
1. inbound policy: fail-closed in strict mode
2. admin bulk verify: require DNS proof (no silent bypass)
3. provider verify: require DNS proof + postfix sync, rollback on sync fail
4. onboarding rule: verify domain first, then provision required inbox aliases before production traffic cutover

## Agent team status
- attempted to run extra code-reviewer/tester agents; quota blocked (`retry after 6:05 AM`)
- proceeded with direct validation manually

## Remaining implementation candidates
1. auto-provision default aliases (`postmaster/info/admin/contact`) right after successful domain verification
2. add/enable test infra command for `smtp.e2e.test.ts` in CI (currently out of default vitest include)
3. reduce noisy API logs from empty JSON-body probes (non-blocking)

## Unresolved questions
1. should default alias auto-provision be always-on or env-controlled?
2. should strict mode reject at edge Postfix stage immediately (not just bounce after relay attempt)?

## Critical bug discovered + fixed
- Root cause of intermittent missing inbound emails: two workers consumed the same `email-ingest` queue.
  - inbound worker: `setupEmailWorker` (stores inbound)
  - outbound worker: `setupOutboundWorker` (intended for outbound)
- Outbound worker could pick inbound jobs and mark them completed without storing, causing silent drop.
- Fix applied:
  - moved outbound-delivery worker to dedicated queue `email-outbound-ingest`
  - submission SMTP now enqueues outbound jobs to that dedicated queue
- VPS runtime re-check after fix:
  - valid recipient persisted (`msg_count` increased)
  - invalid recipient still bounced (`550 not provisioned`)
