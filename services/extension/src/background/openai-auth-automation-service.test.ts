import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pollLatestOtp } from './openai-auth-automation-service';
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

describe('openai-auth-automation-service', () => {
  beforeEach(() => {
    resetFetchMock();
  });

  afterEach(() => {
    vi.useRealTimers();
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
