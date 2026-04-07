# Phase 02 - Hardening Inbound Delivery Path

Priority: P1  
Status: Pending

## Overview
Reduce silent mail loss and policy bypass in SMTP ingest + worker pipeline.

## Key Insights
- Multi-recipient currently allows partial success with warning-only visibility.
- Strict domain mode still needs explicit product decision on inbox auto-create behavior.
- ACK-then-drop risk remains for failures detected after SMTP DATA accept.

## Requirements
- Enforce verified-domain gate at SMTP ingress for strict mode.
- Clarify fail policy for partial recipient failures.
- Improve retry/recovery posture for transient worker failures.

## Related Code Files
- Modify: `services/api/src/smtp.ts`
- Modify: `services/api/src/worker.ts`
- Potential: `services/api/src/queue/emailQueue.ts`

## Implementation Steps
1. Keep strict RCPT checks on domain existence + verified status.
2. Decide policy for inbox auto-create under strict mode.
3. Add dedupe for recipient list and stronger failure reporting.
4. Evaluate retry strategy before raw file cleanup on hard failures.

## Todo List
- [x] Enforce domain verified in SMTP RCPT strict mode
- [ ] Decide strict-mode inbox auto-create policy
- [ ] Add recipient dedupe + failure metrics
- [ ] Add retry/dead-letter strategy for inbound worker

## Success Criteria
- No pending/unverified domain can receive via strict ingress.
- Partial recipient failures are visible with actionable telemetry.
- Transient processing failures do not silently drop mail.

## Risk Assessment
- Behavior change can reject traffic previously accepted.
- Mitigation: canary deploy + monitor failed queue and logs.

## Security Considerations
- Fail-closed policy reduces unauthorized inbound acceptance surface.

## Next Steps
- Implement selected policy and run staged rollout with monitoring.
