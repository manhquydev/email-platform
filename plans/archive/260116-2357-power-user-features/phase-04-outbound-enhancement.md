# Phase 04: Outbound Email Enhancement

**Duration:** Week 4-5
**Priority:** High
**Dependencies:** None (can run parallel with Phase 01-03)

## 1. Objective

Cải thiện hệ thống outbound email:
- DKIM signing cho better deliverability
- Reply functionality từ inbox address
- DNS record display cho user setup
- Bounce/complaint handling improvement

## 2. Current State

### Existing Implementation
- `OutboundMessage` model với status tracking
- `DomainDkim` model (empty, keypair chưa generate)
- `outboundRoutes.ts` với send endpoint
- `outboundService` (basic SMTP sending)
- Credit-based sending

### Gaps
- DKIM signing chưa implement
- Không có reply functionality
- DNS record không hiển thị cho user
- Keypair generation chưa có

## 3. Tasks

### 3.1 DKIM Key Generation Service

**File:** `services/api/src/services/outbound/dkim-manager.ts` (new)

```typescript
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { encrypt, decrypt } from '../../utils/crypto';

const DEFAULT_SELECTOR = process.env.DKIM_SELECTOR || 'ephemera2026';
const KEY_SIZE = parseInt(process.env.DKIM_KEY_SIZE || '2048', 10);

interface DkimKeyPair {
    privateKey: string;
    publicKey: string;
    selector: string;
    dnsRecord: string;
}

/**
 * Generate RSA keypair for DKIM signing
 */
export function generateDkimKeyPair(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: KEY_SIZE,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });

    return { privateKey, publicKey };
}

/**
 * Extract public key for DNS record (remove headers and newlines)
 */
export function extractPublicKeyForDns(publicKeyPem: string): string {
    return publicKeyPem
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\r?\n/g, '');
}

/**
 * Build DNS TXT record value
 */
export function buildDkimDnsRecord(publicKey: string): string {
    const publicKeyBase64 = extractPublicKeyForDns(publicKey);
    return `v=DKIM1; k=rsa; p=${publicKeyBase64}`;
}

/**
 * Get or create DKIM keypair for domain
 */
export async function getOrCreateDomainDkim(domainId: string): Promise<DkimKeyPair> {
    // Check existing
    let dkim = await prisma.domainDkim.findUnique({
        where: { domainId },
    });

    if (!dkim) {
        // Generate new keypair
        const { privateKey, publicKey } = generateDkimKeyPair();

        // Encrypt private key before storage
        const encryptedPrivateKey = encrypt(privateKey);

        dkim = await prisma.domainDkim.create({
            data: {
                domainId,
                selector: DEFAULT_SELECTOR,
                privateKey: encryptedPrivateKey,
                publicKey,
                algorithm: 'rsa-sha256',
                keySize: KEY_SIZE,
            },
        });
    }

    // Decrypt private key for use
    const decryptedPrivateKey = decrypt(dkim.privateKey);

    return {
        privateKey: decryptedPrivateKey,
        publicKey: dkim.publicKey,
        selector: dkim.selector,
        dnsRecord: buildDkimDnsRecord(dkim.publicKey),
    };
}

/**
 * Get DKIM info for domain (public only, for UI)
 */
export async function getDomainDkimInfo(domainId: string): Promise<{
    hasKey: boolean;
    selector: string;
    dnsRecord: string;
    dnsHost: string;
    createdAt: Date | null;
} | null> {
    const dkim = await prisma.domainDkim.findUnique({
        where: { domainId },
        include: { domain: true },
    });

    if (!dkim) {
        return {
            hasKey: false,
            selector: DEFAULT_SELECTOR,
            dnsRecord: '',
            dnsHost: `${DEFAULT_SELECTOR}._domainkey`,
            createdAt: null,
        };
    }

    return {
        hasKey: true,
        selector: dkim.selector,
        dnsRecord: buildDkimDnsRecord(dkim.publicKey),
        dnsHost: `${dkim.selector}._domainkey.${dkim.domain.name}`,
        createdAt: dkim.createdAt,
    };
}

/**
 * Rotate DKIM key for domain
 */
export async function rotateDomainDkim(domainId: string): Promise<DkimKeyPair> {
    const { privateKey, publicKey } = generateDkimKeyPair();
    const encryptedPrivateKey = encrypt(privateKey);

    const dkim = await prisma.domainDkim.upsert({
        where: { domainId },
        create: {
            domainId,
            selector: DEFAULT_SELECTOR,
            privateKey: encryptedPrivateKey,
            publicKey,
            algorithm: 'rsa-sha256',
            keySize: KEY_SIZE,
        },
        update: {
            privateKey: encryptedPrivateKey,
            publicKey,
            rotatedAt: new Date(),
        },
    });

    return {
        privateKey,
        publicKey: dkim.publicKey,
        selector: dkim.selector,
        dnsRecord: buildDkimDnsRecord(dkim.publicKey),
    };
}

/**
 * Verify DKIM DNS record is properly set
 */
export async function verifyDkimDns(domainName: string, selector: string): Promise<{
    valid: boolean;
    found: string | null;
    expected: string;
    error?: string;
}> {
    const dkim = await prisma.domainDkim.findFirst({
        where: {
            domain: { name: domainName },
            selector,
        },
    });

    if (!dkim) {
        return {
            valid: false,
            found: null,
            expected: '',
            error: 'DKIM key not generated for this domain',
        };
    }

    const expectedRecord = buildDkimDnsRecord(dkim.publicKey);
    const dnsHost = `${selector}._domainkey.${domainName}`;

    try {
        const { Resolver } = await import('dns').then(m => m.promises);
        const resolver = new Resolver();

        const records = await resolver.resolveTxt(dnsHost);
        const found = records.flat().join('');

        // Compare (ignoring whitespace differences)
        const normalizedFound = found.replace(/\s+/g, '');
        const normalizedExpected = expectedRecord.replace(/\s+/g, '');

        return {
            valid: normalizedFound === normalizedExpected,
            found,
            expected: expectedRecord,
        };
    } catch (error: any) {
        return {
            valid: false,
            found: null,
            expected: expectedRecord,
            error: error.code === 'ENOTFOUND' ? 'DNS record not found' : error.message,
        };
    }
}
```

### 3.2 DKIM Signer

**File:** `services/api/src/services/outbound/dkim-signer.ts` (new)

```typescript
import crypto from 'crypto';

interface DkimSignOptions {
    privateKey: string;
    selector: string;
    domain: string;
    headers: Record<string, string>;
    body: string;
}

/**
 * Create DKIM signature for email
 */
export function createDkimSignature(options: DkimSignOptions): string {
    const { privateKey, selector, domain, headers, body } = options;

    // Canonicalize body (simple canonicalization)
    const canonicalizedBody = body.replace(/\r?\n/g, '\r\n').trimEnd() + '\r\n';

    // Hash body
    const bodyHash = crypto
        .createHash('sha256')
        .update(canonicalizedBody)
        .digest('base64');

    // Headers to sign (standard set)
    const headersToSign = ['from', 'to', 'subject', 'date', 'message-id'];
    const signedHeaderNames: string[] = [];
    let headerData = '';

    for (const headerName of headersToSign) {
        const value = headers[headerName] || headers[headerName.toLowerCase()];
        if (value) {
            signedHeaderNames.push(headerName);
            headerData += `${headerName}:${value}\r\n`;
        }
    }

    // Build DKIM header (without signature)
    const timestamp = Math.floor(Date.now() / 1000);
    const dkimHeader = [
        `v=1`,
        `a=rsa-sha256`,
        `c=relaxed/simple`,
        `d=${domain}`,
        `s=${selector}`,
        `t=${timestamp}`,
        `bh=${bodyHash}`,
        `h=${signedHeaderNames.join(':')}`,
        `b=`, // Placeholder for signature
    ].join('; ');

    // Add DKIM header to data to sign
    headerData += `dkim-signature:${dkimHeader}`;

    // Sign
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(headerData);
    const signature = signer.sign(privateKey, 'base64');

    // Return complete DKIM-Signature header
    return `DKIM-Signature: ${dkimHeader}${signature}`;
}

/**
 * Apply DKIM signature to raw email
 */
export function signEmail(
    rawEmail: string,
    privateKey: string,
    selector: string,
    domain: string
): string {
    // Split headers and body
    const parts = rawEmail.split(/\r?\n\r?\n/);
    const headerSection = parts[0];
    const body = parts.slice(1).join('\r\n\r\n');

    // Parse headers
    const headers: Record<string, string> = {};
    const headerLines = headerSection.split(/\r?\n/);
    let currentHeader = '';
    let currentValue = '';

    for (const line of headerLines) {
        if (line.startsWith(' ') || line.startsWith('\t')) {
            // Continuation
            currentValue += ' ' + line.trim();
        } else {
            if (currentHeader) {
                headers[currentHeader.toLowerCase()] = currentValue;
            }
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                currentHeader = line.slice(0, colonIndex);
                currentValue = line.slice(colonIndex + 1).trim();
            }
        }
    }
    if (currentHeader) {
        headers[currentHeader.toLowerCase()] = currentValue;
    }

    // Create signature
    const dkimSignature = createDkimSignature({
        privateKey,
        selector,
        domain,
        headers,
        body,
    });

    // Prepend DKIM-Signature header
    return `${dkimSignature}\r\n${rawEmail}`;
}
```

### 3.3 Update Outbound Service

**File:** `services/api/src/services/outbound/index.ts` (update)

```typescript
import nodemailer from 'nodemailer';
import { getOrCreateDomainDkim } from './dkim-manager';
import { signEmail } from './dkim-signer';
import { prisma } from '../../lib/prisma';

interface SendEmailOptions {
    senderName?: string;
    replyTo?: string;
    headers?: Record<string, string>;
    useDkim?: boolean;
}

class OutboundService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.OUTBOUND_SMTP_HOST,
            port: parseInt(process.env.OUTBOUND_SMTP_PORT || '587', 10),
            secure: process.env.OUTBOUND_SMTP_SECURE === 'true',
            auth: {
                user: process.env.OUTBOUND_SMTP_USER,
                pass: process.env.OUTBOUND_SMTP_PASS,
            },
        });
    }

    async sendEmail(
        from: string,
        to: string,
        subject: string,
        text?: string,
        html?: string,
        attachments?: any[],
        options: SendEmailOptions = {}
    ) {
        const { senderName, replyTo, headers = {}, useDkim = true } = options;

        // Get domain for DKIM
        const domainName = from.split('@')[1];
        const domain = await prisma.domain.findUnique({
            where: { name: domainName },
        });

        let dkimOptions = undefined;

        // Only use DKIM for verified domains
        if (useDkim && domain?.status === 'VERIFIED') {
            try {
                const dkim = await getOrCreateDomainDkim(domain.id);
                dkimOptions = {
                    domainName,
                    keySelector: dkim.selector,
                    privateKey: dkim.privateKey,
                };
            } catch (error) {
                console.warn('[Outbound] DKIM setup failed:', error);
            }
        }

        const mailOptions: nodemailer.SendMailOptions = {
            from: senderName ? `"${senderName}" <${from}>` : from,
            to,
            subject,
            text,
            html,
            attachments,
            replyTo,
            headers,
            dkim: dkimOptions,
        };

        const info = await this.transporter.sendMail(mailOptions);

        return {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
        };
    }

    /**
     * Send reply to a message
     */
    async sendReply(
        originalMessageId: string,
        userId: string,
        replyText: string,
        replyHtml?: string
    ) {
        // Get original message
        const originalMessage = await prisma.message.findUnique({
            where: { id: originalMessageId },
            include: {
                inbox: {
                    include: { domain: true },
                },
            },
        });

        if (!originalMessage) {
            throw new Error('Original message not found');
        }

        if (!originalMessage.inbox.ownerId || originalMessage.inbox.ownerId !== userId) {
            throw new Error('You do not own this inbox');
        }

        if (originalMessage.inbox.domain.status !== 'VERIFIED') {
            throw new Error('Domain not verified');
        }

        if (!originalMessage.fromAddress) {
            throw new Error('Cannot reply: no sender address');
        }

        // Build reply
        const replyFrom = originalMessage.toAddress ||
            `${originalMessage.inbox.localPart}@${originalMessage.inbox.domain.name}`;
        const replyTo = originalMessage.fromAddress;
        const replySubject = originalMessage.subject?.startsWith('Re:')
            ? originalMessage.subject
            : `Re: ${originalMessage.subject || '(no subject)'}`;

        // Build In-Reply-To and References headers
        const headers: Record<string, string> = {};
        if (originalMessage.messageId) {
            headers['In-Reply-To'] = originalMessage.messageId;
            headers['References'] = originalMessage.messageId;
        }

        // Send
        const result = await this.sendEmail(
            replyFrom,
            replyTo,
            replySubject,
            replyText,
            replyHtml,
            undefined,
            { headers, useDkim: true }
        );

        // Create outbound message record
        const outboundMsg = await prisma.outboundMessage.create({
            data: {
                userId,
                domainId: originalMessage.inbox.domain.id,
                inboxId: originalMessage.inbox.id,
                fromAddress: replyFrom,
                toAddress: replyTo,
                subject: replySubject,
                messageId: result.messageId,
                status: 'SENT',
                sentAt: new Date(),
                metadata: {
                    inReplyTo: originalMessageId,
                    originalMessageId: originalMessage.messageId,
                },
            },
        });

        return {
            success: true,
            messageId: result.messageId,
            outboundId: outboundMsg.id,
        };
    }
}

export const outboundService = new OutboundService();
```

### 3.4 DKIM Routes

**File:** `services/api/src/routes/dkim.ts` (new)

```typescript
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
    getOrCreateDomainDkim,
    getDomainDkimInfo,
    rotateDomainDkim,
    verifyDkimDns,
} from '../services/outbound/dkim-manager';

export async function dkimRoutes(app: FastifyInstance) {
    // Get DKIM info for domain
    app.get('/domains/:id/dkim', { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const domain = await prisma.domain.findFirst({
            where: { id, ownerId: user.userId },
        });

        if (!domain) {
            return reply.status(404).send({ error: 'Domain not found' });
        }

        const dkimInfo = await getDomainDkimInfo(id);

        return {
            domain: domain.name,
            ...dkimInfo,
            instructions: {
                type: 'TXT',
                host: dkimInfo?.dnsHost || '',
                value: dkimInfo?.dnsRecord || '',
                ttl: 3600,
            },
        };
    });

    // Generate DKIM keypair for domain
    app.post('/domains/:id/dkim/generate', { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const domain = await prisma.domain.findFirst({
            where: { id, ownerId: user.userId },
        });

        if (!domain) {
            return reply.status(404).send({ error: 'Domain not found' });
        }

        const dkim = await getOrCreateDomainDkim(id);

        return {
            success: true,
            selector: dkim.selector,
            dnsRecord: dkim.dnsRecord,
            dnsHost: `${dkim.selector}._domainkey.${domain.name}`,
        };
    });

    // Rotate DKIM key
    app.post('/domains/:id/dkim/rotate', { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const domain = await prisma.domain.findFirst({
            where: { id, ownerId: user.userId },
        });

        if (!domain) {
            return reply.status(404).send({ error: 'Domain not found' });
        }

        const dkim = await rotateDomainDkim(id);

        return {
            success: true,
            selector: dkim.selector,
            dnsRecord: dkim.dnsRecord,
            dnsHost: `${dkim.selector}._domainkey.${domain.name}`,
            message: 'DKIM key rotated. Update your DNS record.',
        };
    });

    // Verify DKIM DNS record
    app.post('/domains/:id/dkim/verify', { preHandler: app.authenticate }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { id } = request.params as { id: string };

        const domain = await prisma.domain.findFirst({
            where: { id, ownerId: user.userId },
            include: { dkim: true },
        });

        if (!domain) {
            return reply.status(404).send({ error: 'Domain not found' });
        }

        if (!domain.dkim) {
            return reply.status(400).send({ error: 'DKIM not configured. Generate key first.' });
        }

        const result = await verifyDkimDns(domain.name, domain.dkim.selector);

        return result;
    });
}
```

### 3.5 Reply Route

**File:** `services/api/src/routes/outbound.ts` (add)

```typescript
// Reply to a message
app.post('/messages/:id/reply', { preHandler: app.authenticate }, async (request, reply) => {
    const user = request.user as { userId: string };
    const { id } = request.params as { id: string };

    const bodySchema = z.object({
        text: z.string().min(1),
        html: z.string().optional(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
    }

    // Check credits
    const CREDIT_COST = 1;
    const { CreditService } = await import('../services/credit.service');
    const { CreditTransactionType } = await import('@prisma/client');

    try {
        await CreditService.deductCredits(
            user.userId,
            CREDIT_COST,
            CreditTransactionType.USAGE,
            `Reply to message ${id}`,
            {}
        );
    } catch (error: any) {
        if (error.message === 'Insufficient credits') {
            return reply.status(402).send({ error: 'Insufficient credits' });
        }
        throw error;
    }

    try {
        const result = await outboundService.sendReply(
            id,
            user.userId,
            parsed.data.text,
            parsed.data.html
        );

        return result;
    } catch (error: any) {
        // Refund on failure
        await CreditService.addCredits(
            user.userId,
            CREDIT_COST,
            CreditTransactionType.REFUND,
            `Refund for failed reply`,
            {}
        );

        return reply.status(400).send({ error: error.message });
    }
});
```

### 3.6 Frontend DKIM Setup Component

**File:** `services/web/src/components/domain/DkimSetup.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Shield, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../utils/api';

interface DkimSetupProps {
    domainId: string;
    domainName: string;
}

export function DkimSetup({ domainId, domainName }: DkimSetupProps) {
    const [dkimInfo, setDkimInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [verifyResult, setVerifyResult] = useState<any>(null);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        loadDkimInfo();
    }, [domainId]);

    const loadDkimInfo = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/domains/${domainId}/dkim`);
            setDkimInfo(data);
        } catch (error) {
            console.error('Failed to load DKIM info:', error);
        }
        setLoading(false);
    };

    const generateKey = async () => {
        try {
            const data = await api.post(`/domains/${domainId}/dkim/generate`);
            setDkimInfo(prev => ({ ...prev, ...data, hasKey: true }));
        } catch (error) {
            console.error('Failed to generate DKIM key:', error);
        }
    };

    const verifyDns = async () => {
        setVerifying(true);
        try {
            const result = await api.post(`/domains/${domainId}/dkim/verify`);
            setVerifyResult(result);
        } catch (error) {
            console.error('Failed to verify DKIM:', error);
        }
        setVerifying(false);
    };

    const copyToClipboard = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(null), 2000);
    };

    if (loading) {
        return <div className="animate-pulse bg-slate-800 h-32 rounded-xl" />;
    }

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Shield className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-medium text-white">DKIM Configuration</h3>
                    <p className="text-sm text-slate-400">Sign outgoing emails for better deliverability</p>
                </div>
            </div>

            {!dkimInfo?.hasKey ? (
                <div className="text-center py-8">
                    <p className="text-slate-400 mb-4">No DKIM key generated yet</p>
                    <button
                        onClick={generateKey}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                    >
                        Generate DKIM Key
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* DNS Record Instructions */}
                    <div className="bg-slate-900/50 rounded-lg p-4">
                        <p className="text-sm text-slate-400 mb-2">Add this TXT record to your DNS:</p>

                        <div className="space-y-3">
                            {/* Host */}
                            <div>
                                <label className="text-xs text-slate-500">Host / Name</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="flex-1 bg-slate-800 px-3 py-2 rounded text-sm text-green-400 font-mono">
                                        {dkimInfo.instructions.host}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(dkimInfo.instructions.host, 'host')}
                                        className="p-2 hover:bg-slate-700 rounded"
                                    >
                                        {copied === 'host' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Value */}
                            <div>
                                <label className="text-xs text-slate-500">Value</label>
                                <div className="flex items-start gap-2 mt-1">
                                    <code className="flex-1 bg-slate-800 px-3 py-2 rounded text-xs text-green-400 font-mono break-all">
                                        {dkimInfo.instructions.value}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(dkimInfo.instructions.value, 'value')}
                                        className="p-2 hover:bg-slate-700 rounded shrink-0"
                                    >
                                        {copied === 'value' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Verify Button */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={verifyDns}
                            disabled={verifying}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
                            Verify DNS Record
                        </button>

                        {verifyResult && (
                            <div className={`flex items-center gap-2 ${verifyResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                                {verifyResult.valid ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>DKIM verified!</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-4 h-4" />
                                        <span>{verifyResult.error || 'Record not found'}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
```

### 3.7 Reply Button Component

**File:** `services/web/src/components/message/ReplyButton.tsx`

```tsx
import { useState } from 'react';
import { Reply, Send, X } from 'lucide-react';
import { api } from '../../utils/api';

interface ReplyButtonProps {
    messageId: string;
    originalFrom: string;
    originalSubject: string;
    onSuccess?: () => void;
}

export function ReplyButton({ messageId, originalFrom, originalSubject, onSuccess }: ReplyButtonProps) {
    const [showModal, setShowModal] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSend = async () => {
        if (!replyText.trim()) return;

        setSending(true);
        setError(null);

        try {
            await api.post(`/messages/${messageId}/reply`, {
                text: replyText,
            });
            setShowModal(false);
            setReplyText('');
            onSuccess?.();
        } catch (err: any) {
            setError(err.message || 'Failed to send reply');
        }

        setSending(false);
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="Reply"
            >
                <Reply className="w-5 h-5" />
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h3 className="font-medium text-white">Reply to Email</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 hover:bg-slate-700 rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                            <div className="text-sm text-slate-400">
                                <p><span className="text-slate-500">To:</span> {originalFrom}</p>
                                <p><span className="text-slate-500">Subject:</span> Re: {originalSubject}</p>
                            </div>

                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write your reply..."
                                className="w-full h-48 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white resize-none focus:outline-none focus:border-indigo-500"
                            />

                            {error && (
                                <p className="text-red-400 text-sm">{error}</p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={sending || !replyText.trim()}
                                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                                {sending ? 'Sending...' : 'Send Reply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
```

## 4. Testing

### Unit Tests

```typescript
describe("DKIM Manager", () => {
    it("should generate valid RSA keypair", () => {
        const { privateKey, publicKey } = generateDkimKeyPair();
        expect(privateKey).toContain('BEGIN PRIVATE KEY');
        expect(publicKey).toContain('BEGIN PUBLIC KEY');
    });

    it("should build valid DNS record", () => {
        const record = buildDkimDnsRecord(mockPublicKey);
        expect(record).toContain('v=DKIM1');
        expect(record).toContain('k=rsa');
        expect(record).toContain('p=');
    });
});

describe("DKIM Signer", () => {
    it("should create valid signature", () => {
        const signature = createDkimSignature({
            privateKey: mockPrivateKey,
            selector: 'test',
            domain: 'example.com',
            headers: { from: 'test@example.com', subject: 'Test' },
            body: 'Test body',
        });

        expect(signature).toContain('DKIM-Signature:');
        expect(signature).toContain('b='); // Has signature
    });
});
```

## 5. Acceptance Criteria

- [ ] DKIM key generation works
- [ ] DKIM key stored encrypted in database
- [ ] DNS record displayed correctly
- [ ] DNS verification works
- [ ] Outgoing emails are DKIM signed
- [ ] DKIM signature validates (use online tools)
- [ ] Reply functionality works
- [ ] Reply includes correct In-Reply-To header
- [ ] Credits deducted for replies
- [ ] Frontend DKIM setup component works
- [ ] Reply modal works
