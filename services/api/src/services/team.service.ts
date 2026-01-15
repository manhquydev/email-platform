import { prisma } from "../lib/prisma";
import { TeamRole } from "@prisma/client";

export class TeamService {
  /**
   * Check if a user has access to a specific inbox via team membership
   */
  static async canAccessInbox(userId: string, inboxId: string): Promise<boolean> {
    // 1. Check direct ownership first
    const inbox = await prisma.inbox.findUnique({
      where: { id: inboxId },
      select: { ownerId: true }
    });

    if (inbox?.ownerId === userId) return true;

    // 2. Check team shared access
    const sharedAccess = await prisma.teamInbox.findFirst({
      where: {
        inboxId: inboxId,
        team: {
          members: {
            some: { userId: userId }
          }
        }
      }
    });

    return !!sharedAccess;
  }

  /**
   * Check if a user has specific permissions within a team
   */
  static async hasTeamRole(userId: string, teamId: string, roles: TeamRole[]): Promise<boolean> {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId }
      }
    });

    if (!membership) return false;
    return roles.includes(membership.role);
  }

  /**
   * Get all inboxes accessible to a user (personal + shared)
   */
  static async getAccessibleInboxIds(userId: string): Promise<string[]> {
    const personalInboxes = await prisma.inbox.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true }
    });

    const sharedInboxes = await prisma.teamInbox.findMany({
      where: {
        team: {
          members: {
            some: { userId: userId }
          }
        },
        inbox: { deletedAt: null }
      },
      select: { inboxId: true }
    });

    const ids = new Set([
      ...personalInboxes.map(i => i.id),
      ...sharedInboxes.map(i => i.inboxId)
    ]);

    return Array.from(ids);
  }
}
