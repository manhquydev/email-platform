import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { createTierEnforceHandler, TierEnforcementService } from "../services/tier-enforcement.service";
import { sendApiError } from "../utils/errorHandler";

export async function teamRoutes(app: FastifyInstance) {
    // Create a new team
    app.post("/teams", { preHandler: [app.authenticate, createTierEnforceHandler('teams')] }, async (request, reply) => {
        const userId = (request.user as any).userId;

        const schema = z.object({
            name: z.string().min(1).max(100),
            description: z.string().max(500).optional(),
        });

        const parsed = schema.safeParse(request.body);
        if (!parsed.success) {
            return sendApiError(reply, 400, "Invalid payload", { code: "BAD_REQUEST", details: parsed.error.flatten() });
        }

        const { name, description } = parsed.data;

        const team = await prisma.team.create({
            data: {
                name,
                description,
                ownerId: userId,
                members: {
                    create: {
                        userId,
                        role: "OWNER",
                    },
                },
            },
            include: {
                members: {
                    include: {
                        team: true,
                    },
                },
            },
        });

        return { team };
    });

    // List user's teams
    app.get("/teams", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;

        const teams = await prisma.team.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            include: {
                owner: { select: { id: true, email: true } },
                members: {
                    include: {
                        team: { select: { id: true, email: true } },
                    },
                },
                sharedInboxes: {
                    include: {
                        inbox: {
                            include: { domain: true },
                        },
                    },
                },
                _count: {
                    select: { members: true, sharedInboxes: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return { teams };
    });

    // Get a specific team
    app.get("/teams/:teamId", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;
        const { teamId } = request.params as { teamId: string };

        const team = await prisma.team.findFirst({
            where: {
                id: teamId,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            include: {
                owner: { select: { id: true, email: true } },
                members: {
                    include: {
                        team: { select: { id: true, email: true } },
                    },
                },
                sharedInboxes: {
                    include: {
                        inbox: {
                            include: { domain: true },
                        },
                    },
                },
            },
        });

        if (!team) {
            return sendApiError(reply, 404, "Team not found", { code: "NOT_FOUND" });
        }

        return { team };
    });

    // Update team
    app.patch("/teams/:teamId", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;
        const { teamId } = request.params as { teamId: string };

        const team = await prisma.team.findFirst({
            where: { id: teamId, ownerId: userId },
        });

        if (!team) {
            return sendApiError(reply, 404, "Team not found or not owner", { code: "NOT_FOUND" });
        }

        const schema = z.object({
            name: z.string().min(1).max(100).optional(),
            description: z.string().max(500).optional(),
        });

        const parsed = schema.safeParse(request.body);
        if (!parsed.success) {
            return sendApiError(reply, 400, "Invalid payload", { code: "BAD_REQUEST" });
        }

        const updated = await prisma.team.update({
            where: { id: teamId },
            data: parsed.data,
        });

        return { team: updated };
    });

    // Delete team
    app.delete("/teams/:teamId", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;
        const { teamId } = request.params as { teamId: string };

        const team = await prisma.team.findFirst({
            where: { id: teamId, ownerId: userId },
        });

        if (!team) {
            return sendApiError(reply, 404, "Team not found or not owner", { code: "NOT_FOUND" });
        }

        await prisma.team.delete({ where: { id: teamId } });

        return { ok: true };
    });

    // Add member to team
    app.post("/teams/:teamId/members", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;
        const { teamId } = request.params as { teamId: string };

        // Check tier limit for team members
        const memberCheck = await TierEnforcementService.canAddTeamMember(userId, teamId);
        if (!memberCheck.allowed) {
            return sendApiError(reply, 403, "TIER_LIMIT_EXCEEDED", {
                code: "TIER_LIMIT_EXCEEDED",
                details: {
                    message: memberCheck.message,
                    currentCount: memberCheck.currentCount,
                    limit: memberCheck.limit,
                    upgradeRequired: memberCheck.upgradeRequired,
                },
            });
        }

        // Check if user is owner or admin
        const membership = await prisma.teamMember.findFirst({
            where: {
                teamId,
                userId,
                role: { in: ["OWNER", "ADMIN"] },
            },
        });

        if (!membership) {
            return sendApiError(reply, 403, "Not authorized to add members", { code: "FORBIDDEN" });
        }

        const schema = z.object({
            email: z.string().email(),
            role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
        });

        const parsed = schema.safeParse(request.body);
        if (!parsed.success) {
            return sendApiError(reply, 400, "Invalid payload", { code: "BAD_REQUEST" });
        }

        const { email, role } = parsed.data;

        // Find user by email
        const targetUser = await prisma.user.findUnique({ where: { email } });
        if (!targetUser) {
            return sendApiError(reply, 404, "User not found", { code: "NOT_FOUND" });
        }

        // Check if already a member
        const existing = await prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: targetUser.id } },
        });

        if (existing) {
            return sendApiError(reply, 409, "User is already a member", { code: "CONFLICT" });
        }

        const member = await prisma.teamMember.create({
            data: {
                teamId,
                userId: targetUser.id,
                role,
            },
            include: {
                team: { select: { id: true, email: true } },
            },
        });

        return { member };
    });

    // Remove member from team
    app.delete("/teams/:teamId/members/:memberId", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;
        const { teamId, memberId } = request.params as { teamId: string; memberId: string };

        // Check if user is owner or admin
        const membership = await prisma.teamMember.findFirst({
            where: {
                teamId,
                userId,
                role: { in: ["OWNER", "ADMIN"] },
            },
        });

        if (!membership) {
            return sendApiError(reply, 403, "Not authorized to remove members", { code: "FORBIDDEN" });
        }

        const targetMember = await prisma.teamMember.findUnique({
            where: { id: memberId },
        });

        if (!targetMember || targetMember.teamId !== teamId) {
            return sendApiError(reply, 404, "Member not found", { code: "NOT_FOUND" });
        }

        if (targetMember.role === "OWNER") {
            return sendApiError(reply, 403, "Cannot remove team owner", { code: "FORBIDDEN" });
        }

        await prisma.teamMember.delete({ where: { id: memberId } });

        return { ok: true };
    });

    // Share inbox with team
    app.post("/teams/:teamId/inboxes", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;
        const { teamId } = request.params as { teamId: string };

        // Check if user is owner or admin
        const membership = await prisma.teamMember.findFirst({
            where: {
                teamId,
                userId,
                role: { in: ["OWNER", "ADMIN"] },
            },
        });

        if (!membership) {
            return sendApiError(reply, 403, "Not authorized to share inboxes", { code: "FORBIDDEN" });
        }

        const schema = z.object({
            inboxId: z.string().uuid(),
        });

        const parsed = schema.safeParse(request.body);
        if (!parsed.success) {
            return sendApiError(reply, 400, "Invalid payload", { code: "BAD_REQUEST" });
        }

        const { inboxId } = parsed.data;

        // Verify inbox ownership
        const inbox = await prisma.inbox.findFirst({
            where: { id: inboxId, ownerId: userId },
        });

        if (!inbox) {
            return sendApiError(reply, 404, "Inbox not found or not owned by you", { code: "NOT_FOUND" });
        }

        // Check if already shared
        const existing = await prisma.teamInbox.findUnique({
            where: { teamId_inboxId: { teamId, inboxId } },
        });

        if (existing) {
            return sendApiError(reply, 409, "Inbox already shared with this team", { code: "CONFLICT" });
        }

        const teamInbox = await prisma.teamInbox.create({
            data: {
                teamId,
                inboxId,
                addedBy: userId,
            },
            include: {
                inbox: { include: { domain: true } },
            },
        });

        return { teamInbox };
    });

    // Unshare inbox from team
    app.delete("/teams/:teamId/inboxes/:inboxId", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;
        const { teamId, inboxId } = request.params as { teamId: string; inboxId: string };

        // Check if user is owner or admin
        const membership = await prisma.teamMember.findFirst({
            where: {
                teamId,
                userId,
                role: { in: ["OWNER", "ADMIN"] },
            },
        });

        if (!membership) {
            return sendApiError(reply, 403, "Not authorized", { code: "FORBIDDEN" });
        }

        const teamInbox = await prisma.teamInbox.findUnique({
            where: { teamId_inboxId: { teamId, inboxId } },
        });

        if (!teamInbox) {
            return sendApiError(reply, 404, "Shared inbox not found", { code: "NOT_FOUND" });
        }

        await prisma.teamInbox.delete({
            where: { teamId_inboxId: { teamId, inboxId } },
        });

        return { ok: true };
    });

    // Get team's shared inboxes (for viewing messages)
    app.get("/teams/:teamId/inboxes", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;
        const { teamId } = request.params as { teamId: string };

        // Check membership
        const membership = await prisma.teamMember.findFirst({
            where: { teamId, userId },
        });

        if (!membership) {
            return sendApiError(reply, 403, "Not a team member", { code: "FORBIDDEN" });
        }

        const sharedInboxes = await prisma.teamInbox.findMany({
            where: { teamId },
            include: {
                inbox: {
                    include: {
                        domain: true,
                        _count: { select: { messages: true } },
                    },
                },
            },
        });

        return {
            inboxes: sharedInboxes.map((ti) => ({
                ...ti.inbox,
                sharedAt: ti.addedAt,
            })),
        };
    });
}
