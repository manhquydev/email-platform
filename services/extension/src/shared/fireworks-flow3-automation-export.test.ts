import { describe, expect, it } from 'vitest';
import {
  formatFireworksFlow3CredentialsAsTxt,
  summarizeFireworksFlow3Credentials,
} from './fireworks-flow3-automation-export';

describe('fireworks-flow3-automation-export', () => {
  it('summarizes credentials with and without api key', () => {
    const summary = summarizeFireworksFlow3Credentials([
      { id: '1', email: 'a@x.test', password: 'p1', createdAt: 1, apiKey: 'fw_key_1' },
      { id: '2', email: 'b@x.test', password: 'p2', createdAt: 2 },
    ]);

    expect(summary).toEqual({
      total: 2,
      withApiKey: 1,
      withoutApiKey: 1,
    });
  });

  it('formats fireworks flow3 records as txt', () => {
    const output = formatFireworksFlow3CredentialsAsTxt([
      {
        id: '1',
        email: 'first@x.test',
        password: 'Pass#111',
        apiKey: 'fw_abc123',
        createdAt: Date.parse('2026-01-01T00:00:00.000Z'),
        verifiedAt: Date.parse('2026-01-01T00:01:00.000Z'),
        apiKeyCreatedAt: Date.parse('2026-01-01T00:02:00.000Z'),
      },
    ], Date.parse('2026-01-01T00:05:00.000Z'));

    expect(output).toContain('Ephemera Fireworks Flow 3 Credentials');
    expect(output).toContain('WithApiKey: 1');
    expect(output).toContain('Index | Email | Password | ApiKey | CreatedAt | VerifiedAt | ApiKeyCreatedAt');
    expect(output).toContain('first@x.test | Pass#111 | fw_abc123');
  });
});
