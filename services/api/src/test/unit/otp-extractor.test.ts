import { describe, it, expect } from 'vitest';
import { extractOTP, extractAllOTPs } from '../../utils/otpExtractor';

describe('OTP Extractor', () => {
  describe('extractOTP', () => {
    it('should extract verification code with prefix', () => {
      const result = extractOTP('verification code: 847293');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('847293');
      expect(result?.confidence).toBe('high');
    });

    it('should extract OTP with label', () => {
      const result = extractOTP('OTP: 789234');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('789234');
    });

    it('should extract security code', () => {
      const result = extractOTP('Security code: 582719');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('582719');
    });

    it('should extract 8-digit codes', () => {
      const result = extractOTP('Your code is 12348765');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('12348765');
    });

    it('should return null for text without OTP', () => {
      const result = extractOTP('Hello, this is a regular email without any codes.');
      expect(result).toBeNull();
    });

    it('should prefer high confidence matches', () => {
      const result = extractOTP('Call 555-1234 for help. Your security code: 847293.');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('847293');
    });

    it('should extract code from HTML content', () => {
      const result = extractOTP('<p>Your code is <b>456783</b></p>');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('456783');
    });

    it('should not extract years as OTP', () => {
      const result = extractOTP('Copyright 2024 Company Inc.');
      expect(result).toBeNull();
    });

    it('should not extract sequential numbers', () => {
      // 123456 is rejected as sequential
      const result = extractOTP('Some random text 123456');
      expect(result).toBeNull();
    });

    it('should reject all-same-digit codes', () => {
      const result = extractOTP('code: 111111');
      expect(result).toBeNull();
    });
  });

  describe('extractAllOTPs', () => {
    it('should extract multiple OTPs from text', () => {
      const text = 'Primary code: 847293. Backup code: 938271.';
      const results = extractAllOTPs(text);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for text without OTPs', () => {
      const results = extractAllOTPs('No codes here.');
      expect(results).toEqual([]);
    });
  });
});
