import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutomationInbox, pollLatestOtp } from './openai-auth-automation-service';
import { mockFetch, resetFetchMock } from '../__tests__/mocks/fetch';

function mockMessagesResponse(messages: Array<{
  id: string;
  receivedAt: string;
  extractedOtp?: string | null;
  subject?: string;
  textBody?: string;
  htmlBody?: string;
}>): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: messages }),
    text: () => Promise.resolve(''),
  });
}

function mockDomainsResponse(domains: Array<{ id: string; name: string }>): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ domains }),
    text: () => Promise.resolve(''),
  });
}

describe('openai-auth-automation-service', () => {
  beforeEach(() => {
    resetFetchMock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates automation inbox with generated localPart', async () => {
    mockDomainsResponse([{ id: 'domain-1', name: 'alpha.test' }]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        id: 'inbox-1',
        token: 'token-1',
        address: 'alex.nguyen@example.com',
      }),
      text: () => Promise.resolve(''),
    });

    const result = await createAutomationInbox();
    expect(result.inboxId).toBe('inbox-1');
    expect(result.inboxToken).toBe('token-1');
    expect(result.email).toBe('alex.nguyen@example.com');

    const [inboxUrl, options] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(String(inboxUrl)).toContain('/ephemeral/inbox');
    const payload = JSON.parse(String(options.body || '{}')) as Record<string, unknown>;
    expect(payload.expiryHours).toBe(2);
    expect(typeof payload.localPart).toBe('string');
    expect(String(payload.localPart)).toMatch(/^[a-z0-9._]{6,24}$/);
    expect(payload.domainId).toBe('domain-1');
  });

  it('retries create inbox when localPart conflicts', async () => {
    mockDomainsResponse([{ id: 'domain-1', name: 'alpha.test' }]);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('{"error":"alias already exists"}'),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        id: 'inbox-2',
        token: 'token-2',
        address: 'retry.success@example.com',
      }),
      text: () => Promise.resolve(''),
    });

    const result = await createAutomationInbox();
    expect(result.inboxId).toBe('inbox-2');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('falls back to default API behavior when domain lookup fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('internal'),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        id: 'inbox-3',
        token: 'token-3',
        address: 'fallback@example.com',
      }),
      text: () => Promise.resolve(''),
    });

    const result = await createAutomationInbox();
    expect(result.inboxId).toBe('inbox-3');

    const [, options] = mockFetch.mock.calls[1] as [string, RequestInit];
    const payload = JSON.parse(String(options.body || '{}')) as Record<string, unknown>;
    expect(payload.domainId).toBeUndefined();
  });

  it('skips excluded message ids and returns next newest otp', async () => {
    mockMessagesResponse([
      { id: 'msg-newest', receivedAt: '2026-01-01T00:00:03.000Z', extractedOtp: '111111' },
      { id: 'msg-next', receivedAt: '2026-01-01T00:00:02.000Z', extractedOtp: '222222' },
    ]);

    const result = await pollLatestOtp({
      inboxToken: 'token-1',
      sinceTimestamp: Date.parse('2026-01-01T00:00:00.000Z'),
      timeoutMs: 1000,
      pollIntervalMs: 100,
      excludeMessageIds: ['msg-newest'],
    });

    expect(result).toEqual({
      code: '222222',
      messageId: 'msg-next',
      receivedAt: Date.parse('2026-01-01T00:00:02.000Z'),
    });
  });

  it('waits for a newer otp message after sinceTimestamp', async () => {
    vi.useFakeTimers();

    mockMessagesResponse([
      { id: 'msg-old', receivedAt: '2026-01-01T00:00:09.000Z', extractedOtp: '333333' },
    ]);
    mockMessagesResponse([
      { id: 'msg-fresh', receivedAt: '2026-01-01T00:00:11.000Z', extractedOtp: '444444' },
      { id: 'msg-old', receivedAt: '2026-01-01T00:00:09.000Z', extractedOtp: '333333' },
    ]);

    const resultPromise = pollLatestOtp({
      inboxToken: 'token-2',
      sinceTimestamp: Date.parse('2026-01-01T00:00:10.000Z'),
      timeoutMs: 5000,
      pollIntervalMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;

    expect(result).toEqual({
      code: '444444',
      messageId: 'msg-fresh',
      receivedAt: Date.parse('2026-01-01T00:00:11.000Z'),
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
