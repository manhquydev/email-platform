import { describe, it, expect } from 'vitest';
import { DkimService } from '../../services/dkim.service';

describe('DKIM Service', () => {
  describe('generateKeyPair', () => {
    it('should generate valid RSA key pair', () => {
      const { privateKey, publicKey } = DkimService.generateKeyPair();

      expect(privateKey).toBeDefined();
      expect(publicKey).toBeDefined();
      expect(privateKey).toContain('-----BEGIN PRIVATE KEY-----');
      expect(privateKey).toContain('-----END PRIVATE KEY-----');
      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(publicKey).toContain('-----END PUBLIC KEY-----');
    });
  });

  describe('extractPublicKeyForDns', () => {
    it('should remove PEM headers and newlines', () => {
      const pemKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
testkey123456789abcdefghijklmnop
-----END PUBLIC KEY-----`;

      const result = DkimService.extractPublicKeyForDns(pemKey);

      expect(result).not.toContain('-----BEGIN PUBLIC KEY-----');
      expect(result).not.toContain('-----END PUBLIC KEY-----');
      expect(result).not.toContain('\n');
      expect(result).toContain('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA');
    });
  });

  describe('buildDkimDnsRecord', () => {
    it('should build valid DKIM TXT record', () => {
      const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
-----END PUBLIC KEY-----`;

      const result = DkimService.buildDkimDnsRecord(publicKey);

      expect(result).toContain('v=DKIM1');
      expect(result).toContain('k=rsa');
      expect(result).toContain('p=');
      expect(result).toMatch(/^v=DKIM1; k=rsa; p=/);
    });
  });

  describe('key pair generation integration', () => {
    it('should generate keys that can be used for DNS record', () => {
      const { publicKey } = DkimService.generateKeyPair();
      const dnsRecord = DkimService.buildDkimDnsRecord(publicKey);

      // DNS record should be valid format
      expect(dnsRecord).toMatch(/^v=DKIM1; k=rsa; p=[A-Za-z0-9+/=]+$/);

      // Public key in DNS should be base64 without headers
      const base64Part = dnsRecord.split('p=')[1];
      expect(base64Part.length).toBeGreaterThan(100); // RSA 2048 key is ~400 chars
    });
  });
});
