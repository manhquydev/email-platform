import { describe, expect, it } from 'vitest';
import {
  extractOtpFromText,
  generateRandomAge,
  generateRandomFullName,
  generateStrongPassword,
} from './openai-auth-automation-utils';

describe('openai-auth-automation-utils', () => {
  it('generates strong password with required charset', () => {
    const password = generateStrongPassword(16, 16);
    expect(password).toHaveLength(16);
    expect(/[A-Z]/.test(password)).toBe(true);
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[0-9]/.test(password)).toBe(true);
    expect(/[!@#$%^&*()[\]{}:,.?+\-_=]/.test(password)).toBe(true);
  });

  it('generates random age in allowed range', () => {
    for (let i = 0; i < 100; i += 1) {
      const age = Number(generateRandomAge(18, 60));
      expect(age).toBeGreaterThanOrEqual(18);
      expect(age).toBeLessThanOrEqual(60);
    }
  });

  it('generates full name with first and last part', () => {
    const name = generateRandomFullName();
    const parts = name.split(' ').filter(Boolean);
    expect(parts.length).toBeGreaterThanOrEqual(2);
  });

  it('extracts otp from text content', () => {
    expect(extractOtpFromText('Your verification code is 482913')).toBe('482913');
    expect(extractOtpFromText('Mã xác thực: 672198')).toBe('672198');
  });

  it('returns null when no otp found', () => {
    expect(extractOtpFromText('Hello world without verification digits')).toBeNull();
  });
});
