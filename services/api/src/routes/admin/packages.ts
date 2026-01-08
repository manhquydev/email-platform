/**
 * Admin Packages Routes
 * Service package management (update, delete)
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../utils/audit";

export async function adminPackagesRoutes(app: FastifyInstance) {
    // Update Service Package
    app.patch("/admin/packages/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
        const params = z.object({ id: z.string() }).safeParse(request.params);
        const body = z.object({
            name: z.string().optional(),
            description: z.string().optional(),
            price: z.number().optional(),
            type: z.enum(["TIME_BASED", "USAGE_BASED"]).optional(),
            durationDays: z.number().optional(),
            creditAmount: z.number().optional(),
            targetTier: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional(),
            stripePriceId: z.string().optional(),
            stripeProductId: z.string().optional(),
            isActive: z.boolean().optional(),
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
