# Security Audit Findings & Remediation Patterns

**Date:** 2026-06-01 | **Project:** email-platform | **Scope:** 6 critical vulnerability classes

---

## 1. Command Injection Prevention (CWE-78)

### Current Risk

**Files affected:**
- `services/api/src/utils/postfix-sync.ts` (line 100: shell template string)
- `services/api/src/routes/admin/backup.ts` (lines 190, 200, 208–209: shell templates)

**Vulnerability pattern:**
```typescript
// ❌ VULNERABLE: exec() with template strings
const cmd = `docker exec ${POSTFIX_CONTAINER} sh -c 'echo "${escapedContent}" > ...'`;
await execAsync(cmd);
```

Attacker controls `POSTFIX_CONTAINER` via env or `content` via domain data → full command execution.

### NIST SP 800-53 Control

**SI-10: Information System Monitoring (Malicious Code & Command Execution)**

### Remediation Pattern

**Replace `exec()` + template strings with `execFile()` + args array + input validation:**

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Container name validation (whitelist pattern)
const CONTAINER_NAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

function validateContainerName(name: string): boolean {
  return CONTAINER_NAME_REGEX.test(name) && name.length <= 64;
}
```

**postfix-sync.ts: Before (line 92–120)**
```typescript
async function syncViaDocker(domains: string[]): Promise<SyncResult> {
  try {
    const content = generateRelayDomainsContent(domains);
    const escapedContent = content.replace(/'/g, "'\\''");
    
    // ❌ VULNERABLE
    const cmd = `docker exec ${POSTFIX_CONTAINER} sh -c 'echo "${escapedContent}" > /etc/postfix/relay_domains && postmap lmdb:/etc/postfix/relay_domains && postfix reload'`;
    await execAsync(cmd);
    // ...
  }
}
```

**postfix-sync.ts: After**
```typescript
async function syncViaDocker(domains: string[]): Promise<SyncResult> {
  try {
    const content = generateRelayDomainsContent(domains);
    
    // Validate container name from env
    if (!validateContainerName(POSTFIX_CONTAINER)) {
      throw new Error(`Invalid container name format: ${POSTFIX_CONTAINER}`);
    }
    
    // Write to temp file, copy into container, reload (SAFER than echo)
    const tmpFile = `/tmp/relay_domains_${Date.now()}.tmp`;
    await fs.promises.writeFile(tmpFile, content, 'utf-8');
    
    try {
      // docker cp instead of docker exec sh -c
      await execFileAsync('docker', ['cp', tmpFile, `${POSTFIX_CONTAINER}:/etc/postfix/relay_domains`]);
      
      // Reload via separate commands (no shell quoting needed)
      await execFileAsync('docker', ['exec', POSTFIX_CONTAINER, 'postmap', 'lmdb:/etc/postfix/relay_domains']);
      await execFileAsync('docker', ['exec', POSTFIX_CONTAINER, 'postfix', 'reload']);
      
      return { success: true, method: 'docker', domains };
    } finally {
      // Cleanup temp file
      await fs.promises.unlink(tmpFile).catch(() => {});
    }
  } catch (error) {
    console.error('[postfix-sync] Docker sync failed:', error);
    return { success: false, method: 'docker', domains, error: (error as Error).message };
  }
}
```

**backup.ts: Before (lines 188–214)**
```typescript
// ❌ VULNERABLE: container name not validated
const { stdout: containerName } = await execAsync(
  "docker ps --format '{{.Names}}' | grep postgres | head -1"
);

// ❌ VULNERABLE: shell template with user-controlled timestamp
await execAsync(
  `docker exec ${containerName.trim()} pg_dump -U postgres -d email_service | gzip > ${backupFile}`,
  { timeout: 120000 }
);
```

**backup.ts: After**
```typescript
// Validate container name from first docker ps result
const { stdout: rawOutput } = await execFileAsync('docker', [
  'ps',
  '--format', '{{.Names}}',
  '--filter', 'status=running'
]);

const containerLines = rawOutput.trim().split('\n');
const postgresContainer = containerLines.find(name => name.includes('postgres'));

if (!postgresContainer || !validateContainerName(postgresContainer)) {
  return reply.status(500).send({ error: 'PostgreSQL container not found or invalid name' });
}

// Use execFile with separate args (no shell interpretation)
const backupFile = `${BACKUP_DIR}/backup_postgres_${timestamp}.sql.gz`;
const gzipPath = `${backupFile}.tmp`;

try {
  // pg_dump to temp file instead of piping through shell
  const dumpFile = `${BACKUP_DIR}/.dump_${Date.now()}.sql`;
  
  const dumpStream = fs.createWriteStream(dumpFile);
  const gzipStream = zlib.createGzip();
  const finalStream = fs.createWriteStream(backupFile);
  
  const dumpProcess = execFileAsync('docker', [
    'exec', postgresContainer, 'pg_dump', '-U', 'postgres', '-d', 'email_service'
  ]);
  
  // Stream-based approach: avoid temp files in shell
  await new Promise<void>((resolve, reject) => {
    dumpProcess
      .on('stdout', (data) => dumpStream.write(data))
      .on('stderr', (data) => console.error('[backup]', data))
      .on('close', (code) => {
        dumpStream.end();
        if (code === 0) resolve();
        else reject(new Error(`pg_dump exited with code ${code}`));
      })
      .on('error', reject);
  });
  
  // Then gzip
  const readStream = fs.createReadStream(dumpFile);
  await new Promise<void>((resolve, reject) => {
    readStream
      .pipe(gzipStream)
      .pipe(finalStream)
      .on('finish', resolve)
      .on('error', reject);
  });
  
  await fs.promises.unlink(dumpFile).catch(() => {});
  
  await recordAudit(userId, 'BACKUP_LOCAL_TRIGGERED', { file: backupFile });
  return { success: true, message: 'Local backup completed', file: backupFile };
} catch (err: any) {
  return reply.status(500).send({ error: 'Backup failed: ' + err.message });
}
```

---

## 2. Server-Side Request Forgery (SSRF) Prevention (CWE-918)

### Current Risk

**File:** `services/api/src/services/forwarding/destinations/webhook-destination.ts` (line 54)

**Vulnerability:**
```typescript
// ❌ VULNERABLE: No URL validation, can reach internal networks
const response = await fetch(webhookUrl, {
  method: "POST",
  headers,
  body: payloadStr,
  signal: AbortSignal.timeout(10000),
});
```

Attacker sets `webhookUrl` to:
- `http://127.0.0.1:6379` → Redis admin commands
- `http://169.254.169.254/latest/meta` → AWS metadata
- `http://10.0.0.5:5432` → Internal PostgreSQL
- `http://192.168.1.1` → Local network
- `http://localhost:3001/admin/...` → Bypass auth

### NIST SP 800-53 Control

**SC-7(11): Boundary Protection (Proxy & Egress Filtering)**

### Remediation Pattern

**Create SSRF-safe fetch wrapper with hostname validation:**

```typescript
// services/api/src/utils/ssrf-safe-fetch.ts
import * as dns from 'dns/promises';
import * as net from 'net';
import { URL } from 'url';

interface SSRFSafeFetchOptions extends RequestInit {
  timeout?: number;
  blockPrivateNetworks?: boolean;
}

// RFC-1918 + link-local + loopback detection
function isPrivateNetwork(ip: string): boolean {
  const ipNum = ip.split('.').reduce((a, b) => a * 256 + parseInt(b), 0);
  
  // Loopback: 127.0.0.0/8
  if ((ipNum >= 2130706432) && (ipNum <= 2147483647)) return true;
  
  // Private: 10.0.0.0/8
  if ((ipNum >= 167772160) && (ipNum <= 184549375)) return true;
  
  // Private: 172.16.0.0/12
  if ((ipNum >= 2886729728) && (ipNum <= 2887778303)) return true;
  
  // Private: 192.168.0.0/16
  if ((ipNum >= 3232235520) && (ipNum <= 3232301055)) return true;
  
  // Link-local: 169.254.0.0/16
  if ((ipNum >= 2851995648) && (ipNum <= 2852061183)) return true;
  
  return false;
}

export async function ssrfSafeFetch(
  urlString: string,
  options: SSRFSafeFetchOptions = {}
): Promise<Response> {
  const { timeout = 10000, blockPrivateNetworks = true, ...fetchOptions } = options;
  
  try {
    const url = new URL(urlString);
    
    // 1. Enforce HTTPS for external webhooks
    if (blockPrivateNetworks && url.protocol !== 'https:') {
      throw new Error('Only HTTPS is allowed for webhook URLs');
    }
    
    // 2. Resolve hostname to IP and block private networks
    if (blockPrivateNetworks) {
      const addresses = await dns.resolve4(url.hostname);
      
      for (const addr of addresses) {
        if (isPrivateNetwork(addr)) {
          throw new Error(`Access denied: webhook URL resolves to private network (${addr})`);
        }
      }
    }
    
    // 3. Enforce port whitelist (no high-range ports to avoid admin services)
    const port = url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80);
    const allowedPorts = [80, 443, 8080, 8443];
    
    if (!allowedPorts.includes(port)) {
      throw new Error(`Port ${port} not allowed for webhooks`);
    }
    
    // 4. Enforce hostname pattern (domain must have TLD)
    if (!/^[\w.-]+\.[a-z]{2,}$/i.test(url.hostname)) {
      throw new Error('Invalid webhook hostname (must be FQDN)');
    }
    
    // 5. Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      return await fetch(urlString, {
        ...fetchOptions,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Webhook request timeout after ${timeout}ms`);
    }
    throw error;
  }
}
```

**webhook-destination.ts: After**
```typescript
import { ssrfSafeFetch } from '../../../utils/ssrf-safe-fetch';

export async function forwardToWebhook(
  message: MessageWithAttachments,
  rule: ForwardingRule
): Promise<SendResult> {
  const webhookUrl = (rule as any).webhookUrl;
  const webhookSecret = (rule as any).webhookSecret;

  if (!webhookUrl) {
    return { success: false, error: 'No webhook URL configured' };
  }

  try {
    const otpResult = extractOTP(message.textBody || '');
    const payload = buildWebhookPayload(message, rule, otpResult);
    const payloadStr = JSON.stringify(payload);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Ephemera-Event': 'email.forwarded',
      'X-Ephemera-Delivery': crypto.randomUUID(),
    };

    if (webhookSecret) {
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadStr)
        .digest('hex');
      headers['X-Ephemera-Signature'] = `sha256=${signature}`;
    }

    // ✅ SAFE: SSRF-validated fetch
    const response = await ssrfSafeFetch(webhookUrl, {
      method: 'POST',
      headers,
      body: payloadStr,
      timeout: 10000,
      blockPrivateNetworks: true,
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[webhook]', error.message);
    return { success: false, error: error.message };
  }
}
```

---

## 3. Atomic Quota Enforcement (TOCTOU Race Condition, CWE-367)

### Current Risk

**File:** `services/api/src/services/quota-service.ts` (lines 6–29)

**Vulnerability:**
```typescript
// ❌ RACE CONDITION: Two separate DB operations
async checkStorageQuota(organizationId: string, bytesToAdd: number): Promise<boolean> {
  const org = await prisma.organization.findUnique(...); // Read
  const newUsage = org.storageUsed + BigInt(bytesToAdd);
  return newUsage <= org.storageQuota; // Logic
}

// Later... in parallel request
async updateStorageUsage(organizationId: string, bytesDelta: number) {
  await prisma.organization.update(...); // Write
}
```

**Attack scenario:** Two concurrent uploads of 500GB each to 1TB quota:
1. Request A reads: storageUsed=0
2. Request B reads: storageUsed=0
3. Request A writes: storageUsed=500GB ✓
4. Request B writes: storageUsed=500GB ✓ (should fail!)
5. Total: 1000GB > 1TB quota **violated**

### NIST SP 800-53 Control

**CM-5(6): Access Restrictions for Change (Concurrent Modifications)**

### Remediation Pattern

**Atomic update with conditional check in single transaction:**

```typescript
// services/api/src/services/quota-service.ts
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class QuotaService {
  /**
   * ATOMIC: Check quota and reserve space in single transaction
   * Prevents TOCTOU race condition via conditional updateMany
   */
  static async reserveStorage(
    organizationId: string,
    bytesToAdd: number
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // 1. Read current state
          const org = await tx.organization.findUnique({
            where: { id: organizationId },
            select: { storageQuota: true, storageUsed: true },
          });

          if (!org) {
            return { success: false, reason: 'Organization not found' };
          }

          // Unlimited quota (0 = unlimited)
          if (org.storageQuota === BigInt(0)) {
            // Still increment even if unlimited (for tracking)
            await tx.organization.update({
              where: { id: organizationId },
              data: { storageUsed: { increment: BigInt(bytesToAdd) } },
            });
            return { success: true };
          }

          const newUsage = org.storageUsed + BigInt(bytesToAdd);

          // 2. ATOMIC: Conditional update only if within quota
          // If condition fails, updateMany returns 0 updated rows
          const updated = await tx.organization.updateMany({
            where: {
              id: organizationId,
              // Only allow if final usage would stay within quota
              storageUsed: {
                lte: org.storageQuota - BigInt(bytesToAdd),
              },
            },
            data: {
              storageUsed: { increment: BigInt(bytesToAdd) },
            },
          });

          if (updated.count === 0) {
            return { success: false, reason: 'Storage quota exceeded' };
          }

          return { success: true };
        },
        {
          isolationLevel: 'Serializable', // Strictest isolation
        }
      );

      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return { success: false, reason: `Database error: ${error.code}` };
      }
      throw error;
    }
  }

  /**
   * Check current usage WITHOUT modifying (read-only)
   */
  static async getUsageStats(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { storageQuota: true, storageUsed: true },
    });

    if (!org) throw new Error('Organization not found');

    return {
      used: org.storageUsed.toString(),
      quota: org.storageQuota.toString(),
      percentage: org.storageQuota > BigInt(0)
        ? Number((org.storageUsed * BigInt(100)) / org.storageQuota)
        : 0,
      available: org.storageQuota > BigInt(0)
        ? (org.storageQuota - org.storageUsed).toString()
        : 'unlimited',
    };
  }
}
```

**Usage in upload handler:**
```typescript
// In upload/attach endpoint handler
const quotaCheck = await QuotaService.reserveStorage(orgId, fileSize);
if (!quotaCheck.success) {
  return reply.status(402).send({ error: 'Storage quota exceeded', reason: quotaCheck.reason });
}
// If we reach here, storage is reserved atomically ✅
```

---

## 4. Broken Access Control (Fastify RBAC) (CWE-639)

### Current Risk

**Files:**
- `services/api/src/routes/admin/backup.ts` (inline checks, line 51)
- `services/api/src/middleware/tenant-context.ts` (header-based tenant without auth validation, lines 33–62)

**Vulnerability patterns:**

**Pattern A: X-Tenant-ID header without auth verification**
```typescript
// ❌ VULNERABLE: Allows user to impersonate any org
const tenantId = request.headers['x-tenant-id'] as string;
const org = await prisma.organization.findUnique({ where: { id: tenantId } });
request.tenant = { id: org.id, ... }; // No check that user owns this org!
```

**Pattern B: Inline role checks (not centralized)**
```typescript
// ❌ Hard to audit and enforce consistently
app.get('/admin/backup/status', { preHandler: app.requireAdmin }, async (...) => {
  // Middleware uses generic "admin" check, not granular
});
```

### NIST SP 800-53 Control

**AC-2(7): Account Management (Role-Based Access Control)**
**AC-6(2): Least Privilege (User-Specified Access)**

### Remediation Pattern

**Centralized middleware with explicit ownership validation:**

```typescript
// services/api/src/middleware/access-control.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AdminRole } from './rbac';
import { prisma } from '../lib/prisma';

/**
 * Centralized admin access control
 * Enforces authentication + granular role checks
 */
export function createRequireAdminRole(allowedRoles: AdminRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    // 1. Ensure user is authenticated
    const user = (req as any).user;
    if (!user || !user.userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    // 2. Check admin role (backward compatible)
    const effectiveRole: AdminRole | undefined = user.adminRole
      ?? (user.role === 'ADMIN' ? AdminRole.SUPER_ADMIN : undefined);

    if (!effectiveRole) {
      return reply.status(403).send({ error: 'Admin role required' });
    }

    // 3. Super admin bypasses all further checks
    if (effectiveRole === AdminRole.SUPER_ADMIN) {
      return;
    }

    // 4. Granular role enforcement
    if (!allowedRoles.includes(effectiveRole)) {
      return reply.status(403).send({
        error: `This action requires one of: ${allowedRoles.join(', ')}`,
      });
    }
  };
}

/**
 * SCIM ownership validation
 * Ensures user belongs to org before accessing org resources
 */
export async function validateOrgOwnership(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const member = await prisma.organizationMember.findFirst({
    where: { userId, organizationId },
    select: { id: true },
  });
  return !!member;
}

/**
 * Tenant context with authentication fallback
 * ❌ Header-based tenant ONLY for authenticated users
 */
export const secureTenantContext = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = (request as any).user;

  // 1. Authenticated user → use organizationId from token
  if (user && user.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    if (org) {
      request.tenant = {
        id: org.id,
        slug: org.slug,
        settings: org.settings,
      };
      return;
    }
  }

  // 2. ONLY IF authenticated, allow X-Tenant-ID header (for multi-org admins)
  if (user && user.adminRole === AdminRole.SUPER_ADMIN) {
    const tenantId = request.headers['x-tenant-id'] as string;

    if (tenantId) {
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
      });

      if (org) {
        request.tenant = {
          id: org.id,
          slug: org.slug,
          settings: org.settings,
        };
        return;
      }
    }
  }

  // 3. No tenant → unauthenticated or invalid header
  // (Public endpoints can still proceed with no tenant)
};
```

**backup.ts: After (centralized auth)**
```typescript
import { createRequireAdminRole } from '../../middleware/access-control';
import { AdminRole } from '../../middleware/rbac';

const requireBackupAdmin = createRequireAdminRole([
  AdminRole.SUPER_ADMIN,
  AdminRole.HELPDESK, // If helpdesk can also manage backups
]);

export async function adminBackupRoutes(app: FastifyInstance) {
  // GET /admin/backup/status
  app.get('/admin/backup/status', { preHandler: requireBackupAdmin }, async (request, reply) => {
    // ✅ User authenticated + role verified by middleware
    // No inline checks needed
    // ...
  });

  // POST /admin/backup/trigger
  app.post('/admin/backup/trigger', { preHandler: requireBackupAdmin }, async (request, reply) => {
    // ✅ User authenticated + role verified
    const userId = (request.user as any).userId; // Safe to use now
    // ...
  });

  // GET /admin/backup/download/:filename
  app.get('/admin/backup/download/:filename', { preHandler: requireBackupAdmin }, async (request, reply) => {
    // ✅ User authenticated + role verified
    // ...
  });

  // DELETE /admin/backup/:filename
  app.delete('/admin/backup/:filename', { preHandler: requireBackupAdmin }, async (request, reply) => {
    // ✅ User authenticated + role verified
    // ...
  });

  // GET /admin/backup/logs
  app.get('/admin/backup/logs', { preHandler: requireBackupAdmin }, async (request, reply) => {
    // ✅ User authenticated + role verified
    // ...
  });
}
```

---

## 5. XSS Prevention (CWE-79)

### Current Risk

**Browser contexts:**
- TypeScript webhook payload construction (webhook-destination.ts, line 90-91)
- Browser extension code (if using innerHTML)

**Risk:** Unsanitized email content (from, subject, htmlBody) directly in JSON.

### NIST SP 800-53 Control

**SI-10(3): Information System Monitoring (Output Encoding)**

### Remediation Pattern

**Use DOMPurify + textContent, avoid innerHTML:**

```typescript
// services/api/src/utils/html-sanitizer.ts
import DOMPurify from 'isomorphic-dompurify';

export interface SanitizedContent {
  html: string; // Safe HTML (script/event handlers removed)
  text: string; // Plain text fallback
}

/**
 * Sanitize untrusted HTML from email bodies
 * Removes script tags, event handlers, dangerous protocols
 */
export function sanitizeHtmlBody(html: string): SanitizedContent {
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'p', 'br', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'img', 'div', 'span', 'table', 'tr', 'td', 'th'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', // Only safe attributes
    ],
    FORCE_BODY: true,
  });

  // Extract plain text (safe for JSON)
  const textOnly = cleanHtml.replace(/<[^>]*>/g, '').trim();

  return { html: cleanHtml, text: textOnly };
}

/**
 * Sanitize email headers/strings (e.g., From:, Subject:)
 * Removes potential XSS via attribute injection
 */
export function sanitizeEmailString(str: string): string {
  return DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [], // No HTML tags at all
    ALLOWED_ATTR: [],
  }).trim();
}
```

**webhook-destination.ts: After**
```typescript
import { sanitizeHtmlBody, sanitizeEmailString } from '../../../utils/html-sanitizer';

function buildWebhookPayload(
  message: MessageWithAttachments,
  rule: ForwardingRule,
  otp: { code: string; confidence: string } | null
) {
  // Sanitize email content before including in payload
  const sanitizedHtml = sanitizeHtmlBody(message.htmlBody || '');

  return {
    event: 'email.forwarded',
    timestamp: new Date().toISOString(),
    rule: {
      id: rule.id,
      name: rule.name,
    },
    message: {
      id: message.id,
      messageId: message.messageId,
      from: sanitizeEmailString(message.fromAddress || ''),
      to: sanitizeEmailString(message.toAddress || ''),
      subject: sanitizeEmailString(message.subject || ''),
      receivedAt: message.receivedAt,
      textBody: message.textBody, // Plain text is safe
      htmlBody: sanitizedHtml.html, // DOMPurify-cleaned
      spamScore: message.spamScore,
      attachments: message.attachments?.map(a => ({
        id: a.id,
        filename: sanitizeEmailString(a.filename), // Also sanitize filenames
      })) || [],
    },
    extractedOtp: otp,
  };
}
```

**Browser extension XSS prevention (Perl/PHP CGI reference):**
```perl
# cgi-bin/webhook-receiver.pl
#!/usr/bin/perl
use strict;
use warnings;
use CGI qw/:standard :html5/;
use HTML::Entities;

my $cgi = CGI->new();
my $from = $cgi->param('from') || '';
my $subject = $cgi->param('subject') || '';
my $body = $cgi->param('body') || '';

# ✅ HTML-escape before output
print start_html('Email Received');
print h1('Email Details');
print p(b('From: '), encode_entities($from));    # Escape HTML entities
print p(b('Subject: '), encode_entities($subject));
print p(b('Body:'), br(), encode_entities($body));
print end_html();
```

---

## 6. Path Traversal Prevention (CWE-22)

### Current Risk

**Files:**
- `services/api/src/services/maildirSync.ts` (lines 33–34: no path validation)
- `services/api/src/routes/admin/backup.ts` (lines 226–227: weak check)

**Vulnerability patterns:**

**Pattern A: Weak filename check (backup.ts)**
```typescript
// ❌ WEAK: Only checks for ".." and "/", doesn't validate with path.resolve()
if (filename.includes("..") || filename.includes("/")) {
  return reply.status(400).send({ error: "Invalid filename" });
}

const filePath = join(BACKUP_DIR, filename);
// Attacker: filename = "postgres%2F..%2F..%2Fetc%2Fpasswd" (URL-encoded /)
// After decode: filePath = "/app/backups/postgres/../.../etc/passwd" ✓ ESCAPES!
```

**Pattern B: No validation in maildirSync (line 33–34)**
```typescript
// ❌ NO VALIDATION: Directly joins untrusted domain/localPart
export function getMaildirPath(domainName: string, localPart: string): string {
  return path.join(MAILDIR_ROOT, domainName, localPart);
}
// If domainName = "../../etc" → /etc/ is accessible
```

### NIST SP 800-53 Control

**SI-10(1): Information System Monitoring (Malformed Input Handling)**

### Remediation Pattern

**Use path.resolve() + startsWith() prefix check:**

```typescript
// services/api/src/utils/path-validation.ts
import * as path from 'path';
import { promises as fs } from 'fs';

/**
 * Validate that a resolved path stays within allowed directory
 * Returns normalized safe path or throws error
 */
export function validatePathWithin(
  basePath: string,
  userPath: string,
  allowedExtension?: string
): string {
  // 1. Normalize base
  const normalizedBase = path.resolve(basePath);

  // 2. Resolve user path relative to base
  const resolved = path.resolve(normalizedBase, userPath);

  // 3. CRITICAL: Ensure resolved path is WITHIN base
  if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
    throw new Error(`Path traversal attempt detected: ${userPath}`);
  }

  // 4. Optional: Check file extension
  if (allowedExtension && !resolved.endsWith(allowedExtension)) {
    throw new Error(`File must have ${allowedExtension} extension`);
  }

  return resolved;
}

/**
 * Email address components are safe (alphanumeric, dots, hyphens)
 */
export function validateEmailComponent(component: string): boolean {
  // localPart: alphanumeric + dot/hyphen/underscore
  // domain: alphanumeric + dot/hyphen
  return /^[a-zA-Z0-9._-]+$/.test(component);
}
```

**maildirSync.ts: After**
```typescript
import { validatePathWithin, validateEmailComponent } from '../utils/path-validation';

const MAILDIR_ROOT = process.env.MAILDIR_ROOT || '/var/mail';

/**
 * Get the Maildir path for a specific inbox
 * ✅ Validates domain + localPart against path traversal
 */
export function getMaildirPath(domainName: string, localPart: string): string {
  // 1. Validate components (reject anything with .., /, or special chars)
  if (!validateEmailComponent(domainName) || !validateEmailComponent(localPart)) {
    throw new Error(`Invalid domain or localPart: ${domainName}/${localPart}`);
  }

  // 2. Build path
  const basePath = path.join(MAILDIR_ROOT, domainName, localPart);

  // 3. Resolve and validate it stays within MAILDIR_ROOT
  return validatePathWithin(MAILDIR_ROOT, basePath);
}

/**
 * Ensure Maildir directory structure exists
 * ✅ Safe: subdirs are hard-coded, not user-controlled
 */
export async function ensureMaildirStructure(
  domainName: string,
  localPart: string
): Promise<void> {
  const basePath = getMaildirPath(domainName, localPart);

  const subdirs = [
    'new', 'cur', 'tmp',
    '.Sent/new', '.Sent/cur', '.Sent/tmp',
    '.Trash/new', '.Trash/cur', '.Trash/tmp',
    '.Drafts/new', '.Drafts/cur', '.Drafts/tmp',
    '.Spam/new', '.Spam/cur', '.Spam/tmp',
  ];

  for (const subdir of subdirs) {
    const fullPath = path.join(basePath, subdir);
    // Safe: fullPath is deterministic, subdir is hard-coded
    await fs.mkdir(fullPath, { recursive: true });
  }
}
```

**backup.ts: After**
```typescript
import { validatePathWithin } from '../../utils/path-validation';

app.get('/admin/backup/download/:filename', { preHandler: requireBackupAdmin }, async (request, reply) => {
  const { filename } = request.params as { filename: string };

  try {
    // ✅ SAFE: Validates path stays within BACKUP_DIR
    const filePath = validatePathWithin(BACKUP_DIR, filename, '.sql.gz');

    await stat(filePath);
    await recordAudit((request.user as any).userId, 'BACKUP_DOWNLOADED', { filename });

    return reply.sendFile(filename, BACKUP_DIR);
  } catch (error) {
    if ((error as Error).message.includes('Path traversal')) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }
    return reply.status(404).send({ error: 'Backup file not found' });
  }
});

app.delete('/admin/backup/:filename', { preHandler: requireBackupAdmin }, async (request, reply) => {
  const { filename } = request.params as { filename: string };

  try {
    // ✅ SAFE: Validates path stays within BACKUP_DIR
    const filePath = validatePathWithin(BACKUP_DIR, filename);

    const { unlink } = await import('fs/promises');
    await unlink(filePath);

    await recordAudit((request.user as any).userId, 'BACKUP_DELETED', { filename });
    return { success: true, message: 'Backup deleted' };
  } catch (error) {
    if ((error as Error).message.includes('Path traversal')) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }
    return reply.status(404).send({ error: 'Backup file not found' });
  }
});
```

---

## Summary: Implementation Priority

| Priority | Issue | Files | Risk Level | Effort |
|----------|-------|-------|-----------|--------|
| **P0** | Command Injection | postfix-sync.ts, backup.ts | CRITICAL | Medium |
| **P0** | SSRF | webhook-destination.ts | HIGH | Low |
| **P1** | Race Condition (Quota) | quota-service.ts | HIGH | Low |
| **P1** | Broken Access Control | backup.ts, tenant-context.ts | HIGH | Medium |
| **P2** | Path Traversal | maildirSync.ts, backup.ts | HIGH | Low |
| **P2** | XSS (if web UI) | webhook-destination.ts | MEDIUM | Low |

---

## Testing & Validation

**For each fix:**
1. Unit test with malicious inputs (e.g., `../../../etc/passwd`)
2. Integration test with real containers/database
3. Run existing test suite to verify no regression
4. Static analysis: `npm run lint` (if configured)

**OWASP Top 10 Mapping:**
- A01:2021 – Broken Access Control → Issue #4
- A03:2021 – Injection → Issue #1
- A06:2021 – Vulnerable & Outdated Components → (dependency audit)
- A07:2021 – Cross-Site Scripting (XSS) → Issue #5
- A10:2021 – Server-Side Request Forgery → Issue #2

---

## References

- OWASP Top 10 2021: https://owasp.org/Top10/
- CWE Top 25 2023: https://cwe.mitre.org/top25/
- NIST SP 800-53: https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
- Node.js Child Process Security: https://nodejs.org/en/docs/guides/security/#avoid-running-untrusted-user-code
- Prisma Transactions: https://www.prisma.io/docs/concepts/components/prisma-client/transactions

