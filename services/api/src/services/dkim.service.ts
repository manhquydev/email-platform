/**
 * Enhanced DKIM Service
 * Manages DKIM key generation, storage, and DNS record display
 */

import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { encrypt, decrypt } from '../utils/encryption';

const DEFAULT_SELECTOR = process.env.DKIM_SELECTOR || 'ephemera2026';
const KEY_SIZE = parseInt(process.env.DKIM_KEY_SIZE || '2048', 10);

export interface DkimKeyPair {
  privateKey: string;
  publicKey: string;
  selector: string;
  dnsRecord: string;
}

export class DkimService {
  /**
   * Generate a new RSA key pair for DKIM
   */
  static generateKeyPair(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: KEY_SIZE,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { privateKey, publicKey };
  }

  /**
   * Extract public key for DNS record (remove headers and newlines)
   */
  static extractPublicKeyForDns(publicKeyPem: string): string {
    return publicKeyPem
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\r?\n/g, '');
  }

  /**
   * Build DNS TXT record value
   */
  static buildDkimDnsRecord(publicKey: string): string {
    const publicKeyBase64 = this.extractPublicKeyForDns(publicKey);
    return `v=DKIM1; k=rsa; p=${publicKeyBase64}`;
  }

  /**
   * Setup DKIM for a domain (get or create)
   */
  static async setupDkim(domainId: string, selector: string = DEFAULT_SELECTOR): Promise<DkimKeyPair> {
    // Check existing
    let dkim = await prisma.domainDkim.findUnique({
      where: { domainId },
    });

    if (!dkim) {
      const { privateKey, publicKey } = this.generateKeyPair();
      const encryptedPrivateKey = encrypt(privateKey);

      dkim = await prisma.domainDkim.create({
        data: {
          domainId,
          selector,
          privateKey: encryptedPrivateKey,
          publicKey,
          algorithm: 'rsa-sha256',
          keySize: KEY_SIZE,
        },
      });
    }

    const decryptedPrivateKey = decrypt(dkim.privateKey);

    return {
      privateKey: decryptedPrivateKey,
      publicKey: dkim.publicKey,
      selector: dkim.selector,
      dnsRecord: this.buildDkimDnsRecord(dkim.publicKey),
    };
  }

  /**
   * Get decrypted DKIM config for a domain
   */
  static async getDkimConfig(domainId: string) {
    const dkim = await prisma.domainDkim.findUnique({
      where: { domainId },
      include: { domain: true },
    });

    if (!dkim) return null;

    return {
      domainName: dkim.domain.name,
      keySelector: dkim.selector,
      privateKey: decrypt(dkim.privateKey),
    };
  }

  /**
   * Get DKIM info for domain (public only, for UI)
   */
  static async getDkimInfo(domainId: string): Promise<{
    hasKey: boolean;
    selector: string;
    dnsRecord: string;
    dnsHost: string;
    createdAt: Date | null;
  } | null> {
    const dkim = await prisma.domainDkim.findUnique({
      where: { domainId },
      include: { domain: true },
    });

    if (!dkim) {
      return {
        hasKey: false,
        selector: DEFAULT_SELECTOR,
        dnsRecord: '',
        dnsHost: `${DEFAULT_SELECTOR}._domainkey`,
        createdAt: null,
      };
    }

    return {
      hasKey: true,
      selector: dkim.selector,
      dnsRecord: this.buildDkimDnsRecord(dkim.publicKey),
      dnsHost: `${dkim.selector}._domainkey.${dkim.domain.name}`,
      createdAt: dkim.createdAt,
    };
  }

  /**
   * Rotate DKIM key for domain
   */
  static async rotateDkimKey(domainId: string): Promise<DkimKeyPair> {
    const { privateKey, publicKey } = this.generateKeyPair();
    const encryptedPrivateKey = encrypt(privateKey);

    const dkim = await prisma.domainDkim.upsert({
      where: { domainId },
      create: {
        domainId,
        selector: DEFAULT_SELECTOR,
        privateKey: encryptedPrivateKey,
        publicKey,
        algorithm: 'rsa-sha256',
        keySize: KEY_SIZE,
      },
      update: {
        privateKey: encryptedPrivateKey,
        publicKey,
        rotatedAt: new Date(),
      },
    });

    return {
      privateKey,
      publicKey: dkim.publicKey,
      selector: dkim.selector,
      dnsRecord: this.buildDkimDnsRecord(dkim.publicKey),
    };
  }

  /**
   * Verify DKIM DNS record is properly set
   */
  static async verifyDkimDns(domainName: string, selector: string): Promise<{
    valid: boolean;
    found: string | null;
    expected: string;
    error?: string;
  }> {
    const dkim = await prisma.domainDkim.findFirst({
      where: {
        domain: { name: domainName },
        selector,
      },
    });

    if (!dkim) {
      return {
        valid: false,
        found: null,
        expected: '',
        error: 'DKIM key not generated for this domain',
      };
    }

    const expectedRecord = this.buildDkimDnsRecord(dkim.publicKey);
    const dnsHost = `${selector}._domainkey.${domainName}`;

    try {
      const { promises: dns } = await import('dns');
      const resolver = new dns.Resolver();

      const records = await resolver.resolveTxt(dnsHost);
      const found = records.flat().join('');

      // Compare (ignoring whitespace differences)
      const normalizedFound = found.replace(/\s+/g, '');
      const normalizedExpected = expectedRecord.replace(/\s+/g, '');

      return {
        valid: normalizedFound === normalizedExpected,
        found,
        expected: expectedRecord,
      };
    } catch (error: any) {
      return {
        valid: false,
        found: null,
        expected: expectedRecord,
        error: error.code === 'ENOTFOUND' ? 'DNS record not found' : error.message,
      };
    }
  }
}
