import { prisma } from "../lib/prisma";
import { User, OrganizationMember } from "@prisma/client";

export class GalService {
  /**
   * Get Global Address List for a user (based on their organization)
   */
  static async getGalForUser(userId: string): Promise<Partial<User>[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    if (!user || !user.organizationId) {
      return [];
    }

    // Fetch all members of the organization
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: user.organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            telegramUsername: true
          }
        }
      }
    });

    return members.map(m => m.user);
  }

  /**
   * Sync GAL contacts to the Contact model for CardDAV access
   * This updates/creates read-only contacts for the user
   */
  static async syncGalContacts(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    if (!user || !user.organizationId) {
      return;
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: user.organizationId },
      include: { user: true }
    });

    for (const member of members) {
      if (member.userId === userId) continue; // Skip self

      const vcard = this.generateVCard(member.user);
      const uid = `gal-${member.user.id}`;

      await prisma.contact.upsert({
        where: {
          userId_uid: {
            userId,
            uid
          }
        },
        create: {
          userId,
          organizationId: user.organizationId,
          uid,
          fullName: member.user.name || member.user.email.split('@')[0],
          email: member.user.email,
          vcardData: vcard,
          etag: `${Date.now()}`,
          isGal: true
        },
        update: {
          fullName: member.user.name || member.user.email.split('@')[0],
          email: member.user.email,
          vcardData: vcard,
          etag: `${Date.now()}`
        }
      });
    }
  }

  private static generateVCard(user: Partial<User>): string {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `UID:gal-${user.id}`,
      `FN:${user.name || user.email?.split('@')[0]}`,
      `EMAIL:${user.email}`,
      `REV:${new Date().toISOString()}`,
      "END:VCARD"
    ];
    return lines.join("\r\n");
  }
}
