/**
 * SePay Payment Routes
 * Handles VietQR checkout and webhook endpoints
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { appConfig } from "../config";
import { SepayService, SepayWebhookPayload } from "../services/sepay.service";
import { recordAudit } from "../utils/audit";
import { sendApiError } from "../utils/errorHandler";

const createCheckoutSchema = z.object({
  packageId: z.string().uuid(),
});

const checkStatusSchema = z.object({
  orderCode: z.string().regex(/^EP_[A-Z0-9]{8}$/i),
});

export const sepayRoutes: FastifyPluginAsync = async (app) => {
  const sepayEnabled = appConfig.sepay.enabled;

  // Create SePay checkout (VietQR)
  app.post("/billing/sepay/checkout", { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
    if (!sepayEnabled) {
      return sendApiError(reply, 503, "SePay payment not configured", {
        code: "SEPAY_UNAVAILABLE",
        details: { message: "VietQR payment is currently unavailable" },
      });
    }

    const user = req.user as { userId: string };
    const result = createCheckoutSchema.safeParse(req.body);
    if (!result.success) {
      return sendApiError(reply, 400, "Invalid payload", { code: "BAD_REQUEST", details: result.error.flatten() });
    }

    try {
      const checkout = await SepayService.createPendingPayment(user.userId, result.data.packageId);

      await recordAudit(user.userId, "SEPAY_CHECKOUT_CREATED", {
        orderCode: checkout.orderCode,
        amount: checkout.amount,
      });

      return {
        orderCode: checkout.orderCode,
        qrUrl: checkout.qrUrl,
        amount: checkout.amount,
        expiresAt: checkout.expiresAt.toISOString(),
      };
    } catch (error: any) {
      return sendApiError(reply, 400, error.message || "Unable to create checkout", { code: "BAD_REQUEST" });
    }
  });

  // Check payment status
  app.get("/billing/sepay/status/:orderCode", { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
    const params = checkStatusSchema.safeParse(req.params);
    if (!params.success) {
      return sendApiError(reply, 400, "Invalid order code", { code: "BAD_REQUEST" });
    }

    const status = await SepayService.checkPaymentStatus(params.data.orderCode);
    return { orderCode: params.data.orderCode, status };
  });

  // Get user's pending payments
  app.get("/billing/sepay/pending", { preHandler: app.authenticate }, async (req: FastifyRequest) => {
    const user = req.user as { userId: string };
    const pending = await SepayService.getUserPendingPayments(user.userId);

    return {
      pending: pending.map((p) => ({
        id: p.id,
        orderCode: p.orderCode,
        qrUrl: SepayService.generateQrUrl(Number(p.amount), p.orderCode),
        amount: Number(p.amount),
        currency: p.currency,
        packageName: p.package.name,
        expiresAt: p.expiresAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
      })),
    };
  });

  // SePay Webhook endpoint (public, no auth - uses Secret Key verification)
  app.post("/sepay/webhook", {
    config: {
      rawBody: true, // Enable raw body for signature verification
      rateLimit: {
        max: 100,
        timeWindow: "1 minute",
      },
    },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Verify webhook authentication
    if (!SepayService.verifyWebhook(req.headers, rawBody)) {
      console.warn("SePay webhook: Invalid authorization");
      return sendApiError(reply, 401, "Unauthorized", { code: "UNAUTHORIZED" });
    }

    const payload = req.body as SepayWebhookPayload;

    // Validate required fields
    if (!payload.id || !payload.transferType || payload.transferAmount === undefined) {
      return sendApiError(reply, 400, "Invalid payload structure", { code: "BAD_REQUEST" });
    }

    try {
      const result = await SepayService.handlePaymentReceived(payload);

      if (result.success) {
        return { success: true, message: result.message };
      } else {
        // Return 200 to acknowledge receipt, even if we couldn't process
        // This prevents SePay from retrying unnecessarily
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      console.error("SePay webhook error:", error);
      return sendApiError(reply, 500, "Internal server error", { code: "INTERNAL_ERROR" });
    }
  });
};
