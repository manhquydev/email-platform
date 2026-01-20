/**
 * SePay Payment Service
 * Handles VietQR generation and webhook processing for SePay.vn
 */

import { appConfig } from "../config";
import { prisma } from "../lib/prisma";
import { PackageType, SubscriptionTier, SubscriptionStatus } from "@prisma/client";
import { customAlphabet } from "nanoid";
import crypto from "crypto";

// Generate order code: EP_XXXXXX (uppercase alphanumeric, no confusing chars)
const generateOrderCode = customAlphabet("2346789ABCDEFGHJKLMNPQRTUVWXYZ", 8);

export interface SepayWebhookPayload {
  id: string;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code?: string;
  content: string;
  transferType: "in" | "out";
  transferAmount: number;
  accumulated: number;
  subAccount?: string;
  referenceCode: string;
  description?: string;
}

export interface PendingPaymentResult {
  id: string;
  orderCode: string;
  qrUrl: string;
  amount: number;
  expiresAt: Date;
}

export class SepayService {
  /**
   * Generate VietQR URL for payment
   */
  static generateQrUrl(amount: number, orderCode: string): string {
    const { accountNumber, bankBrand } = appConfig.sepay;
    const content = encodeURIComponent(orderCode);
    return `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${bankBrand}&amount=${amount}&des=${content}`;
  }

  /**
   * Create a pending payment and return QR info
   */
  static async createPendingPayment(userId: string, packageId: string): Promise<PendingPaymentResult> {
    const pkg = await prisma.servicePackage.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.isActive) {
      throw new Error("Package not found or inactive");
    }

    const orderCode = `EP_${generateOrderCode()}`;
    const amount = Number(pkg.price);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const pending = await prisma.pendingPayment.create({
      data: {
        userId,
        packageId,
        orderCode,
        amount: pkg.price,
        currency: pkg.currency,
        expiresAt,
      },
    });

    return {
      id: pending.id,
      orderCode,
      qrUrl: this.generateQrUrl(amount, orderCode),
      amount,
      expiresAt,
    };
  }

  /**
   * Check pending payment status
   */
  static async checkPaymentStatus(orderCode: string): Promise<"PENDING" | "COMPLETED" | "EXPIRED"> {
    const pending = await prisma.pendingPayment.findUnique({
      where: { orderCode },
    });

    if (!pending) return "EXPIRED";
    if (pending.status === "COMPLETED") return "COMPLETED";
    if (new Date() > pending.expiresAt) return "EXPIRED";
    return "PENDING";
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * SePay sends signature in header for verification
   */
  static verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean {
    const { secretKey } = appConfig.sepay;

    // If no secret configured, accept all (dev mode only)
    if (!secretKey) {
      console.warn("⚠️ SePay secret key not configured - accepting all webhook requests (DEV MODE)");
      return true;
    }

    // Get signature from header (SePay uses different header names depending on config)
    const signature = headers["x-sepay-signature"] || headers["authorization"];
    if (!signature) {
      console.warn("SePay webhook: Missing signature header");
      return false;
    }

    const sigValue = Array.isArray(signature) ? signature[0] : signature;

    // If using API Key authentication
    if (sigValue.startsWith("Apikey ")) {
      return sigValue === `Apikey ${secretKey}`;
    }

    // If using HMAC signature verification
    try {
      const expectedSignature = crypto
        .createHmac("sha256", secretKey)
        .update(rawBody)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(sigValue),
        Buffer.from(expectedSignature)
      );
    } catch (err) {
      console.error("SePay webhook signature verification failed:", err);
      return false;
    }
  }

  /**
   * Parse order code from transaction content
   * Banks often append extra text, so we extract EP_XXXXXX pattern
   */
  static parseOrderCode(content: string): string | null {
    const match = content.match(/EP_[2346789ABCDEFGHJKLMNPQRTUVWXYZ]{8}/i);
    return match ? match[0].toUpperCase() : null;
  }

  /**
   * Handle incoming payment webhook
   */
  static async handlePaymentReceived(payload: SepayWebhookPayload): Promise<{ success: boolean; message: string }> {
    // Only process incoming transfers
    if (payload.transferType !== "in") {
      return { success: true, message: "Ignored outgoing transfer" };
    }

    // Parse order code from content
    const orderCode = this.parseOrderCode(payload.content || payload.description || "");
    if (!orderCode) {
      console.warn("SePay webhook: Could not parse order code from content:", payload.content);
      return { success: false, message: "Could not parse order code" };
    }

    // Find pending payment
    const pending = await prisma.pendingPayment.findUnique({
      where: { orderCode },
      include: { package: true, user: true },
    });

    if (!pending) {
      console.warn("SePay webhook: Pending payment not found for:", orderCode);
      return { success: false, message: "Pending payment not found" };
    }

    if (pending.status === "COMPLETED") {
      return { success: true, message: "Payment already processed" };
    }

    // Verify amount matches (with tolerance for rounding)
    const expectedAmount = Number(pending.amount);
    const receivedAmount = payload.transferAmount;
    if (Math.abs(expectedAmount - receivedAmount) > 1) {
      console.warn(`SePay webhook: Amount mismatch. Expected ${expectedAmount}, got ${receivedAmount}`);
      return { success: false, message: "Amount mismatch" };
    }

    // Process payment in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Mark pending payment as completed
      await tx.pendingPayment.update({
        where: { id: pending.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // 2. Create payment record
      await tx.payment.create({
        data: {
          userId: pending.userId,
          amount: pending.amount,
          currency: pending.currency,
          status: "SUCCEEDED",
          sepayTransactionId: payload.id,
          sepayReferenceCode: payload.referenceCode,
          paymentMethod: "SEPAY",
          packageId: pending.packageId,
          paidAt: new Date(),
        },
      });

      // 3. Apply package benefits (TIME_BASED only - USAGE_BASED removed)
      const pkg = pending.package;
      if (pkg.durationDays) {
        const user = await tx.user.findUnique({ where: { id: pending.userId } });
        const now = new Date();
        const currentEnd = user?.subscriptionEndsAt && user.subscriptionEndsAt > now
          ? user.subscriptionEndsAt
          : now;

        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + pkg.durationDays);

        await tx.user.update({
          where: { id: pending.userId },
          data: {
            tier: pkg.targetTier || SubscriptionTier.PROFESSIONAL,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            subscriptionEndsAt: newEnd,
          },
        });
      }
    });

    console.log(`SePay payment processed: ${orderCode} - ${receivedAmount} VND`);
    return { success: true, message: "Payment processed successfully" };
  }

  /**
   * Get user's pending payments
   */
  static async getUserPendingPayments(userId: string) {
    return prisma.pendingPayment.findMany({
      where: {
        userId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      include: { package: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Clean up expired pending payments (called by cron)
   */
  static async cleanupExpiredPayments(): Promise<number> {
    const result = await prisma.pendingPayment.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: {
        status: "EXPIRED",
      },
    });
    return result.count;
  }
}
