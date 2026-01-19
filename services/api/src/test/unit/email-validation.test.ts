/**
 * Email Validation Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    isValidEmailFormat,
    isValidDomainFormat,
    extractDomain,
    isDisposableDomain,
} from '../../utils/email-validation/format-validators';
import {
    validateEmail,
    validateDomain,
    canReceiveEmail,
} from '../../utils/email-validation/validators';

// Mock DNS module
vi.mock('dns', () => ({
    promises: {
        resolveMx: vi.fn(),
        resolveTxt: vi.fn(),
    },
}));

import { promises as dns } from 'dns';

describe('Email Validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('isValidEmailFormat', () => {
        it('should accept valid email formats', () => {
            expect(isValidEmailFormat('user@example.com')).toBe(true);
            expect(isValidEmailFormat('user.name@example.com')).toBe(true);
            expect(isValidEmailFormat('user+tag@example.com')).toBe(true);
            expect(isValidEmailFormat('user@subdomain.example.com')).toBe(true);
        });

        it('should reject invalid email formats', () => {
            expect(isValidEmailFormat('')).toBe(false);
            expect(isValidEmailFormat('invalid')).toBe(false);
            expect(isValidEmailFormat('@example.com')).toBe(false);
            expect(isValidEmailFormat('user@')).toBe(false);
            expect(isValidEmailFormat('user@.com')).toBe(false);
            expect(isValidEmailFormat('a'.repeat(255) + '@example.com')).toBe(false);
        });
    });

    describe('isValidDomainFormat', () => {
        it('should accept valid domain formats', () => {
            expect(isValidDomainFormat('example.com')).toBe(true);
            expect(isValidDomainFormat('subdomain.example.com')).toBe(true);
            expect(isValidDomainFormat('my-domain.co.uk')).toBe(true);
        });

        it('should reject invalid domain formats', () => {
            expect(isValidDomainFormat('')).toBe(false);
            expect(isValidDomainFormat('example')).toBe(false);
            expect(isValidDomainFormat('-example.com')).toBe(false);
        });
    });

    describe('extractDomain', () => {
        it('should extract domain from valid email', () => {
            expect(extractDomain('user@example.com')).toBe('example.com');
            expect(extractDomain('User@EXAMPLE.COM')).toBe('example.com');
        });

        it('should return null for invalid email', () => {
            expect(extractDomain('invalid')).toBe(null);
            expect(extractDomain('user@domain@example.com')).toBe(null);
        });
    });

    describe('isDisposableDomain', () => {
        it('should detect disposable email domains', () => {
            expect(isDisposableDomain('tempmail.com')).toBe(true);
            expect(isDisposableDomain('mailinator.com')).toBe(true);
            expect(isDisposableDomain('yopmail.com')).toBe(true);
            expect(isDisposableDomain('TEMPMAIL.COM')).toBe(true);
        });

        it('should not flag legitimate domains', () => {
            expect(isDisposableDomain('gmail.com')).toBe(false);
            expect(isDisposableDomain('outlook.com')).toBe(false);
            expect(isDisposableDomain('company.com')).toBe(false);
        });
    });

    describe('validateEmail', () => {
        it('should validate email with valid MX records', async () => {
            vi.mocked(dns.resolveMx).mockResolvedValue([
                { exchange: 'mx1.example.com', priority: 10 },
            ]);
            vi.mocked(dns.resolveTxt).mockResolvedValue([['v=spf1 include:_spf.google.com ~all']]);

            const result = await validateEmail('user@example.com');

            expect(result.valid).toBe(true);
            expect(result.checks.format).toBe(true);
            expect(result.checks.mxRecords).toBe(true);
            expect(result.checks.notDisposable).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject email with invalid format', async () => {
            const result = await validateEmail('invalid-email');

            expect(result.valid).toBe(false);
            expect(result.checks.format).toBe(false);
            expect(result.errors).toContain('Invalid email format');
        });

        it('should reject disposable email domains', async () => {
            const result = await validateEmail('user@tempmail.com');

            expect(result.valid).toBe(false);
            expect(result.checks.notDisposable).toBe(false);
            expect(result.errors).toContain('Disposable email addresses are not allowed');
        });

        it('should reject email with no MX records', async () => {
            vi.mocked(dns.resolveMx).mockResolvedValue([]);
            vi.mocked(dns.resolveTxt).mockResolvedValue([]);

            const result = await validateEmail('user@no-mx-domain.com');

            expect(result.valid).toBe(false);
            expect(result.checks.mxRecords).toBe(false);
            expect(result.errors).toContain('Domain has no MX records - cannot receive email');
        });

        it('should warn when SPF record is missing', async () => {
            vi.mocked(dns.resolveMx).mockResolvedValue([
                { exchange: 'mx1.example.com', priority: 10 },
            ]);
            vi.mocked(dns.resolveTxt).mockResolvedValue([]);

            const result = await validateEmail('user@example.com');

            expect(result.valid).toBe(true);
            expect(result.checks.spfRecord).toBe(false);
            expect(result.warnings).toContain('Domain has no SPF record - emails may be marked as spam');
        });
    });

    describe('validateDomain', () => {
        it('should validate domain with complete DNS setup', async () => {
            vi.mocked(dns.resolveMx).mockResolvedValue([
                { exchange: 'mx1.example.com', priority: 10 },
            ]);
            vi.mocked(dns.resolveTxt)
                .mockResolvedValueOnce([['v=spf1 include:_spf.google.com ~all']])
                .mockResolvedValueOnce([['v=DMARC1; p=reject; rua=mailto:dmarc@example.com']]);

            const result = await validateDomain('example.com');

            expect(result.valid).toBe(true);
            expect(result.hasMx).toBe(true);
            expect(result.hasSpf).toBe(true);
            expect(result.hasDmarc).toBe(true);
            expect(result.recommendations).toHaveLength(0);
        });

        it('should provide recommendations for missing records', async () => {
            vi.mocked(dns.resolveMx).mockResolvedValue([
                { exchange: 'mx1.example.com', priority: 10 },
            ]);
            vi.mocked(dns.resolveTxt).mockResolvedValue([]);

            const result = await validateDomain('example.com');

            expect(result.valid).toBe(true);
            expect(result.hasSpf).toBe(false);
            expect(result.hasDmarc).toBe(false);
            expect(result.recommendations.length).toBeGreaterThan(0);
        });

        it('should reject invalid domain format', async () => {
            const result = await validateDomain('invalid');

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid domain format');
        });
    });

    describe('canReceiveEmail', () => {
        it('should return true for valid email with MX records', async () => {
            vi.mocked(dns.resolveMx).mockResolvedValue([
                { exchange: 'mx1.example.com', priority: 10 },
            ]);

            const result = await canReceiveEmail('user@example.com');
            expect(result).toBe(true);
        });

        it('should return false for invalid email format', async () => {
            const result = await canReceiveEmail('invalid');
            expect(result).toBe(false);
        });

        it('should return false for disposable email', async () => {
            const result = await canReceiveEmail('user@tempmail.com');
            expect(result).toBe(false);
        });

        it('should return false when no MX records exist', async () => {
            vi.mocked(dns.resolveMx).mockResolvedValue([]);

            const result = await canReceiveEmail('user@no-mx.com');
            expect(result).toBe(false);
        });

        it('should return false on DNS lookup error', async () => {
            vi.mocked(dns.resolveMx).mockRejectedValue(new Error('DNS error'));

            const result = await canReceiveEmail('user@example.com');
            expect(result).toBe(false);
        });
    });
});
