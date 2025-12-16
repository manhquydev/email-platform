import { prisma } from "../lib/prisma";

export const recordAudit = async (userId: string | null, action: string, meta?: Record<string, unknown>) => {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action,
      meta: meta as any,
    },
  });
};
