import { FastifyInstance } from "fastify";
import { z } from "zod";
import { TicketStatus, TicketPriority, TicketCategory } from "@prisma/client";
import { supportService } from "../services/supportService";
import { recordAudit } from "../utils/audit";
import { supportNotificationService } from "../services/support-notification-service";
import { sendApiError } from "../utils/errorHandler";

/**
 * Support Ticket Routes
 * - User routes: /support/tickets/*
 * - Admin routes: /admin/support/tickets/*
 */
export async function supportRoutes(app: FastifyInstance) {
  // ==================== USER ROUTES ====================

  /**
   * POST /support/tickets - Create a new ticket
   */
  app.post("/support/tickets", { preHandler: app.authenticate }, async (request, reply) => {
    const body = z
      .object({
        subject: z.string().min(5).max(200),
        category: z.nativeEnum(TicketCategory),
        content: z.string().min(10).max(5000),
      })
      .safeParse(request.body);

    if (!body.success) {
      return sendApiError(reply, 400, "Invalid payload", { code: "BAD_REQUEST", details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;
    const ticket = await supportService.createTicket({
      userId,
      subject: body.data.subject,
      category: body.data.category,
      content: body.data.content,
    });

    await recordAudit(userId, "SUPPORT_TICKET_CREATED", { ticketId: ticket.id });

    // Send notifications (async, dont block response)
    supportNotificationService.notifyTicketCreated({
      ticketId: ticket.id,
      userId,
      userEmail: ticket.user?.email || "",
      subject: body.data.subject,
      category: body.data.category,
    });
    return reply.status(201).send({ ticket });
  });

  /**
   * GET /support/tickets - List user's tickets
   */
  app.get("/support/tickets", { preHandler: app.authenticate }, async (request) => {
    const query = z
      .object({
        status: z.nativeEnum(TicketStatus).optional(),
        priority: z.nativeEnum(TicketPriority).optional(),
        category: z.nativeEnum(TicketCategory).optional(),
      })
      .safeParse(request.query);

    const userId = (request.user as any).userId;
    const filters = query.success ? query.data : {};
    const tickets = await supportService.getUserTickets(userId, filters);

    return { data: tickets };
  });

  /**
   * GET /support/tickets/:id - Get single ticket with messages
   */
  app.get("/support/tickets/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return sendApiError(reply, 400, "Invalid ticket ID", { code: "BAD_REQUEST" });
    }

    const userId = (request.user as any).userId;
    const ownsTicket = await supportService.userOwnsTicket(params.data.id, userId);
    if (!ownsTicket) {
      return sendApiError(reply, 404, "Ticket not found", { code: "NOT_FOUND" });
    }

    const ticket = await supportService.getTicketById(params.data.id, false);
    return { ticket };
  });

  /**
   * POST /support/tickets/:id/messages - Reply to ticket
   */
  app.post("/support/tickets/:id/messages", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ content: z.string().min(1).max(5000) }).safeParse(request.body);

    if (!params.success || !body.success) {
      return sendApiError(reply, 400, "Invalid payload", { code: "BAD_REQUEST" });
    }

    const userId = (request.user as any).userId;
    const ownsTicket = await supportService.userOwnsTicket(params.data.id, userId);
    if (!ownsTicket) {
      return sendApiError(reply, 404, "Ticket not found", { code: "NOT_FOUND" });
    }

    const message = await supportService.addMessage({
      ticketId: params.data.id,
      userId,
      content: body.data.content,
      isInternal: false,
    });

    await recordAudit(userId, "SUPPORT_MESSAGE_SENT", { ticketId: params.data.id });

    // Notify admins about user reply
    const ticketInfo = await supportService.getTicketById(params.data.id, false);
    if (ticketInfo) {
      supportNotificationService.notifyUserReply({
        ticketId: params.data.id,
        ticketSubject: ticketInfo.subject,
        userEmail: ticketInfo.user?.email || "",
      });
    }
    return reply.status(201).send({ message });
  });

  // ==================== ADMIN ROUTES ====================

  /**
   * GET /admin/support/tickets - List all tickets
   */
  app.get("/admin/support/tickets", { preHandler: app.requireAdmin }, async (request) => {
    const query = z
      .object({
        status: z.nativeEnum(TicketStatus).optional(),
        priority: z.nativeEnum(TicketPriority).optional(),
        category: z.nativeEnum(TicketCategory).optional(),
        limit: z.coerce.number().min(1).max(200).default(50),
        offset: z.coerce.number().min(0).default(0),
      })
      .safeParse(request.query);

    const filters = query.success ? query.data : {};
    const { limit, offset, ...ticketFilters } = filters as any;
    const result = await supportService.getAllTickets(ticketFilters, limit ?? 50, offset ?? 0);

    return { data: result.tickets, total: result.total, limit: result.limit, offset: result.offset };
  });

  /**
   * GET /admin/support/tickets/stats - Get ticket statistics
   */
  app.get("/admin/support/tickets/stats", { preHandler: app.requireAdmin }, async () => {
    const stats = await supportService.getTicketStats();
    return { stats };
  });

  /**
   * GET /admin/support/tickets/:id - Get single ticket (with internal notes)
   */
  app.get("/admin/support/tickets/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return sendApiError(reply, 400, "Invalid ticket ID", { code: "BAD_REQUEST" });
    }

    const ticket = await supportService.getTicketById(params.data.id, true);
    if (!ticket) {
      return sendApiError(reply, 404, "Ticket not found", { code: "NOT_FOUND" });
    }

    return { ticket };
  });

  /**
   * PATCH /admin/support/tickets/:id - Update ticket status/priority
   */
  app.patch("/admin/support/tickets/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z
      .object({
        status: z.nativeEnum(TicketStatus).optional(),
        priority: z.nativeEnum(TicketPriority).optional(),
      })
      .safeParse(request.body);

    if (!params.success || !body.success) {
      return sendApiError(reply, 400, "Invalid payload", { code: "BAD_REQUEST" });
    }

    const ticket = await supportService.updateTicket(params.data.id, body.data);
    await recordAudit((request.user as any).userId, "SUPPORT_TICKET_UPDATED", {
      ticketId: params.data.id,
      changes: body.data,
    });

    return { ticket };
  });

  /**
   * POST /admin/support/tickets/:id/messages - Admin reply (with internal note option)
   */
  app.post("/admin/support/tickets/:id/messages", { preHandler: app.requireAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z
      .object({
        content: z.string().min(1).max(5000),
        isInternal: z.boolean().default(false),
      })
      .safeParse(request.body);

    if (!params.success || !body.success) {
      return sendApiError(reply, 400, "Invalid payload", { code: "BAD_REQUEST" });
    }

    const userId = (request.user as any).userId;
    const message = await supportService.addMessage({
      ticketId: params.data.id,
      userId,
      content: body.data.content,
      isInternal: body.data.isInternal,
    });

    // Notify user about admin reply (if not internal)
    if (!body.data.isInternal) {
      const ticketInfo = await supportService.getTicketById(params.data.id, true);
      if (ticketInfo) {
        supportNotificationService.notifyAdminReply({
          ticketId: params.data.id,
          ticketSubject: ticketInfo.subject,
          recipientUserId: ticketInfo.userId,
          recipientEmail: ticketInfo.user?.email || "",
          replierName: "Đội ngũ hỗ trợ",
          replyContent: body.data.content,
          isInternal: body.data.isInternal,
        });
      }
    }

    await recordAudit(userId, "SUPPORT_ADMIN_REPLY", {
      ticketId: params.data.id,
      isInternal: body.data.isInternal,
    });

    return reply.status(201).send({ message });
  });
}
