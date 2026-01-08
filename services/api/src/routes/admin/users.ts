/**
 * Admin Users Routes
 * User CRUD, bulk operations, tier management
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../utils/audit";
import { UserRole } from "@prisma/client";
import { outboundService } from "../../services/outbound";

export async function adminUsersRoutes(app: FastifyInstance) {
    // List Users with pagination
    app.get("/admin/users", { preHandler: app.requireAdmin }, async (request, reply) => {
        const query = z
            .object({
                search: z.string().optional(),
                role: z.nativeEnum(UserRole).optional(),
                limit: z.coerce.number().min(1).max(100).optional(),
                offset: z.coerce.number().min(0).optional(),
            })
            .safeParse(request.query);

        if (!query.success) {
            return reply.status(400).send({ error: "Invalid query" });
        }

        const where: any = {};

        if (query.data.search) {
            where.email = { contains: query.data.search, mode: "insensitive" };
        }

        if (query.data.role) {
            where.role = query.data.role;
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: query.data.limit ?? 20,
                skip: query.data.offset ?? 0,
                select: {
                    id: true,
                    email: true,
                    role: true,
                    emailVerified: true,
                    createdAt: true,
                    tier: true,
                    subscriptionStatus: true,
                    subscriptionEndsAt: true,
                    stripeSubscriptionId: true,
                    isDisabled: true,
                    _count: {
                        select: { domains: true }
                    }
                }
            }),
            prisma.user.count({ where })
        ]);

        return { data: users, meta: { total } };
    });

    // Update User (role, status, etc.)
    app.patch("/admin/users/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
        const body = z
            .object({
                role: z.nativeEnum(UserRole).optional(),
                isDisabled: z.boolean().optional(),
            })
            .safeParse(request.body);

        if (!params.success || !body.success) {
            return reply.status(400).send({ error: "Invalid payload" });
        }

        const user = await prisma.user.findUnique({ where: { id: params.data.id } });
        if (!user) {
            return reply.status(404).send({ error: "User not found" });
        }

        const adminId = (request.user as any)?.userId;
        if (body.data.isDisabled && params.data.id === adminId) {
            return reply.status(400).send({ error: "Cannot disable your own account" });
        }

        const updated = await prisma.user.update({
            where: { id: params.data.id },
            data: body.data,
            select: {
                id: true,
                email: true,
                role: true,
                tier: true,
                subscriptionStatus: true,
                stripeSubscriptionId: true,
                emailVerified: true,
                createdAt: true,
                isDisabled: true,
            }
        });

        await recordAudit(
            adminId ?? null,
            "USER_UPDATED",
            { targetUserId: params.data.id, changes: body.data }
        );

        if (body.data.isDisabled === true && !user.isDisabled) {
            try {
                await outboundService.sendAccountLockedEmail(user.email);
                request.log.info({ email: user.email }, "Account locked email sent");
            } catch (err) {
                request.log.error({ err, email: user.email }, "Failed to send account locked email");
            }
        }

        return { user: updated };
    });

    // Update User Tier
    app.patch("/admin/users/:id/tier", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        const body = z.object({
            tier: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]),
            status: z.enum(["ACTIVE", "PAST_DUE", "CANCELED", "TRIALING"]).optional(),
        }).safeParse(request.body);

        if (!body.success) return reply.status(400).send({ error: "Invalid payload" });

        let subscriptionEndsAt = undefined;
        if (body.data.tier !== "FREE") {
            const now = new Date();
            now.setDate(now.getDate() + 30);
            subscriptionEndsAt = now;
        } else {
            subscriptionEndsAt = null;
        }

        const updated = await prisma.user.update({
            where: { id: params.id },
            data: {
                tier: body.data.tier,
                subscriptionStatus: body.data.status || "ACTIVE",
                subscriptionEndsAt: subscriptionEndsAt
            }
        });

        await recordAudit((request.user as any).userId, "UPDATE_USER_TIER", {
            targetUserId: params.id,
            tier: body.data.tier
        });

        return { user: updated };
    });

    // Delete User
    app.delete("/admin/users/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

        if (!params.success) {
            return reply.status(400).send({ error: "Invalid user ID" });
        }

        const user = await prisma.user.findUnique({ where: { id: params.data.id } });
        if (!user) {
            return reply.status(404).send({ error: "User not found" });
        }

        const adminId = (request.user as any)?.userId;
        if (params.data.id === adminId) {
            return reply.status(400).send({ error: "Cannot delete your own account" });
        }

        await prisma.$transaction(async (tx) => {
            await tx.message.deleteMany({
                where: { inbox: { domain: { ownerId: params.data.id } } }
            });
            await tx.inbox.deleteMany({
                where: { domain: { ownerId: params.data.id } }
            });
            await tx.domain.deleteMany({
                where: { ownerId: params.data.id }
            });
            await tx.user.delete({ where: { id: params.data.id } });
        });

        await recordAudit(
            adminId ?? null,
            "USER_DELETED",
            { targetUserId: params.data.id, email: user.email }
        );

        return { success: true };
    });

    // Bulk operations on users
    app.post("/admin/users/bulk", { preHandler: app.requireAdmin }, async (request, reply) => {
        const body = z.object({
            userIds: z.array(z.string().uuid()).min(1).max(100),
            action: z.enum(["enable", "disable", "delete"]),
        }).safeParse(request.body);

        if (!body.success) {
            return reply.status(400).send({ error: "Invalid payload", details: body.error.flatten() });
        }

        const adminId = (request.user as any)?.userId;
        const { userIds, action } = body.data;
        const filteredIds = userIds.filter(id => id !== adminId);

        if (filteredIds.length === 0) {
            return reply.status(400).send({ error: "No valid users to update" });
        }

        let affected = 0;

        if (action === "enable") {
            const result = await prisma.user.updateMany({
                where: { id: { in: filteredIds } },
                data: { isDisabled: false }
            });
            affected = result.count;
        } else if (action === "disable") {
            const result = await prisma.user.updateMany({
                where: { id: { in: filteredIds } },
                data: { isDisabled: true }
            });
            affected = result.count;
        } else if (action === "delete") {
            for (const userId of filteredIds) {
                try {
                    await prisma.$transaction(async (tx) => {
                        await tx.message.deleteMany({ where: { inbox: { domain: { ownerId: userId } } } });
                        await tx.inbox.deleteMany({ where: { domain: { ownerId: userId } } });
                        await tx.domain.deleteMany({ where: { ownerId: userId } });
                        await tx.user.delete({ where: { id: userId } });
                    });
                    affected++;
                } catch {
                    // Skip if user not found
                }
            }
        }

        await recordAudit(adminId ?? null, "BULK_USER_ACTION", {
            action,
            requestedCount: filteredIds.length,
            affectedCount: affected
        });

        return { success: true, affected };
    });

    // Force verify user email
    app.post("/admin/users/:id/verify", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

        if (!params.success) {
            return reply.status(400).send({ error: "Invalid user ID" });
        }

        const user = await prisma.user.findUnique({ where: { id: params.data.id } });
        if (!user) {
            return reply.status(404).send({ error: "User not found" });
        }

        if (user.emailVerified) {
            return reply.status(400).send({ error: "User already verified" });
        }

        const updated = await prisma.user.update({
            where: { id: params.data.id },
            data: {
                emailVerified: new Date(),
                verificationToken: null
            },
            select: {
                id: true,
                email: true,
                emailVerified: true,
            }
        });

        await recordAudit(
            (request.user as any)?.userId ?? null,
            "USER_FORCE_VERIFIED",
            { targetUserId: params.data.id }
        );

        return { user: updated };
    });

    // Get current admin profile
    app.get("/admin/profile", { preHandler: app.requireAdmin }, async (request) => {
        const userId = (request.user as any)?.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                emailVerified: true,
                twoFactorEnabled: true,
                _count: {
                    select: { domains: true }
                }
            }
        });
        return { user };
    });
}
