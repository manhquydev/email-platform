# Phase 01 - Stop Critical Domain Drift

Priority: P0  
Status: In Progress

## Overview
Eliminate mismatch where DB says `VERIFIED` but Postfix relay map is stale, and block invalid domain onboarding.

## Key Insights
- `POST /domains` domain format validation was effectively dead.
- Verify flow previously committed `VERIFIED` before guaranteed relay sync.
- Empty verified-domain set previously skipped sync, leaving stale relay map risk.

## Requirements
- Always validate + normalize domain input.
- If relay sync fails, do not keep domain in `VERIFIED`.
- Sync must execute even when verified-domain set is empty.

## Related Code Files
- Modify: `services/api/src/routes/domains.ts`
- Modify: `services/api/src/utils/postfix-sync.ts`
- Modify: `services/api/src/services/domain-verification.service.ts`
- Modify: `services/api/src/services/hosting-provider.service.ts`
- Modify: `services/api/src/routes/admin/domains.ts`

## Implementation Steps
1. Normalize + validate domain on create.
2. Change verify flow to rollback status when sync fails.
3. Ensure Postfix sync writes empty relay file when no verified domains.
4. Apply same rollback pattern to background/provider/admin verification paths.

## Todo List
- [x] Normalize + validate domain input in create route
- [x] Rollback domain status on sync failure in verify route
- [x] Sync empty verified-domain set
- [x] Provider verify path rollback on sync failure
- [x] Admin bulk verify single full-sync instead of per-domain sync

## Success Criteria
- No domain remains `VERIFIED` after a failed Postfix sync.
- Relay map reflects DB verified domains including empty set case.
- Invalid domain input is rejected consistently.

## Risk Assessment
- High-impact area: `syncPostfixRelayDomains` used by multiple flows.
- Mitigation: minimal contract change, rollback strategy, production verification commands.

## Security Considerations
- Input normalization blocks malformed domain values reaching sync shell path.

## Next Steps
- Add integration tests for verify+sync success/fail/rollback.
