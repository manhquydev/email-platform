# Phase 03 - Test, Observability, Runbook

Priority: P1  
Status: Pending

## Overview
Close coverage gaps and establish production triage standards for mail receive reliability.

## Key Insights
- Existing test suite lacks direct coverage for verify-sync rollback paths.
- Production operations currently rely on manual checks, not structured alerts.

## Requirements
- Add regression tests for domain verify + postfix sync edge cases.
- Track queue failures and domain-sync drift with explicit metrics.
- Maintain clear triage runbook for on-call execution.

## Related Code Files
- Modify: `services/api/src/test/*`
- Modify: `services/api/src/lib/metrics.ts`
- Modify: `services/api/src/routes/admin/system.ts` (if adding diagnostics endpoint)
- Modify docs: `docs/deployment-guide.md` / `docs/system-architecture.md` (if needed)

## Implementation Steps
1. Add integration tests for `/domains/:id/verify` success/fail/rollback.
2. Add tests for `runDomainVerificationSweep` sync-fail rollback.
3. Add SMTP RCPT tests for invalid/unregistered/unverified domains.
4. Add metrics + alert thresholds for failed ingest and relay drift.
5. Document triage commands and expected outputs.

## Todo List
- [ ] Verify endpoint rollback tests
- [ ] Sweep rollback tests
- [ ] SMTP strict reject tests
- [ ] Queue/relay metrics + alerts
- [ ] Publish runbook in repo docs

## Success Criteria
- Critical flows protected by regression tests.
- Operators can detect drift/failures before user impact.
- 24h monitoring data can be summarized quickly.

## Risk Assessment
- Test setup requires DB/Redis/Postfix integration profile.
- Mitigation: isolate test profile and keep smoke checks lightweight.

## Security Considerations
- Ensure monitoring/logging does not expose sensitive email content.

## Next Steps
- Execute this phase after Phase 01 stabilization in production.
