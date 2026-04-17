import { CONFIG } from '../shared/config';
import { extractOtpFromText } from '../content/openai-auth-automation-utils';
import { generateRandomLocalPart } from '../content/openai-auth-random-profile';

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
  inboxToken?: string;
  email: string;
  createdAt: number;
}

export interface LatestOtpResult {
  code: string;
  messageId: string;
  receivedAt: number;
}

export interface LatestLinkResult {
  url: string;
  messageId: string;
  receivedAt: number;
}

export interface CreateAutomationInboxOptions {
  expiryHours?: number;
  allowedDomainIds?: string[];
  accessToken?: string | null;
}

const DEFAULT_FIREWORKS_CONFIRM_LINK_PATTERN = /https:\/\/app\.fireworks\.ai\/signup\/confirm\?[^\s"'<>]+/i;

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const retryAfterHeader = response.headers?.get?.('retry-after');
    const retryAfterHint = retryAfterHeader ? ` (retry-after: ${retryAfterHeader})` : '';
    throw new Error(`Request failed ${response.status}${retryAfterHint}: ${body || response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function sanitizeExpiryHours(value: number | undefined): number {
  if (!Number.isFinite(value)) return 2;
  return Math.max(1, Math.min(24, Math.floor(value as number)));
}

async function fetchRandomEphemeralDomainId(allowedDomainIds: string[] = []): Promise<string | undefined> {
  try {
    const data = await requestJson<EphemeralDomainsResponse>(`${CONFIG.API_URL}/ephemeral/domains`);
    if (!Array.isArray(data.domains) || data.domains.length === 0) {
      return undefined;
    }
    let candidates = data.domains;
    if (allowedDomainIds.length > 0) {
      const allowSet = new Set(allowedDomainIds.map((id) => String(id)));
      candidates = data.domains.filter((domain) => allowSet.has(domain.id));
    }
    if (candidates.length === 0) return undefined;

    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex]?.id;
  } catch {
    return undefined;
  }
}

export async function createAutomationInbox(options?: CreateAutomationInboxOptions): Promise<AutomationInbox> {
  const maxAttempts = 3;
  let lastError: unknown;
  let data: EphemeralInboxResponse | null = null;
  const randomDomainId = await fetchRandomEphemeralDomainId(options?.allowedDomainIds || []);
  const expiryHours = sanitizeExpiryHours(options?.expiryHours);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const localPart = generateRandomLocalPart();
    const payload = {
      expiryHours,
      localPart,
      ...(randomDomainId ? { domainId: randomDomainId } : {}),
    };
    try {
      data = await requestJson<EphemeralInboxResponse>(`${CONFIG.API_URL}/ephemeral/inbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options?.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
        },
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

function extractLatestOtpFromMessages(
  messages: EphemeralMessage[] | undefined,
  sinceTimestamp: number,
  excludeMessageIds: string[] = [],
): LatestOtpResult | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const excludedIds = new Set(excludeMessageIds.filter(Boolean));
  const sorted = [...messages].sort((a, b) => {
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

function normalizeMessageContent(raw: string): string {
  return raw.replace(/&amp;/gi, '&');
}

function toGlobalRegex(pattern: RegExp): RegExp {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

function extractLatestLinkFromMessages(
  messages: EphemeralMessage[] | undefined,
  sinceTimestamp: number,
  excludeMessageIds: string[] = [],
  urlPattern?: RegExp,
): LatestLinkResult | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const pattern = urlPattern || DEFAULT_FIREWORKS_CONFIRM_LINK_PATTERN;
  const excludedIds = new Set(excludeMessageIds.filter(Boolean));
  const sorted = [...messages].sort((a, b) => {
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });

  for (const message of sorted) {
    if (excludedIds.has(message.id)) continue;

    const receivedAt = new Date(message.receivedAt).getTime();
    if (!Number.isFinite(receivedAt)) continue;
    if (Number.isFinite(sinceTimestamp) && receivedAt <= sinceTimestamp) continue;

    const content = normalizeMessageContent(
      `${message.subject ?? ''}\n${message.textBody ?? ''}\n${message.htmlBody ?? ''}`,
    );
    const candidates = Array.from(content.matchAll(toGlobalRegex(pattern)))
      .map((match) => String(match[0] || '').replace(/[)"'<>]+$/g, '').trim())
      .filter(Boolean);

    if (candidates.length === 0) continue;

    return {
      url: candidates[0],
      messageId: message.id,
      receivedAt,
    };
  }

  return null;
}

async function fetchLatestOtpByInboxToken(
  inboxToken: string,
  sinceTimestamp: number,
  excludeMessageIds: string[] = [],
): Promise<LatestOtpResult | null> {
  const url = `${CONFIG.API_URL}/ephemeral/inbox/${encodeURIComponent(inboxToken)}/messages?limit=20&offset=0`;
  const data = await requestJson<EphemeralMessagesResponse>(url);
  return extractLatestOtpFromMessages(data.data, sinceTimestamp, excludeMessageIds);
}

async function fetchLatestOtpByInboxId(
  inboxId: string,
  accessToken: string,
  sinceTimestamp: number,
  excludeMessageIds: string[] = [],
): Promise<LatestOtpResult | null> {
  const url = `${CONFIG.API_URL}/inboxes/${encodeURIComponent(inboxId)}/messages?limit=20&offset=0`;
  const data = await requestJson<EphemeralMessagesResponse>(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return extractLatestOtpFromMessages(data.data, sinceTimestamp, excludeMessageIds);
}

async function fetchLatestLinkByInboxToken(
  inboxToken: string,
  sinceTimestamp: number,
  excludeMessageIds: string[] = [],
  urlPattern?: RegExp,
): Promise<LatestLinkResult | null> {
  const url = `${CONFIG.API_URL}/ephemeral/inbox/${encodeURIComponent(inboxToken)}/messages?limit=20&offset=0`;
  const data = await requestJson<EphemeralMessagesResponse>(url);
  return extractLatestLinkFromMessages(data.data, sinceTimestamp, excludeMessageIds, urlPattern);
}

async function fetchLatestLinkByInboxId(
  inboxId: string,
  accessToken: string,
  sinceTimestamp: number,
  excludeMessageIds: string[] = [],
  urlPattern?: RegExp,
): Promise<LatestLinkResult | null> {
  const url = `${CONFIG.API_URL}/inboxes/${encodeURIComponent(inboxId)}/messages?limit=20&offset=0`;
  const data = await requestJson<EphemeralMessagesResponse>(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return extractLatestLinkFromMessages(data.data, sinceTimestamp, excludeMessageIds, urlPattern);
}

export async function pollLatestOtp(params: {
  inboxToken?: string;
  inboxId?: string;
  accessToken?: string | null;
  sinceTimestamp: number;
  timeoutMs?: number;
  pollIntervalMs?: number;
  excludeMessageIds?: string[];
}): Promise<LatestOtpResult | null> {
  if (!params.inboxToken && (!params.inboxId || !params.accessToken)) {
    return null;
  }

  const timeoutMs = params.timeoutMs ?? 90000;
  const pollIntervalMs = params.pollIntervalMs ?? 2500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const otp = params.inboxToken
      ? await fetchLatestOtpByInboxToken(
        params.inboxToken,
        params.sinceTimestamp,
        params.excludeMessageIds,
      )
      : await fetchLatestOtpByInboxId(
        params.inboxId!,
        params.accessToken!,
        params.sinceTimestamp,
        params.excludeMessageIds,
      );
    if (otp) return otp;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return null;
}

export async function pollLatestLink(params: {
  inboxToken?: string;
  inboxId?: string;
  accessToken?: string | null;
  sinceTimestamp: number;
  timeoutMs?: number;
  pollIntervalMs?: number;
  excludeMessageIds?: string[];
  urlPattern?: string;
}): Promise<LatestLinkResult | null> {
  if (!params.inboxToken && (!params.inboxId || !params.accessToken)) {
    return null;
  }

  const timeoutMs = params.timeoutMs ?? 120000;
  const pollIntervalMs = params.pollIntervalMs ?? 2500;
  const deadline = Date.now() + timeoutMs;

  let compiledPattern: RegExp | undefined;
  if (params.urlPattern) {
    try {
      compiledPattern = new RegExp(params.urlPattern, 'i');
    } catch {
      compiledPattern = undefined;
    }
  }

  while (Date.now() < deadline) {
    const link = params.inboxToken
      ? await fetchLatestLinkByInboxToken(
        params.inboxToken,
        params.sinceTimestamp,
        params.excludeMessageIds,
        compiledPattern,
      )
      : await fetchLatestLinkByInboxId(
        params.inboxId!,
        params.accessToken!,
        params.sinceTimestamp,
        params.excludeMessageIds,
        compiledPattern,
      );
    if (link) return link;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return null;
}
