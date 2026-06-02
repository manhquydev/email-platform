# Phase 00 — Emergency Credential Rotation

## Context Links
- Best practices: `research/security-best-practices-remediation-report.md` (§1, §2, §3)
- Findings: `research/security-audit-findings.md`
- Overview: `plan.md`

## Overview
- **Priority:** P0 — Immediate (within 24h)
- **Status:** pending
- **Effort:** ~24h (mostly ops + coordination, no application code change)
- **Description:** Rotate/revoke every credential that leaked into VCS, then purge the secret values from git history. Code fixes in later phases do NOT invalidate leaked credentials — this phase must complete first.

## Key Insights
- Leaked SSH root password, GitHub PAT, and K8s secrets are valid until manually rotated. Treat all as compromised.
- Git history rewrite is destructive to existing clones; requires team sign-off before force-push.
- This phase produces the new secret values that Phase 01 / Phase 02 code will consume via env vars / secret manager.

## Requirements
**Functional**
- All leaked credentials rotated and old values revoked.
- Secret values removed from git history (working tree + all past commits).
- Config templates contain placeholders only.

**Non-functional**
- Zero secret values committed going forward (enforced by Phase 03 CI + pre-commit secret scan).
- Reversible: back up affected files before history rewrite.

## Architecture
- Live credentials (server console, GitHub settings UI, K8s cluster) rotated out-of-band.
- New K8s secrets delivered via Sealed Secrets or External Secrets Operator (decision pending) instead of base64 in repo.
- History rewrite via `git-filter-repo` replace-text rules.

## Related Code Files
**Modify**
- `.env.production.template`
- `k8s/config-secrets.yaml`
- `scripts/update_admin.sql`
- All 29 Python scripts under `scripts/` containing `<REDACTED-OLD-SECRET>` / PAT

**Delete / sanitize**
- `k8s/config-secrets.yaml` base64 weak values → replace with secret-manager references

## Implementation Steps
1. **Rotate SSH root password** on `165.22.48.193` via server console immediately. Prefer also enabling key-based auth and disabling password auth (`sshd_config`: `PasswordAuthentication no`, `PermitRootLogin prohibit-password`; `systemctl reload sshd`).
2. **Revoke GitHub PAT** `<REDACTED-OLD-PAT>` at https://github.com/settings/tokens. Issue replacement only if needed, scoped minimally, with expiry; store in GitHub Actions secrets (never in repo).
3. **Rotate K8s secrets:** generate new strong `postgres-password` and `jwt-secret` (≥64 random chars):
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   Apply to cluster; restart dependent workloads.
4. **Back up** affected files (copy outside repo) before any history rewrite.
5. **Purge git history:**
   ```bash
   pip install git-filter-repo
   git filter-repo --replace-text <(echo "<REDACTED-OLD-SECRET>==>REDACTED") --force
   ```
   Add additional replace rules for the PAT value and any other leaked secrets.
6. **Update `.env.production.template`:** replace `DEFAULT_ADMIN_PASSWORD="<REDACTED-OLD-SECRET>"` with `DEFAULT_ADMIN_PASSWORD="CHANGE_THIS_BEFORE_DEPLOY"`.
7. **Sanitize `k8s/config-secrets.yaml`:** remove base64-encoded weak values; replace with Sealed Secrets references or External Secrets Operator pattern (decision pending — see Open Questions).
8. **Sanitize `scripts/update_admin.sql`** and the 29 Python scripts of any inline secrets (full code replacement done in Phase 01-A; here ensure no live secret value persists post-purge).
9. **Verify:** `grep -r "<REDACTED-OLD-SECRET>" .` returns no results (working tree). Re-check packed history with `git log -p | grep -i "<REDACTED-OLD-SECRET>"`.
10. **Coordinate + force-push** cleaned history (`git push origin --force-with-lease`) after team agrees, OR create a new repo from the clean state. Notify all clone holders to re-clone.

## Todo List
- [ ] Change SSH root password on `165.22.48.193`
- [ ] (Recommended) Enable SSH key auth, disable password auth
- [ ] Revoke GitHub PAT `<REDACTED-OLD-PAT>`
- [ ] Generate + apply new K8s `postgres-password`
- [ ] Generate + apply new K8s `jwt-secret` (≥64 chars)
- [ ] Back up affected files outside repo
- [ ] Run `git filter-repo --replace-text` purge
- [ ] Update `.env.production.template` placeholder
- [ ] Sanitize `k8s/config-secrets.yaml` → secret-manager refs
- [ ] Sanitize `scripts/update_admin.sql`
- [ ] Verify `grep -r "<REDACTED-OLD-SECRET>" .` is clean
- [ ] Verify packed history is clean
- [ ] Team-coordinate force-push OR new clean repo
- [ ] Notify clone holders to re-clone

## Success Criteria
- All four credential classes rotated, old values dead.
- `grep -r "<REDACTED-OLD-SECRET>" .` and history grep both empty.
- Templates/configs contain only placeholders or secret-manager references.

## Risk Assessment
- **Git history rewrite breaks existing clones / open PRs** → coordinate, schedule, communicate; use `--force-with-lease`.
- **Service downtime from rotating jwt-secret/postgres-password** → roll during maintenance window; restart pods after secret update.
- **Incomplete purge** (secret in unexpected file/branch) → run grep across all branches; consider `git filter-repo` on all refs.

## Security Considerations
- Never paste the new secret values into the repo, plan files, or commit messages.
- Prefer key-based SSH + secret manager over password/base64.
- Treat PAT replacement as least-privilege + expiring.

## Next Steps
- Provides new env values consumed by Phase 01 (scripts, alias key) and Phase 02 (field encryption, Redis auth).
- Phase 03 task 14 (CI secret scanning) enforces no regression.
