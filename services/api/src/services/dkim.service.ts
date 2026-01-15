import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { encrypt, decrypt } from '../utils/encryption';

export class DkimService {
  /**
   * Generate a new RSA-2048 key pair for DKIM
   */
  static generateKeyPair() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    // Clean up public key for DNS TXT record (remove PEM headers and newlines)
    const dnsPublicKey = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s+/g, '');

    return { privateKey, publicKey: dnsPublicKey };
  }

  /**
   * Setup DKIM for a domain
   */
  static async setupDkim(domainId: string, selector: string = 'ephemera') {
    const { privateKey, publicKey } = this.generateKeyPair();
    const encryptedPrivateKey = encrypt(privateKey);

    return await prisma.domainDkim.upsert({
      where: { domainId },
      update: {
        selector,
        privateKey: encryptedPrivateKey,
        publicKey,
        rotatedAt: new Date(),
      },
      create: {
        domainId,
        selector,
        privateKey: encryptedPrivateKey,
        publicKey,
      },
    });
  }

  /**
   * Get decrypted DKIM config for a domain
   */
  static async getDkimConfig(domainId: string) {
    const dkim = await prisma.domainDkim.findUnique({
      where: { domainId },
    });

    if (!dkim) return null;

    return {
      domainName: '', // To be filled by caller
      keySelector: dkim.selector,
      privateKey: decrypt(dkim.privateKey),
    };
  }
}
