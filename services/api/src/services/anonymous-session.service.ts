import { prisma } from "../lib/prisma";
import crypto from "crypto";
import { z } from "zod";

export class AnonymousSessionService {
  /**
   * Generates a random account code in the format "xxxx-xxxx-xxxx-xxxx"
   */
  static generateAccountCode(): string {
    const bytes = crypto.randomBytes(8);
    const hex = bytes.toString("hex");
    // Format as 4 groups of 4 chars
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
  }

  /**
   * Generates a secure random visitor token for session persistence
   */
  static generateVisitorToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Creates a new anonymous account with no PII
   */
  static async createAnonymousAccount() {
    let unique = false;
    let accountCode = "";

    // Ensure uniqueness of account code (highly probable but good to check)
    while (!unique) {
      accountCode = this.generateAccountCode();
      const existing = await prisma.anonymousAccount.findUnique({
        where: { accountCode },
      });
      if (!existing) {
        unique = true;
      }
    }

    const visitorToken = this.generateVisitorToken();

    return prisma.anonymousAccount.create({
      data: {
        accountCode,
        visitorToken,
        tier: "FREE",
      },
    });
  }

  /**
   * Retrieves an anonymous account by visitor token
   */
  static async getByVisitorToken(token: string) {
    return prisma.anonymousAccount.findUnique({
      where: { visitorToken: token },
      include: {
        passkey: true,
      },
    });
  }

  /**
   * Retrieves an anonymous account by account code
   */
  static async getByAccountCode(code: string) {
    return prisma.anonymousAccount.findUnique({
      where: { accountCode: code },
      include: {
        passkey: true,
      },
    });
  }

  /**
   * Retrieves an anonymous account by ID
   */
  static async getById(id: string) {
    return prisma.anonymousAccount.findUnique({
      where: { id },
    });
  }

  /**
   * Links a passkey credential to an anonymous account
   */
  static async linkPasskey(accountId: string, passkeyId: string) {
    return prisma.anonymousAccount.update({
      where: { id: accountId },
      data: {
        passkeyId: passkeyId,
        // Clear visitor token after passkey setup for higher security?
        // For now keep it to allow "remember me" behavior on the same device
      },
    });
  }
}
