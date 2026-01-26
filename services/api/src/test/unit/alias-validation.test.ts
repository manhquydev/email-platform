import { describe, it, expect } from 'vitest';
import { validateAlias, isReservedAlias } from '../../lib/alias-validation';

describe('Alias Validation', () => {
  describe('validateAlias', () => {
    it('should validate correct aliases', () => {
      const validAliases = [
        'john',
        'john.doe',
        'john-doe',
        'john_doe',
        'j.doe',
        'user123',
        'test.user',
        'a-b',
      ];

      validAliases.forEach(alias => {
        const result = validateAlias(alias);
        expect(result.valid, `Alias "${alias}" should be valid`).toBe(true);
        expect(result.sanitized).toBe(alias.toLowerCase());
      });
    });

    it('should sanitize input', () => {
      const result = validateAlias('  John.Doe  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('john.doe');
    });

    it('should reject aliases that are too short', () => {
      const result = validateAlias('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('should reject aliases that are too long', () => {
      const longAlias = 'a'.repeat(31);
      const result = validateAlias(longAlias);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 30 characters');
    });

    it('should reject aliases starting or ending with special characters', () => {
      const invalid = ['.user', '-user', '_user', 'user.', 'user-', 'user_'];
      invalid.forEach(alias => {
        const result = validateAlias(alias);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('must start/end with letter or number');
      });
    });

    it('should reject reserved words', () => {
      const reserved = ['admin', 'support', 'root', 'noreply', 'ADMIN'];
      reserved.forEach(alias => {
        const result = validateAlias(alias);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('reserved');
      });
    });

    it('should reject abuse patterns', () => {
      // Same char repeated 5+ times
      expect(validateAlias('aaaaa').valid).toBe(false);

      // All numbers
      expect(validateAlias('12345').valid).toBe(false);
    });

    it('should reject consecutive special characters', () => {
      const invalid = ['user..name', 'user--name', 'user__name', 'user.-name'];
      invalid.forEach(alias => {
        const result = validateAlias(alias);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('consecutive special characters');
      });
    });
  });

  describe('isReservedAlias', () => {
    it('should identify reserved aliases', () => {
      expect(isReservedAlias('admin')).toBe(true);
      expect(isReservedAlias('Support')).toBe(true); // Case insensitive
      expect(isReservedAlias('user')).toBe(false);
    });
  });
});
