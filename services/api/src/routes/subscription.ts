import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../utils/audit";
import { customAlphabet } from "nanoid";

const generateCode = customAlphabet("2346789ABCDEFGHJKLMNPQRTUVWXYZ", 12); // removing similar chars like I, 1, O, 0, 5, S

export async function subscriptionRoutes(app: FastifyInstance) {
    // ==========================================
    // Admin: Redemption Codes Management
    // ==========================================
    // NOTE: Package CRUD routes are now in admin/packages.ts

    // List Codes (Paginated)
    app.get("/admin/codes", { preHandler: app.requireAdmin }, async (req, reply) => {
        const schema = z.object({
            limit: z.coerce.number().default(20),
            offset: z.coerce.number().default(0),
            packageId: z.string().optional(),
            search: z.string().optional(),
            status: z.enum(["ACTIVE", "USED", "EXPIRED", "REVOKED"]).optional()
        });

        const queryResult = schema.safeParse(req.query);
        if (!queryResult.success) {
            return reply.status(400).send({ error: 'Invalid query', details: queryResult.error.flatten() });
        }
        const query = queryResult.data;
        const where: any = {};
        if (query.packageId) where.packageId = query.packageId;
        if (query.status) where.status = query.status;
        if (query.search) where.code = { contains: query.search };

        const [codes, total] = await Promise.all([
            prisma.redemptionCode.findMany({
                where,
                take: query.limit,
                skip: query.offset,
                orderBy: { createdAt: "desc" },
                include: { package: { select: { name: true, type: true } } }
            }),
            prisma.redemptionCode.count({ where })
        ]);

        return { data: codes, meta: { total } };
    });

    // Generate Codes
    app.post("/admin/codes/generate", { preHandler: app.requireAdmin }, async (req, reply) => {
        const schema = z.object({
            packageId: z.string().uuid(),
            quantity: z.number().min(1).max(100).default(1),
            prefix: z.string().max(10).optional(),
            maxUses: z.number().min(1).default(1),
            expiresAt: z.string().optional(), // ISO Status
        });

        const bodyResult = schema.safeParse(req.body);
        if (!bodyResult.success) {
            return reply.status(400).send({ error: 'Invalid payload', details: bodyResult.error.flatten() });
        }
        const body = bodyResult.data;

        const pkg = await prisma.servicePackage.findUnique({ where: { id: body.packageId } });
        if (!pkg) return reply.status(404).send({ error: "Package not found" });

        const codesData = [];
        const createdBy = (req.user as any).userId;

        for (let i = 0; i < body.quantity; i++) {
            const codeStr = (body.prefix || "") + generateCode();
            // Ensure format like AAAA-BBBB-CCCC for readability if long? 
            // Let's stick to simple string for now, user can format if needed.
            // Or hyphenate: XXXX-XXXX-XXXX
            const formatted = codeStr.match(/.{1,4}/g)?.join("-") || codeStr;

            codesData.push({
                code: formatted,
                packageId: pkg.id,
                maxUses: body.maxUses,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
                status: "ACTIVE" as const
            });
        }

        // Use transaction to ensure all or nothing
        const created = await prisma.$transaction(
            codesData.map(c => prisma.redemptionCode.create({ data: c }))
        );

        await recordAudit(createdBy, "GENERATE_CODES", {
            packageName: pkg.name,
            quantity: body.quantity,
            prefix: body.prefix
        });

        return { count: created.length, codes: created };
    });

    // Revoke Code
    app.put("/admin/codes/:id/revoke", { preHandler: app.requireAdmin }, async (req, reply) => {
        const idResult = z.object({ id: z.string().uuid() }).safeParse(req.params);
        if (!idResult.success) {
            return reply.status(400).send({ error: 'Invalid params', details: idResult.error.flatten() });
        }
        const { id } = idResult.data;

        const updated = await prisma.redemptionCode.update({
            where: { id },
            data: { status: "REVOKED" }
        });

        return { code: updated };
    });

    // Delete Code
    app.delete("/admin/codes/:id", { preHandler: app.requireAdmin }, async (req, reply) => {
        const idResult = z.object({ id: z.string().uuid() }).safeParse(req.params);
        if (!idResult.success) {
            return reply.status(400).send({ error: 'Invalid params', details: idResult.error.flatten() });
        }
        const { id } = idResult.data;

        await prisma.$transaction([
            prisma.codeRedemption.deleteMany({ where: { codeId: id } }),
            prisma.redemptionCode.delete({ where: { id } })
        ]);

        await recordAudit((req.user as any).userId, "DELETE_CODE", { codeId: id });

        return { success: true };
    });

    // ==========================================
    // User: Redemption
    // ==========================================

    app.post("/subscription/redeem", {
        preHandler: app.authenticate,
        config: {
            rateLimit: {
                max: 5,
                timeWindow: "1 hour",
                keyGenerator: (req) => (req.user as any)?.userId || req.ip // Limit per user or IP
            }
        }
    }, async (req, reply) => {
        const schema = z.object({
            code: z.string().min(4)
        });

        const codeResult = schema.safeParse(req.body);
        if (!codeResult.success) {
            return reply.status(400).send({ error: 'Invalid payload', details: codeResult.error.flatten() });
        }
        const { code } = codeResult.data;
        const userId = (req.user as any).userId;

        // 1. Find code
        const redemptionCode = await prisma.redemptionCode.findUnique({
            where: { code },
            include: { package: true }
        });

        if (!redemptionCode) {
            return reply.status(404).send({ error: "Code invalid or not found" });
        }

        // 2. Validate status
        if (redemptionCode.status !== "ACTIVE") {
            return reply.status(400).send({ error: "Code is not active" });
        }

        if (redemptionCode.expiresAt && new Date() > redemptionCode.expiresAt) {
            // Auto update status to EXPIRED?
            return reply.status(400).send({ error: "Code has expired" });
        }

        if (redemptionCode.usedCount >= redemptionCode.maxUses) {
            return reply.status(400).send({ error: "Code usage limit reached" });
        }

        // 3. Check if user already redeemed this specific code (if unique usage is desired per code per user)
        // Usually, even multi-use codes (like PROMO2024) can only be used ONCE per user.
        const existingRedemption = await prisma.codeRedemption.findFirst({
            where: { codeId: redemptionCode.id, userId }
        });

        if (existingRedemption) {
            return reply.status(400).send({ error: "You have already redeemed this code" });
        }

        // 4. Apply Benefits
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return reply.status(404).send({ error: "User not found" });

        const pkg = redemptionCode.package;

        await prisma.$transaction(async (tx) => {
            // 1. Atomic Check & Increment
            // We increment first, then check if we exceeded the limit.
            // This relies on the atomicity of the UPDATE operation in the DB.
            const updatedCode = await tx.redemptionCode.update({
                where: { id: redemptionCode.id },
                data: {
                    usedCount: { increment: 1 }
                }
            });

            if (updatedCode.usedCount > updatedCode.maxUses) {
                // We exceeded the limit, so this redemption is invalid.
                // Throwing an error will automaticall rollback the transaction (decrementing the count back).
                throw new Error("Code usage limit reached");
            }

            // 2. If we just hit the limit, close the code
            if (updatedCode.usedCount === updatedCode.maxUses) {
                await tx.redemptionCode.update({
                    where: { id: redemptionCode.id },
                    data: { status: "USED" }
                });
            }

            // 3. Create Log (Double check unique redemption inside tx for strictness)
            // Even though we checked before, a race condition could have happened there too.
            // A unique constraint on the DB table (userId_codeId) would be the ultimate fix for single-user-double-claim.
            // Assuming schema has unique constraint, this will throw if duplicate.
            await tx.codeRedemption.create({
                data: {
                    codeId: redemptionCode.id,
                    userId
                }
            });

            // 4. Update User Benefits
            // Update User
            if (pkg.type === "TIME_BASED") {
                const now = new Date();
                // Re-fetch user inside TX to get lock/latest data if needed, 
                // but strictly for expiration date calculation, using the previously fetched user is 'okay' 
                // as long as we don't overwrite concurrent unrelated updates.
                // However, let's just use the current user state for safety.
                const userInTx = await tx.user.findUniqueOrThrow({ where: { id: userId } });

                const currentEnd = userInTx.subscriptionEndsAt && userInTx.subscriptionEndsAt > now
                    ? userInTx.subscriptionEndsAt
                    : now;

                // Add duration
                const days = pkg.durationDays || 30;
                const newEnd = new Date(currentEnd);
                newEnd.setDate(newEnd.getDate() + days);

                await tx.user.update({
                    where: { id: userId },
                    data: {
                        tier: pkg.targetTier || userInTx.tier, // Upgrade tier if specified
                        subscriptionStatus: "ACTIVE",
                        subscriptionEndsAt: newEnd
                    }
                });
            } else if (pkg.type === "USAGE_BASED") {
                const creditsToAdd = pkg.creditAmount || 0;
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        credits: { increment: creditsToAdd }
                    }
                });
            }
        });

        await recordAudit(userId, "REDEEM_CODE", { code: redemptionCode.code, package: pkg.name });

        return { success: true, message: `Redeemed: ${pkg.name}` };
    });
}
