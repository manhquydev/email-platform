import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutomationInbox, pollLatestLink, pollLatestOtp } from './openai-auth-automation-service';
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

  it('uses configured expiry and allowed domains for automation inbox', async () => {
    mockDomainsResponse([
      { id: 'domain-1', name: 'alpha.test' },
      { id: 'domain-2', name: 'beta.test' },
    ]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        id: 'inbox-opts',
        token: 'token-opts',
        address: 'opts@example.com',
      }),
      text: () => Promise.resolve(''),
    });

    const result = await createAutomationInbox({
      expiryHours: 24,
      allowedDomainIds: ['domain-2'],
    });
    expect(result.inboxId).toBe('inbox-opts');

    const [, options] = mockFetch.mock.calls[1] as [string, RequestInit];
    const payload = JSON.parse(String(options.body || '{}')) as Record<string, unknown>;
    expect(payload.expiryHours).toBe(24);
    expect(payload.domainId).toBe('domain-2');
  });

  it('clamps invalid expiry values to safe bounds', async () => {
    mockDomainsResponse([{ id: 'domain-1', name: 'alpha.test' }]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        id: 'inbox-clamp',
        token: 'token-clamp',
        address: 'clamp@example.com',
      }),
      text: () => Promise.resolve(''),
    });

    await createAutomationInbox({ expiryHours: -10 });
    const [, options] = mockFetch.mock.calls[1] as [string, RequestInit];
    const payload = JSON.parse(String(options.body || '{}')) as Record<string, unknown>;
    expect(payload.expiryHours).toBe(1);

    mockDomainsResponse([{ id: 'domain-1', name: 'alpha.test' }]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        id: 'inbox-clamp-max',
        token: 'token-clamp-max',
        address: 'clamp-max@example.com',
      }),
      text: () => Promise.resolve(''),
    });

    await createAutomationInbox({ expiryHours: 168 });
    const [, optionsMax] = mockFetch.mock.calls[3] as [string, RequestInit];
    const payloadMax = JSON.parse(String(optionsMax.body || '{}')) as Record<string, unknown>;
    expect(payloadMax.expiryHours).toBe(24);
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

  it('polls otp from owned inbox by inboxId when access token is provided', async () => {
    mockMessagesResponse([
      { id: 'msg-owned', receivedAt: '2026-01-01T00:00:12.000Z', extractedOtp: '777777' },
    ]);

    const result = await pollLatestOtp({
      inboxId: 'owned-inbox-1',
      accessToken: 'access-token-1',
      sinceTimestamp: Date.parse('2026-01-01T00:00:00.000Z'),
      timeoutMs: 1000,
      pollIntervalMs: 100,
    });

    expect(result).toEqual({
      code: '777777',
      messageId: 'msg-owned',
      receivedAt: Date.parse('2026-01-01T00:00:12.000Z'),
    });

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/inboxes/owned-inbox-1/messages');
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer access-token-1');
  });

  it('polls latest confirmation link and skips excluded message ids', async () => {
    mockMessagesResponse([
      {
        id: 'msg-new-link',
        receivedAt: '2026-01-01T00:00:20.000Z',
        htmlBody: '<a href="https://app.fireworks.ai/signup/confirm?client_id=abc&amp;user_name=u1&amp;confirmation_code=111111">Verify</a>',
      },
      {
        id: 'msg-next-link',
        receivedAt: '2026-01-01T00:00:19.000Z',
        textBody: 'Use this link: https://app.fireworks.ai/signup/confirm?client_id=def&user_name=u2&confirmation_code=222222',
      },
    ]);

    const result = await pollLatestLink({
      inboxToken: 'token-link-1',
      sinceTimestamp: Date.parse('2026-01-01T00:00:00.000Z'),
      timeoutMs: 1000,
      pollIntervalMs: 100,
      excludeMessageIds: ['msg-new-link'],
      urlPattern: 'https://app\\.fireworks\\.ai/signup/confirm\\?[^\\s\"\'<>]+',
    });

    expect(result).toEqual({
      url: 'https://app.fireworks.ai/signup/confirm?client_id=def&user_name=u2&confirmation_code=222222',
      messageId: 'msg-next-link',
      receivedAt: Date.parse('2026-01-01T00:00:19.000Z'),
    });
  });

  it('polls confirmation link from owned inbox by inboxId with access token', async () => {
    mockMessagesResponse([
      {
        id: 'msg-owned-link',
        receivedAt: '2026-01-01T00:00:21.000Z',
        textBody: 'Confirm: https://app.fireworks.ai/signup/confirm?client_id=owned&user_name=owned-user&confirmation_code=333333',
      },
    ]);

    const result = await pollLatestLink({
      inboxId: 'owned-inbox-link-1',
      accessToken: 'access-token-link-1',
      sinceTimestamp: Date.parse('2026-01-01T00:00:00.000Z'),
      timeoutMs: 1000,
      pollIntervalMs: 100,
    });

    expect(result).toEqual({
      url: 'https://app.fireworks.ai/signup/confirm?client_id=owned&user_name=owned-user&confirmation_code=333333',
      messageId: 'msg-owned-link',
      receivedAt: Date.parse('2026-01-01T00:00:21.000Z'),
    });

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/inboxes/owned-inbox-link-1/messages');
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer access-token-link-1');
  });
});
