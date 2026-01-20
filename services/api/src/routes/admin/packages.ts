/**
 * Admin Packages Routes
 * Service package management (CRUD operations)
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../utils/audit";

export async function adminPackagesRoutes(app: FastifyInstance) {
    // List all packages (admin view - includes inactive)
    app.get("/admin/packages", { preHandler: app.requireAdmin }, async () => {
        const packages = await prisma.servicePackage.findMany({
            orderBy: [
                { isActive: 'desc' },
                { createdAt: 'desc' }
            ],
            include: {
                _count: {
                    select: { codes: true }
                }
            }
        });
        return { packages };
    });

    // Create new package (TIME_BASED only - USAGE_BASED removed)
    app.post("/admin/packages", { preHandler: app.requireAdmin }, async (request, reply) => {
        const body = z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            price: z.number().min(0),
            type: z.literal("TIME_BASED").optional().default("TIME_BASED"),
            durationDays: z.number().optional(),
            targetTier: z.enum(["FREE", "STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]).optional(),
            stripePriceId: z.string().optional(),
            stripeProductId: z.string().optional(),
            isActive: z.boolean().optional().default(true),
            // Package features for display
            features: z.array(z.object({
                text: z.string(),
                included: z.boolean()
            })).optional(),
            displayOrder: z.number().optional(),
            recommended: z.boolean().optional(),
            badge: z.string().optional(),
        }).safeParse(request.body);

        if (!body.success) {
            return reply.status(400).send({ error: "Invalid payload", details: body.error.flatten() });
        }

        const pkg = await prisma.servicePackage.create({
            data: {
                ...body.data,
                currency: "VND",
            }
        });

        await recordAudit((request.user as any).userId, "ADMIN_PACKAGE_CREATED", {
            packageId: pkg.id,
            name: pkg.name
        });

        return { package: pkg };
    });

    // Update Service Package (TIME_BASED only)
    app.patch("/admin/packages/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string() }).safeParse(request.params);
        const body = z.object({
            name: z.string().optional(),
            description: z.string().optional(),
            price: z.number().optional(),
            type: z.literal("TIME_BASED").optional(),
            durationDays: z.number().optional(),
            targetTier: z.enum(["FREE", "STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]).optional(),
            stripePriceId: z.string().optional(),
            stripeProductId: z.string().optional(),
            isActive: z.boolean().optional(),
            // Display configuration
            features: z.array(z.object({
                text: z.string(),
                included: z.boolean()
            })).optional(),
            displayOrder: z.number().optional(),
            recommended: z.boolean().optional(),
            badge: z.string().nullable().optional(),
        }).safeParse(request.body);

        if (!params.success || !body.success) return reply.status(400).send({ error: "Invalid payload" });

        const pkg = await prisma.servicePackage.update({
            where: { id: params.data.id },
            data: body.data
        });

        await recordAudit((request.user as any).userId, "ADMIN_PACKAGE_UPDATED", {
            packageId: pkg.id,
            changes: body.data
        });

        return { package: pkg };
    });

    // Delete Service Package
    app.delete("/admin/packages/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string() }).safeParse(request.params);
        if (!params.success) return reply.status(400).send({ error: "Invalid package ID" });

        const packageId = params.data.id;

        // Check if used in codes or payments
        const [codeCount, paymentCount] = await Promise.all([
            prisma.redemptionCode.count({ where: { packageId } }),
            prisma.payment.count({ where: { packageId } })
        ]);

        if (codeCount > 0 || paymentCount > 0) {
            // Soft delete by setting isActive = false if it has history
            await prisma.servicePackage.update({
                where: { id: packageId },
                data: { isActive: false }
            });
            return {
                success: true,
                deactivated: true,
                message: "Gói đã được chuyển sang trạng thái vô hiệu hóa do có lịch sử sử dụng (mã code hoặc thanh toán). Không thể xóa hoàn toàn để đảm bảo tính toàn vẹn dữ liệu."
            };
        }

        await prisma.servicePackage.delete({ where: { id: packageId } });

        await recordAudit((request.user as any).userId, "ADMIN_PACKAGE_DELETED", { packageId });
        return { success: true, message: "Đã xóa gói dịch vụ thành công." };
    });
}
