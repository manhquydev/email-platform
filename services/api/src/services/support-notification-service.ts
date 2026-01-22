/**
 * Support Notification Service
 * Handles email and in-app notifications for support tickets
 */

import { OutboundService } from "./outbound";
import { realtimeEvents } from "./realtime-events";
import { ticketCreatedEmailTemplate, ticketReplyEmailTemplate } from "./support-email-templates";
import { prisma } from "../lib/prisma";

const outbound = new OutboundService();

interface TicketCreatedNotificationParams {
  ticketId: string;
  userId: string;
  userEmail: string;
  subject: string;
  category: string;
}

interface TicketReplyNotificationParams {
  ticketId: string;
  ticketSubject: string;
  recipientUserId: string;
  recipientEmail: string;
  replierName: string;
  replyContent: string;
  isInternal: boolean;
}

/**
 * Support Notification Service - handles all ticket-related notifications
 */
export const supportNotificationService = {
  /**
   * Send notification when a new ticket is created
   */
  async notifyTicketCreated(params: TicketCreatedNotificationParams): Promise<void> {
    try {
      // 1. Send email to user confirming ticket creation
      const emailTemplate = ticketCreatedEmailTemplate({
        recipientEmail: params.userEmail,
        ticketId: params.ticketId,
        subject: params.subject,
        category: params.category,
      });

      const fromAddress = process.env.MAIL_FROM_ADDRESS || "noreply@ephemera.app";
      await outbound.sendEmail(
        fromAddress,
        params.userEmail,
        emailTemplate.subject,
        emailTemplate.text,
        emailTemplate.html
      );

      // 2. Send in-app notification to user
      await realtimeEvents.publishNotification(params.userId, {
        id: `ticket-created-${params.ticketId}`,
        type: "support",
        title: "Ticket đã được tạo",
        message: `Yêu cầu hỗ trợ "${params.subject}" đã được tiếp nhận`,
        link: `/support/tickets/${params.ticketId}`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      // 3. Notify all admins about new ticket (in-app only)
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      for (const admin of admins) {
        await realtimeEvents.publishNotification(admin.id, {
          id: `admin-ticket-new-${params.ticketId}`,
          type: "support",
          title: "Ticket mới",
          message: `Ticket mới: "${params.subject}" từ ${params.userEmail}`,
          link: `/admin/support/${params.ticketId}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      console.log(`[SupportNotification] Ticket created notification sent for ${params.ticketId}`);
    } catch (error) {
      console.error("[SupportNotification] Failed to send ticket created notification:", error);
      // Don't throw - notification failure shouldn't break ticket creation
    }
  },

  /**
   * Send notification when admin replies to a ticket
   */
  async notifyAdminReply(params: TicketReplyNotificationParams): Promise<void> {
    // Don't notify for internal notes
    if (params.isInternal) return;

    try {
      // 1. Send email to ticket owner
      const emailTemplate = ticketReplyEmailTemplate({
        recipientEmail: params.recipientEmail,
        ticketId: params.ticketId,
        ticketSubject: params.ticketSubject,
        replierName: params.replierName,
        replyContent: params.replyContent,
      });

      const fromAddress = process.env.MAIL_FROM_ADDRESS || "noreply@ephemera.app";
      await outbound.sendEmail(
        fromAddress,
        params.recipientEmail,
        emailTemplate.subject,
        emailTemplate.text,
        emailTemplate.html
      );

      // 2. Send in-app notification to ticket owner
      await realtimeEvents.publishNotification(params.recipientUserId, {
        id: `ticket-reply-${params.ticketId}-${Date.now()}`,
        type: "support",
        title: "Phản hồi ticket",
        message: `${params.replierName} đã phản hồi ticket "${params.ticketSubject}"`,
        link: `/support/tickets/${params.ticketId}`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      console.log(`[SupportNotification] Admin reply notification sent for ${params.ticketId}`);
    } catch (error) {
      console.error("[SupportNotification] Failed to send admin reply notification:", error);
    }
  },

  /**
   * Send notification when user replies to a ticket (notify admins)
   */
  async notifyUserReply(params: {
    ticketId: string;
    ticketSubject: string;
    userEmail: string;
  }): Promise<void> {
    try {
      // Notify all admins about user reply (in-app only)
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      for (const admin of admins) {
        await realtimeEvents.publishNotification(admin.id, {
          id: `admin-ticket-reply-${params.ticketId}-${Date.now()}`,
          type: "support",
          title: "Phản hồi ticket",
          message: `${params.userEmail} đã phản hồi ticket "${params.ticketSubject}"`,
          link: `/admin/support/${params.ticketId}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      console.log(`[SupportNotification] User reply notification sent to admins for ${params.ticketId}`);
    } catch (error) {
      console.error("[SupportNotification] Failed to send user reply notification:", error);
    }
  },
};
