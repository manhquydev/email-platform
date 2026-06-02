import { describe, expect, it } from 'vitest';
import { generateRandomLocalPart, generateRandomProfileName } from './openai-auth-random-profile';

describe('openai-auth-random-profile', () => {
  it('generates realistic local parts within web constraints', () => {
    const blocked = ['test', 'temp', 'fake', 'spam', 'throwaway', 'google', 'apple', 'openai'];
    const samples = Array.from({ length: 120 }, () => generateRandomLocalPart());

    for (const sample of samples) {
      expect(sample).toMatch(/^[a-z0-9._]+$/);
      expect(sample.length).toBeGreaterThanOrEqual(6);
      expect(sample.length).toBeLessThanOrEqual(24);
      expect(sample).not.toMatch(/^[._]|[._]$/);
      expect(sample).not.toMatch(/[._]{2,}/);
      expect(sample).not.toMatch(/(.)\1{2,}/);
      expect(sample).not.toMatch(/\d{3,}/);
      expect(blocked.some((token) => sample.includes(token))).toBe(false);
    }
  });

  it('generates full name with at least two words', () => {
    const value = generateRandomProfileName();
    const parts = value.split(' ').filter(Boolean);
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(/[0-9]/.test(value)).toBe(false);
  });
});
