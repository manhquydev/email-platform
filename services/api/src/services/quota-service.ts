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
