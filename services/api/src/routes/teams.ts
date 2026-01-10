import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export async function teamRoutes(app: FastifyInstance) {
    // Create a new team
    app.post("/teams", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;

        const schema = z.object({
            name: z.string().min(1).max(100),
            description: z.string().max(500).optional(),
        });

        const parsed = schema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
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
            return reply.status(404).send({ error: "Team not found" });
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
            return reply.status(404).send({ error: "Team not found or not owner" });
        }

        const schema = z.object({
            name: z.string().min(1).max(100).optional(),
            description: z.string().max(500).optional(),
        });

        const parsed = schema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "Invalid payload" });
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
            return reply.status(404).send({ error: "Team not found or not owner" });
        }

        await prisma.team.delete({ where: { id: teamId } });

        return { ok: true };
    });

    // Add member to team
    app.post("/teams/:teamId/members", { preHandler: app.authenticate }, async (request, reply) => {
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
            return reply.status(403).send({ error: "Not authorized to add members" });
        }

        const schema = z.object({
            email: z.string().email(),
            role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
        });

        const parsed = schema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "Invalid payload" });
        }

        const { email, role } = parsed.data;

        // Find user by email
        const targetUser = await prisma.user.findUnique({ where: { email } });
        if (!targetUser) {
            return reply.status(404).send({ error: "User not found" });
        }

        // Check if already a member
        const existing = await prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: targetUser.id } },
        });

        if (existing) {
            return reply.status(409).send({ error: "User is already a member" });
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
            return reply.status(403).send({ error: "Not authorized to remove members" });
        }

        const targetMember = await prisma.teamMember.findUnique({
            where: { id: memberId },
        });

        if (!targetMember || targetMember.teamId !== teamId) {
            return reply.status(404).send({ error: "Member not found" });
        }

        if (targetMember.role === "OWNER") {
            return reply.status(403).send({ error: "Cannot remove team owner" });
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
            return reply.status(403).send({ error: "Not authorized to share inboxes" });
        }

        const schema = z.object({
            inboxId: z.string().uuid(),
        });

        const parsed = schema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "Invalid payload" });
        }

        const { inboxId } = parsed.data;

        // Verify inbox ownership
        const inbox = await prisma.inbox.findFirst({
            where: { id: inboxId, ownerId: userId },
        });

        if (!inbox) {
            return reply.status(404).send({ error: "Inbox not found or not owned by you" });
        }

        // Check if already shared
        const existing = await prisma.teamInbox.findUnique({
            where: { teamId_inboxId: { teamId, inboxId } },
        });

        if (existing) {
            return reply.status(409).send({ error: "Inbox already shared with this team" });
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
            return reply.status(403).send({ error: "Not authorized" });
        }

        const teamInbox = await prisma.teamInbox.findUnique({
            where: { teamId_inboxId: { teamId, inboxId } },
        });

        if (!teamInbox) {
            return reply.status(404).send({ error: "Shared inbox not found" });
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
            return reply.status(403).send({ error: "Not a team member" });
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
