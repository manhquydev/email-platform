# Security Best Practices & Remediation Report

**Platform**: TypeScript/Fastify/React/Prisma/PostgreSQL email platform  
**Report Date**: 2026-06-01  
**Focus**: Credential management, SSH auth, token security, encryption at-rest

---

## 1. Removing Hardcoded Credentials from Python/Bash Scripts

### Current Issue
`scripts/check_api_error.py` contains hardcoded SSH password:
```python
HOST = "165.22.48.193"
USERNAME = "root"
PASSWORD = "<REDACTED-OLD-SECRET>"  # ⚠️ EXPOSED IN VCS
```

### Best Practice Pattern

**Option A: Environment Variables**
```python
import os
import sys
from dotenv import load_dotenv
import paramiko

load_dotenv()  # Loads from .env (NOT committed)

HOST = os.getenv("SSH_HOST")
USERNAME = os.getenv("SSH_USER")
PASSWORD = os.getenv("SSH_PASSWORD")  # For password auth (not recommended)

if not all([HOST, USERNAME, PASSWORD]):
    sys.exit("❌ SSH credentials not set in env vars")

client = paramiko.SSHClient()
client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
```

**Option B: SSH Key-Based Auth (Recommended)**
```python
import os
import paramiko

SSH_KEY_PATH = os.getenv("SSH_KEY_PATH", os.path.expanduser("~/.ssh/id_rsa"))
SSH_KEY_PASSPHRASE = os.getenv("SSH_KEY_PASSPHRASE", None)  # Optional

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

# Load key from file, use ssh-agent if available
pkey = paramiko.RSAKey.from_private_key_file(SSH_KEY_PATH, password=SSH_KEY_PASSPHRASE)
client.connect(HOST, username=USERNAME, pkey=pkey, timeout=30)
```

**Option C: Vault Integration (HashiCorp Vault)**
```python
import os
import hvac

VAULT_ADDR = os.getenv("VAULT_ADDR", "http://127.0.0.1:8200")
VAULT_TOKEN = os.getenv("VAULT_TOKEN")  # From environment, not hardcoded
vault = hvac.Client(url=VAULT_ADDR, token=VAULT_TOKEN)

ssh_secret = vault.secrets.kv.read_secret_version(path="ssh/data/production")
HOST = ssh_secret["data"]["data"]["host"]
USERNAME = ssh_secret["data"]["data"]["username"]
pkey = paramiko.RSAKey.from_private_key_file(ssh_secret["data"]["data"]["key_path"])
```

### Purge from Git History
```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove credential patterns from all history
git filter-repo --invert-paths --path scripts/check_api_error.py

# Or replace in-place if file should stay
git filter-repo --replace-text <(echo "PASSWORD = \"<REDACTED-OLD-SECRET>\"==>PASSWORD = os.getenv('SSH_PASSWORD')")

# Verify
git log -p scripts/ | grep -i "password" # Should be empty

# Force push (ONLY after verification)
git push origin --force-with-lease main
```

**Env file setup** (`.env`, `.env.local` — add to `.gitignore`):
```bash
SSH_HOST=165.22.48.193
SSH_USER=root
SSH_KEY_PATH=/home/user/.ssh/production_rsa
SSH_KEY_PASSPHRASE=  # Leave empty if key has no passphrase
```

---

## 2. SSH Key-Based Auth (Disable Password Auth)

### sshd_config on server
```bash
# /etc/ssh/sshd_config
PermitRootLogin prohibit-password  # or 'no' if no root needed
PasswordAuthentication no          # ⚠️ Disable password logins
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys .ssh/authorized_keys2
Protocol 2
```

Restart SSH:
```bash
systemctl reload sshd
```

### Python client: SSH key-based auth with fallback
```python
import paramiko
import os

def connect_ssh(host: str, user: str, key_path: str = None) -> paramiko.SSHClient:
    """Connect via SSH key. Falls back to agent if key unavailable."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        # Try key file first
        if key_path and os.path.exists(key_path):
            pkey = paramiko.RSAKey.from_private_key_file(key_path)
            client.connect(host, username=user, pkey=pkey, timeout=30)
            return client
        
        # Try ssh-agent (avoids passphrase entry)
        agent = paramiko.Agent()
        agent_keys = agent.get_keys()
        if agent_keys:
            for key in agent_keys:
                try:
                    client.connect(host, username=user, pkey=key, timeout=30)
                    return client
                except paramiko.AuthenticationException:
                    continue
        
        raise Exception("No SSH key available")
    except Exception as e:
        raise RuntimeError(f"SSH auth failed: {e}")
    
    return client

# Usage
client = connect_ssh(
    host=os.getenv("SSH_HOST"),
    user=os.getenv("SSH_USER"),
    key_path=os.getenv("SSH_KEY_PATH")
)
stdin, stdout, stderr = client.exec_command("docker ps")
print(stdout.read().decode())
```

---

## 3. Revoking & Rotating GitHub PATs

### Current Issue
GitHub Personal Access Tokens (PATs) in `.env` or scripts are often:
- Long-lived (no expiry)
- Over-scoped (repo + workflow + admin)
- Hardcoded in CI/scripts

### Best Practice: GitHub Actions Secrets + Token Rotation

**In GitHub Actions** (`.github/workflows/deploy.yml`):
```yaml
name: Deploy
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      # Use GITHUB_TOKEN (auto-generated per workflow, 1h expiry)
      - run: |
          echo "Deploying with auto-token..."
          curl -H "Authorization: Bearer ${{ secrets.GITHUB_TOKEN }}" \
               https://api.github.com/user
          
      # If custom PAT needed (e.g., cross-repo access)
      - run: |
          # Use repository secret (NOT hardcoded)
          curl -H "Authorization: token ${{ secrets.GH_DEPLOY_TOKEN }}" \
               https://api.github.com/repos/org/repo/deployments
```

**Rotate PATs via API** (revoke old, create new):
```python
import os
import requests

def rotate_github_pat(org: str, old_pat: str):
    """Revoke old PAT and create new one."""
    headers = {"Authorization": f"token {old_pat}"}
    
    # List all PATs for this user
    resp = requests.get("https://api.github.com/user/gpg_keys", headers=headers)
    # Actually, for PATs, use the PAT itself to revoke:
    resp = requests.delete(
        "https://api.github.com/user/authorizations/app/oauth_app_id",
        headers=headers,
        auth=(os.getenv("GH_USER"), old_pat)
    )
    print(f"Revoked old PAT: {resp.status_code}")
    
    # Create new PAT (via web UI or API with admin:repo_hook scope)
    # then update in GitHub Actions secrets
```

**GitHub Actions secret rotation** (manual or CI):
1. Generate new PAT: `Settings > Developer settings > Personal access tokens > Generate new`
2. Add to repo secrets: `Settings > Secrets and variables > Actions > New secret`
3. Revoke old token
4. Update workflows to use new secret name

**Set PAT expiry & scoping**:
- **Expiry**: 90 days (GitHub UI defaults to 30 days)
- **Scopes**: Minimum required — typically `repo:read` for deployments, avoid `admin`
- **Name**: Include rotation date: `PAT_DEPLOY_2026_06_01`

---

## 4. httpOnly Cookie Pattern for JWT in Fastify

### Current Implementation (GOOD)
**Backend** (`services/api/src/routes/auth/auth-cookies.ts`):
```typescript
export function setAuthCookies(
  reply: FastifyReply,
  request: FastifyRequest,
  refreshToken: string,
  csrfToken: string,
  maxAge: number = COOKIE_MAX_AGE_DEFAULT,
) {
  // Refresh token: httpOnly + Secure + SameSite=Lax
  reply.setCookie("refreshToken", refreshToken, {
    httpOnly: true,     // ✅ JS cannot access
    secure: process.env.NODE_ENV === "production",  // ✅ HTTPS only in prod
    sameSite: "lax",    // ✅ CSRF mitigation
    maxAge,
    path: REFRESH_COOKIE_PATH,
  });

  // CSRF token: httpOnly=false (JS needs to read for header)
  reply.setCookie("csrfToken", csrfToken, {
    httpOnly: false,    // ✅ JS reads for X-CSRF-Token header
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", // ✅ Stricter CSRF protection
    maxAge,
    path: "/",
    domain: csrfDomain,
  });
}
```

### CSRF Double-Submit Pattern
**Frontend** (`services/web/src/utils/token-manager.ts`):
```typescript
async refreshAccessToken(): Promise<string> {
  const csrfToken = this.getCsrfToken();  // From cookie or localStorage
  
  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',  // Send httpOnly refreshToken cookie
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,  // ✅ Double-submit validation
    },
    body: '{}',
  });
}
```

**Backend validation**:
```typescript
app.post("/auth/refresh", async (request, reply) => {
  const csrfFromHeader = request.headers["x-csrf-token"];
  const csrfFromCookie = request.cookies.csrfToken;
  
  // ✅ Verify both match (attacker cannot forge without httpOnly cookie)
  if (csrfFromHeader !== csrfFromCookie) {
    return reply.status(403).send({ error: "CSRF validation failed" });
  }
  
  // Proceed with refresh...
});
```

### ISSUES in SSO Routes (CRITICAL FIX NEEDED)

**Current** (`services/api/src/routes/sso.ts`, lines 55, 101):
```typescript
// ❌ PROBLEM: Tokens in URL query string leak to logs/Referer headers
const redirectUrl = `${appConfig.webUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`;
return reply.redirect(redirectUrl);
```

**Attack vector**:
- Proxy logs: `GET /auth/callback?token=eyJh...` exposed in reverse proxy
- Referer header: redirect leaks token to next site
- Browser history: token stored in history
- XSS: attacker reads query param `location.search`

**FIX: Use httpOnly cookie redirect**:
```typescript
// ✅ CORRECT: Set httpOnly cookies then redirect to blank page
app.post("/sso/saml/:providerId/acs", async (request, reply) => {
  const { profile } = await service.validatePostResponse(request.body);
  
  const user = await provisionUser(providerId, profile.nameID, profile.email, profile);
  
  // Create tokens
  const accessToken = app.jwt.sign(
    { userId: user.id, role: user.role, tier: user.tier, type: "access", jti: crypto.randomUUID() },
    { expiresIn: "15m" }
  );
  const refreshToken = app.jwt.sign(
    { userId: user.id, type: "refresh", jti: crypto.randomUUID() },
    { expiresIn: "7d" }
  );
  const csrfToken = crypto.randomBytes(16).toString("hex");
  
  // Set as httpOnly cookies (no URL exposure)
  setAuthCookies(reply, request, refreshToken, csrfToken);
  
  // Redirect to safe callback page (no tokens in URL)
  return reply.redirect(`${appConfig.webUrl}/auth/callback?success=true`);
});
```

**Frontend callback handler** (`services/web/src/pages/AuthCallback.tsx`):
```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '../utils/token-manager';

export function AuthCallback() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Cookies are auto-sent by browser in fetch (credentials: 'include')
    // Validate that cookies are present and refresh endpoint works
    tokenManager.refreshAccessToken()
      .then(() => {
        navigate('/dashboard');
      })
      .catch(() => {
        navigate('/login?error=auth_failed');
      })
      .finally(() => setLoading(false));
  }, [navigate]);
  
  return loading ? <div>Completing sign-in...</div> : null;
}
```

---

## 5. SSO OAuth Callback — Token via httpOnly Cookie (Not URL)

### Problem: Current Pattern
`sso.ts` lines 55, 101 pass tokens via URL:
```typescript
const redirectUrl = `${appConfig.webUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`;
return reply.redirect(redirectUrl);
```

### Solution: httpOnly Cookie + State Parameter

**Step 1: Create state token (CSRF mitigation for OAuth)**
```typescript
import crypto from "crypto";

app.get("/sso/oauth/:providerId/login", async (request, reply) => {
  const state = crypto.randomBytes(32).toString("hex");
  
  // Store state in httpOnly cookie (short-lived, path-restricted)
  reply.setCookie("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,  // 10 min
    path: `/sso/oauth/${providerId}/callback`,
  });
  
  const loginUrl = oauthService.getAuthorizationUrl(state);
  return reply.redirect(loginUrl);
});
```

**Step 2: Validate state, set auth cookies**
```typescript
app.get("/sso/oauth/:providerId/callback", async (request, reply) => {
  const { code, state } = request.query as { code: string; state: string };
  const storedState = request.cookies.oauth_state;
  
  // ✅ Validate state matches (prevents CSRF)
  if (!storedState || state !== storedState) {
    return reply.status(403).send({ error: "Invalid oauth state" });
  }
  
  // Exchange code for OAuth token
  const oauthToken = await oauthService.exchangeCodeForToken(code);
  const userInfo = await oauthService.getUserInfo(oauthToken.access_token);
  const user = await provisionUser(providerId, userInfo.sub, userInfo.email, userInfo);
  
  // Create JWT tokens
  const accessToken = app.jwt.sign(
    { userId: user.id, role: user.role, tier: user.tier, type: "access", jti: crypto.randomUUID() },
    { expiresIn: "15m" }
  );
  const refreshToken = app.jwt.sign(
    { userId: user.id, type: "refresh", jti: crypto.randomUUID() },
    { expiresIn: "7d" }
  );
  const csrfToken = crypto.randomBytes(16).toString("hex");
  
  // ✅ Set as httpOnly cookies (no URL exposure)
  setAuthCookies(reply, request, refreshToken, csrfToken);
  
  // Clear state cookie
  reply.clearCookie("oauth_state");
  
  // ✅ Redirect without tokens in URL
  return reply.redirect(`${appConfig.webUrl}/auth/callback?provider=${providerId}`);
});
```

**Why this pattern**:
- **No token in URL**: Prevents logging, Referer leak, history exposure
- **State validation**: CSRF protection for OAuth redirect
- **httpOnly**: JS cannot steal via XSS
- **SameSite=Lax**: Mitigates cross-site cookie spray

---

## 6. Encrypting Sensitive DB Fields at-Rest

### Current Implementation (Good Start)
`services/api/src/utils/encryption.ts` uses AES-256-GCM:
```typescript
export function encrypt(text: string): string {
    const key = Buffer.from(appConfig.totpEncryptionKey, "hex");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}
```

### Key Management
**`.env.example`** (line 49):
```bash
# TOTP Encryption Key (32 bytes hex) - REQUIRED for production
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TOTP_ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000"
```

Generate key:
```bash
# In production, use a secure random generator
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: a1b2c3d4e5f6... (64 hex chars = 32 bytes)
```

### Extend to DKIM Private Keys, Webhook Secrets

**Schema** (`services/api/prisma/schema.prisma`):
```prisma
model Domain {
  id        String   @id @default(cuid())
  name      String   @unique
  userId    String
  // DKIM private key (encrypted at-rest)
  dkimPrivateKey String?  // Store as "iv:authTag:ciphertext"
  dkimPublicKey  String?  // Store plaintext (public)
  createdAt DateTime @default(now())
}

model WebhookEndpoint {
  id       String   @id @default(cuid())
  url      String
  // Webhook secret (encrypted at-rest)
  secret   String   // Store as "iv:authTag:ciphertext"
}

model User {
  id String @id @default(cuid())
  // TOTP secret (encrypted at-rest)
  totpSecret String?  // Store as "iv:authTag:ciphertext"
}
```

### Service Pattern: Encrypt on Write, Decrypt on Read

**Alias service** (`services/api/src/services/alias.service.ts`, lines 40–55, already implements this):
```typescript
const ENCRYPTION_KEY = process.env.ALIAS_ENCRYPTION_KEY;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Create (encrypt on write)
async create(input: AliasCreateInput): Promise<Alias> {
  const encryptedForwardTo = encrypt(input.forwardTo);  // ✅ Encrypt before DB
  const inbox = await prisma.inbox.create({
    data: {
      flags: {
        forwardTo: encryptedForwardTo,  // Stored encrypted
      },
    },
  });
}

// Read (decrypt after fetch)
async getById(id: string): Promise<Alias> {
  const inbox = await prisma.inbox.findUnique({ where: { id } });
  const decryptedForwardTo = decrypt(inbox.flags.forwardTo);  // ✅ Decrypt after DB
  return { ...inbox, forwardTo: decryptedForwardTo };
}
```

### Apply to DKIM & Webhook Secrets

**Domain service**:
```typescript
import { encrypt, decrypt } from "../utils/encryption";

export const domainService = {
  async createDkim(domainId: string, privateKey: string, publicKey: string) {
    const encryptedPrivateKey = encrypt(privateKey);  // ✅ Encrypt PEM
    
    return await prisma.domain.update({
      where: { id: domainId },
      data: {
        dkimPrivateKey: encryptedPrivateKey,  // Stored as iv:tag:ciphertext
        dkimPublicKey: publicKey,  // Public, no encryption needed
      },
    });
  },
  
  async getDkimPrivateKey(domainId: string): Promise<string> {
    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain?.dkimPrivateKey) throw new Error("DKIM not configured");
    
    return decrypt(domain.dkimPrivateKey);  // ✅ Decrypt on use
  },
};
```

**Webhook service**:
```typescript
export const webhookService = {
  async createEndpoint(url: string, secret: string) {
    const encryptedSecret = encrypt(secret);  // ✅ Encrypt before storage
    
    return await prisma.webhookEndpoint.create({
      data: {
        url,
        secret: encryptedSecret,
      },
    });
  },
  
  async verifyWebhook(endpointId: string, payload: string, signature: string) {
    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    const decryptedSecret = decrypt(endpoint.secret);  // ✅ Decrypt for verification
    
    const hmac = crypto
      .createHmac('sha256', decryptedSecret)
      .update(payload)
      .digest('hex');
    
    return hmac === signature;
  },
};
```

### Key Rotation Strategy
```typescript
// During key rotation:
// 1. Keep both OLD_KEY and NEW_KEY in env
const encryptWithNewKey = (text: string) => encrypt(text, process.env.ENCRYPTION_KEY_NEW);
const decryptWithBothKeys = (encrypted: string) => {
  try {
    return decrypt(encrypted, process.env.ENCRYPTION_KEY_NEW);
  } catch {
    return decrypt(encrypted, process.env.ENCRYPTION_KEY_OLD);
  }
};

// 2. Migrate data: decrypt with old, re-encrypt with new
async function migrateEncryptionKey() {
  const domains = await prisma.domain.findMany({
    where: { dkimPrivateKey: { not: null } },
  });
  
  for (const domain of domains) {
    const decrypted = decryptWithBothKeys(domain.dkimPrivateKey);
    const reencrypted = encryptWithNewKey(decrypted);
    
    await prisma.domain.update({
      where: { id: domain.id },
      data: { dkimPrivateKey: reencrypted },
    });
  }
}

// 3. Once all migrated, retire OLD_KEY
```

---

## Summary & Action Items

| Topic | Current Risk | Fix | Priority |
|-------|-------------|-----|----------|
| **Python script credentials** | CRITICAL (hardcoded SSH password) | Use env vars + git-filter-repo | 🔴 NOW |
| **SSH auth** | HIGH (password auth enabled) | SSH key-based + disable pwd auth | 🔴 NOW |
| **GitHub PATs** | MEDIUM (may be hardcoded) | Actions secrets + 90-day rotation | 🟠 SOON |
| **SSO token in URL** | CRITICAL (token leak to logs) | httpOnly cookie redirect | 🔴 NOW |
| **CSRF validation** | GOOD (double-submit pattern) | Maintain current | 🟢 KEEP |
| **At-rest encryption** | PARTIAL (TOTP only) | Extend to DKIM keys + secrets | 🟠 SOON |

