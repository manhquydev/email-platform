import { CONFIG } from '../shared/config';
import { extractOtpFromText } from '../content/openai-auth-automation-utils';

interface EphemeralInboxResponse {
  id: string;
  token: string;
  address: string;
}

interface EphemeralDomain {
  id: string;
  name: string;
}

interface EphemeralDomainsResponse {
  domains: EphemeralDomain[];
}

interface EphemeralMessage {
  id: string;
  subject?: string;
  textBody?: string;
  htmlBody?: string;
  extractedOtp?: string | null;
  receivedAt: string;
}

interface EphemeralMessagesResponse {
  data: EphemeralMessage[];
}

export interface AutomationInbox {
  inboxId: string;
  inboxToken: string;
  email: string;
  createdAt: number;
}

export interface LatestOtpResult {
  code: string;
  messageId: string;
  receivedAt: number;
}

function generateRandomLocalPart(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const head = 'abcdefghijklmnopqrstuvwxyz';
  const targetLength = Math.max(8, Math.min(length, 24));
  let value = head[Math.floor(Math.random() * head.length)];
  for (let i = 1; i < targetLength; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Request failed ${response.status}: ${body || response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function fetchRandomEphemeralDomainId(): Promise<string | undefined> {
  try {
    const data = await requestJson<EphemeralDomainsResponse>(`${CONFIG.API_URL}/ephemeral/domains`);
    if (!Array.isArray(data.domains) || data.domains.length === 0) {
      return undefined;
    }
    const randomIndex = Math.floor(Math.random() * data.domains.length);
    return data.domains[randomIndex]?.id;
  } catch {
    return undefined;
  }
}

export async function createAutomationInbox(): Promise<AutomationInbox> {
  const maxAttempts = 3;
  let lastError: unknown;
  let data: EphemeralInboxResponse | null = null;
  const randomDomainId = await fetchRandomEphemeralDomainId();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const localPart = generateRandomLocalPart();
    const payload = {
      expiryHours: 2,
      localPart,
      ...(randomDomainId ? { domainId: randomDomainId } : {}),
    };
    try {
      data = await requestJson<EphemeralInboxResponse>(`${CONFIG.API_URL}/ephemeral/inbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      break;
    } catch (error) {
      lastError = error;
      const message = String((error as Error)?.message || '').toLowerCase();
      const isLocalPartConflict = /request failed (400|409)/.test(message) && /(alias|localpart|local part|taken|already|exists)/.test(message);
      if (!isLocalPartConflict || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  if (!data) {
    throw (lastError instanceof Error ? lastError : new Error('Failed to create automation inbox'));
  }

  return {
    inboxId: data.id,
    inboxToken: data.token,
    email: data.address,
    createdAt: Date.now(),
  };
}

async function fetchLatestOtp(
  inboxToken: string,
  sinceTimestamp: number,
  excludeMessageIds: string[] = [],
): Promise<LatestOtpResult | null> {
  const url = `${CONFIG.API_URL}/ephemeral/inbox/${encodeURIComponent(inboxToken)}/messages?limit=20&offset=0`;
  const data = await requestJson<EphemeralMessagesResponse>(url);
  if (!Array.isArray(data.data) || data.data.length === 0) return null;

  const excludedIds = new Set(excludeMessageIds.filter(Boolean));
  const sorted = [...data.data].sort((a, b) => {
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });

  for (const message of sorted) {
    if (excludedIds.has(message.id)) continue;

    const receivedAt = new Date(message.receivedAt).getTime();
    if (!Number.isFinite(receivedAt)) continue;
    if (Number.isFinite(sinceTimestamp) && receivedAt <= sinceTimestamp) continue;

    const otp = message.extractedOtp || extractOtpFromText(
      `${message.subject ?? ''} ${message.textBody ?? ''} ${message.htmlBody ?? ''}`,
    );
    if (!otp) continue;

    return {
      code: otp,
      messageId: message.id,
      receivedAt,
    };
  }

  return null;
}

export async function pollLatestOtp(params: {
  inboxToken: string;
  sinceTimestamp: number;
  timeoutMs?: number;
  pollIntervalMs?: number;
  excludeMessageIds?: string[];
}): Promise<LatestOtpResult | null> {
  const timeoutMs = params.timeoutMs ?? 90000;
  const pollIntervalMs = params.pollIntervalMs ?? 2500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const otp = await fetchLatestOtp(
      params.inboxToken,
      params.sinceTimestamp,
      params.excludeMessageIds,
    );
    if (otp) return otp;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return null;
}
