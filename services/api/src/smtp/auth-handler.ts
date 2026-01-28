import { prisma } from "../lib/prisma";
import { verifyPassword } from "../utils/password";
import { User } from "@prisma/client";

export interface AuthResponse {
  user: User | null;
  success: boolean;
  error?: string;
}

export class SmtpAuthHandler {
  /**
   * Validate SMTP credentials (AUTH PLAIN/LOGIN)
   */
  static async validateCredentials(
    username: string,
    password: string
  ): Promise<AuthResponse> {
    try {
      // 1. Find user by email (username)
      // We also check for aliases if we support sending as alias,
      // but usually SMTP auth is done with primary account credentials.
      const user = await prisma.user.findUnique({
        where: { email: username.toLowerCase() },
      });

      if (!user) {
        return { success: false, user: null, error: "Invalid username or password" };
      }

      if (user.isDisabled) {
        return { success: false, user: null, error: "Account disabled" };
      }

      // 2. Verify password
      // TODO: Support App Passwords for 2FA users
      const isValid = await verifyPassword(password, user.passwordHash);

      if (!isValid) {
        return { success: false, user: null, error: "Invalid username or password" };
      }

      // 3. Update last login (optional, maybe too heavy for SMTP?)
      // await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      return { success: true, user };
    } catch (error) {
      console.error("[SMTP Auth] Error validating credentials:", error);
      return { success: false, user: null, error: "Internal authentication error" };
    }
  }

  /**
   * Check if user is allowed to send from this address
   */
  static async canSendAs(userId: string, fromAddress: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        domains: true,
        inboxes: {
            include: {
                domain: true
            }
        },
        organizationMemberships: {
            include: {
                organization: {
                    include: {
                        domains: true
                    }
                }
            }
        }
      }
    });

    if (!user) return false;

    // 1. Check primary email
    if (user.email.toLowerCase() === fromAddress.toLowerCase()) return true;

    // 2. Check verified forward emails (aliases)
    if (user.verifiedForwardEmails.includes(fromAddress)) return true;

    // 3. Check owned domains
    const domainPart = fromAddress.split('@')[1];
    if (!domainPart) return false;

    const ownedDomain = user.domains.find(d => d.name === domainPart && d.status === 'VERIFIED');
    if (ownedDomain) return true;

    // 4. Check inboxes
    const inbox = user.inboxes.find(i => `${i.localPart}@${i.domain.name}`.toLowerCase() === fromAddress.toLowerCase());
    if (inbox) return true;

    // 5. Check organization domains
    for (const membership of user.organizationMemberships) {
        const orgDomain = membership.organization.domains.find(d => d.name === domainPart && d.status === 'VERIFIED');
        if (orgDomain) return true;
    }

    return false;
  }
}
