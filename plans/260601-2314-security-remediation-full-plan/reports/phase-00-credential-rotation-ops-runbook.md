# Phase 00 — Operational Runbook (Manual Actions Required)

> The code/config side of Phase 00 is **done** (working tree is free of the leaked secret —
> `grep -r "Manhquy203" .` is clean). The steps below are **out-of-band operations** that an
> operator with server/GitHub/cluster access must perform. They were intentionally NOT executed
> by automation: they are destructive and/or require credentials and team coordination.

## Why this must happen even though the code is fixed
Removing a secret from the working tree does **not** invalidate it. The leaked SSH password, the
GitHub PAT, and the K8s base64 secrets remain valid until rotated, and remain in **git history**
until purged. Treat all three credential classes as compromised.

## 1. Rotate live credentials (do first, immediately)
- **SSH root password** on the production server (the IP previously hardcoded in `scripts/`):
  change it via the server console. Strongly prefer switching to key-based auth and disabling
  password auth: in `/etc/ssh/sshd_config` set `PasswordAuthentication no` and
  `PermitRootLogin prohibit-password`, then `systemctl reload sshd`.
- **GitHub PAT** (the `ghp_…` token formerly embedded in deploy scripts): revoke at
  <https://github.com/settings/tokens>. If a replacement is needed, scope it minimally, set an
  expiry, and store it as a GitHub Actions secret (`GITHUB_PAT`) — never in the repo.
- **K8s secrets**: generate fresh strong values and apply them, then restart dependent workloads:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"  # postgres-password
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"  # jwt-secret (>=64 chars)
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"        # TOTP_ENCRYPTION_KEY (64 hex)
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"        # ALIAS_ENCRYPTION_KEY (32-byte)
  node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"  # REDIS_PASSWORD
  ```

## 2. Provide the new env values the code now requires (no defaults / fallbacks anymore)
| Env var | Consumed by | Notes |
|---------|-------------|-------|
| `TOTP_ENCRYPTION_KEY` | field encryption (DKIM, TOTP, webhook secrets) | 64 hex chars; required in prod |
| `ALIAS_ENCRYPTION_KEY` | `alias.service.ts` | required in ALL envs now (dev fallback removed) |
| `REDIS_PASSWORD` (+ `REDIS_USERNAME`/`REDIS_TLS`) | all Redis clients | optional but recommended in prod |
| `CAPTCHA_PROVIDER` / `CAPTCHA_SECRET` / `CAPTCHA_SITE_KEY` | public-inbox CAPTCHA | provider = `turnstile` (default) or `hcaptcha` |
| `DEPLOY_SSH_PASSWORD` / `DEPLOY_SSH_HOST` / `DEPLOY_SSH_USER` / `GITHUB_PAT` | `scripts/*.py` | required by deploy/debug scripts |
| `DEBUG_INBOX_PASSWORD` / `RESET_PASS_PASSWORD` / `RESET_PASS_EMAIL` / `DATABASE_URL` | `services/api/scripts/*` | required by those scripts |
| `TOKEN_REVOCATION_FAIL_CLOSED` | token revocation | defaults to `true` (deny on Redis outage); set `false` to restore fail-open |

## 3. Run the field-encryption back-fill (after TOTP_ENCRYPTION_KEY is final)
```bash
cd services/api
TOTP_ENCRYPTION_KEY=<the-real-key> npx tsx scripts/encrypt-webhook-secrets.ts
```
Idempotent — encrypts existing plaintext `Webhook.secret`, `ForwardingRule.webhookSecret`,
`HostingProvider.webhookSecret`. Back up the DB first.

## 4. K8s secret delivery
`k8s/config-secrets.yaml` now holds `CHANGE_ME` placeholders (it will intentionally fail
`kubectl apply` until real values are supplied). Pick one path (documented in the file header):
**Sealed Secrets** (kubeseal) or **External Secrets Operator**. Also replace the patch-pinned
images in `k8s/database-deployment.yaml` (`postgres:16.4-alpine`, `redis:7.4-alpine`) with
`@sha256:<digest>` pins before production deploy.

## 5. Purge git history (DESTRUCTIVE — requires team sign-off)
This rewrites history and breaks existing clones/open PRs. Coordinate a window first.
```bash
pip install git-filter-repo
# Back up the repo elsewhere first.
git filter-repo --replace-text <(printf '%s\n%s\n' \
  'Manhquy203@==>REDACTED' \
  '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==>REDACTED')
# Also purge the previously-committed generated dump that contained secrets:
git filter-repo --path repomix-output.xml --invert-paths --force
# Verify:
git log -p | grep -i "Manhquy203"   # expect empty
# Then, after the team agrees:
git push origin --force-with-lease
# Notify all clone holders to re-clone.
```
Alternative: create a fresh repo from the clean working tree if a force-push is not acceptable.

## Verification checklist
- [ ] SSH password rotated (and key-auth preferred)
- [ ] GitHub PAT revoked; replacement (if any) in Actions secrets only
- [ ] New postgres-password / jwt-secret / encryption keys / Redis password applied
- [ ] `encrypt-webhook-secrets.ts` run against the live DB
- [ ] K8s secrets delivered via Sealed Secrets / ESO; images digest-pinned
- [ ] git history purged + force-pushed (or fresh clean repo); clone holders notified
- [ ] Final: `grep -r "Manhquy203" .` clean in working tree AND `git log -p | grep Manhquy203` clean
