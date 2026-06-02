import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class QuotaService {
  static async checkStorageQuota(organizationId: string, bytesToAdd: number): Promise<boolean> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { storageQuota: true, storageUsed: true }
    });

    if (!org) return false;

    // 0 means unlimited
    if (org.storageQuota === BigInt(0)) return true;

    const newUsage = org.storageUsed + BigInt(bytesToAdd);
    return newUsage <= org.storageQuota;
  }

  static async updateStorageUsage(organizationId: string, bytesDelta: number) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        storageUsed: {
          increment: BigInt(bytesDelta)
        }
      }
    });
  }

  /**
   * Atomically reserve storage. Replaces the read-then-write (check then increment)
   * pattern, which let two concurrent uploads both pass the check before either wrote,
   * overshooting the quota. The conditional `updateMany` only increments when the row
   * still satisfies the quota, so the database serializes the decision in one statement.
   */
  static async reserveStorage(
    organizationId: string,
    bytesToAdd: number
  ): Promise<{ success: boolean; reason?: string }> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { storageQuota: true }
    });

    if (!org) return { success: false, reason: 'Organization not found' };

    // 0 means unlimited — still track usage.
    if (org.storageQuota === BigInt(0)) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { storageUsed: { increment: BigInt(bytesToAdd) } }
      });
      return { success: true };
    }

    const updated = await prisma.organization.updateMany({
      where: {
        id: organizationId,
        storageUsed: { lte: org.storageQuota - BigInt(bytesToAdd) }
      },
      data: { storageUsed: { increment: BigInt(bytesToAdd) } }
    });

    if (updated.count === 0) {
      return { success: false, reason: 'Storage quota exceeded' };
    }

    return { success: true };
  }

  static async getUsageStats(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { storageQuota: true, storageUsed: true }
    });

    if (!org) throw new Error('Organization not found');

    return {
      used: org.storageUsed.toString(),
      quota: org.storageQuota.toString(),
      percentage: org.storageQuota > BigInt(0)
        ? Number((org.storageUsed * BigInt(100)) / org.storageQuota)
        : 0
    };
  }
}
