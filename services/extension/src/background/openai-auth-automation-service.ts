import { CONFIG } from '../shared/config';
import { extractOtpFromText } from '../content/openai-auth-automation-utils';

interface EphemeralInboxResponse {
  id: string;
  token: string;
  address: string;
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

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Request failed ${response.status}: ${body || response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function createAutomationInbox(): Promise<AutomationInbox> {
  const data = await requestJson<EphemeralInboxResponse>(`${CONFIG.API_URL}/ephemeral/inbox`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiryHours: 2 }),
  });

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
