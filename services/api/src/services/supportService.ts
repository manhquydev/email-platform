import { prisma } from "../lib/prisma";
import { TicketStatus, TicketPriority, TicketCategory } from "@prisma/client";

export interface CreateTicketInput {
  userId: string;
  subject: string;
  category: TicketCategory;
  content: string; // Initial message content
}

export interface CreateMessageInput {
  ticketId: string;
  userId: string;
  content: string;
  isInternal?: boolean;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
}

/**
 * Support Ticket Service - handles all ticket-related business logic
 */
export const supportService = {
  /**
   * Create a new support ticket with initial message
   */
  async createTicket(input: CreateTicketInput) {
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: input.userId,
        subject: input.subject,
        category: input.category,
        status: TicketStatus.OPEN,
        priority: TicketPriority.NORMAL,
        messages: {
          create: {
            userId: input.userId,
            content: input.content,
            isInternal: false,
          },
        },
      },
      include: {
        messages: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
    return ticket;
  },

  /**
   * Get tickets for a specific user
   */
  async getUserTickets(userId: string, filters?: TicketFilters) {
    const where: any = { userId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.category) where.category = filters.category;

    return prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        messages: {
          where: { isInternal: false }, // Users don't see internal notes
          orderBy: { createdAt: "desc" },
          take: 1, // Only latest message for list view
        },
        _count: { select: { messages: true } },
      },
    });
  },

  /**
   * Get all tickets (admin only)
   */
  async getAllTickets(filters?: TicketFilters, limit = 50, offset = 0) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.category) where.category = filters.category;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: { select: { messages: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return { tickets, total, limit, offset };
  },

  /**
   * Get single ticket with all messages
   */
  async getTicketById(ticketId: string, includeInternal = false) {
    const messagesWhere = includeInternal ? {} : { isInternal: false };

    return prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        messages: {
          where: messagesWhere,
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, email: true, name: true, role: true } },
          },
        },
      },
    });
  },

  /**
   * Add a message to a ticket
   */
  async addMessage(input: CreateMessageInput) {
    // Update ticket status based on who's replying
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: input.ticketId },
      select: { userId: true, status: true },
    });

    if (!ticket) throw new Error("Ticket not found");

    const isUserReply = ticket.userId === input.userId;
    const newStatus = isUserReply
      ? TicketStatus.WAITING_SUPPORT
      : TicketStatus.WAITING_USER;

    // Create message and update ticket status in transaction
    const [message] = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId: input.ticketId,
          userId: input.userId,
          content: input.content,
          isInternal: input.isInternal ?? false,
        },
        include: {
          user: { select: { id: true, email: true, name: true, role: true } },
        },
      }),
      // Only update status if not internal note
      ...(input.isInternal
        ? []
        : [
            prisma.supportTicket.update({
              where: { id: input.ticketId },
              data: { status: newStatus },
            }),
          ]),
    ]);

    return message;
  },

  /**
   * Update ticket status/priority (admin only)
   */
  async updateTicket(ticketId: string, input: UpdateTicketInput) {
    const data: any = {};
    if (input.status) {
      data.status = input.status;
      if (input.status === TicketStatus.CLOSED || input.status === TicketStatus.RESOLVED) {
        data.closedAt = new Date();
      }
    }
    if (input.priority) data.priority = input.priority;

    return prisma.supportTicket.update({
      where: { id: ticketId },
      data,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
  },

  /**
   * Check if user owns a ticket
   */
  async userOwnsTicket(ticketId: string, userId: string): Promise<boolean> {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
      select: { id: true },
    });
    return !!ticket;
  },

  /**
   * Get ticket stats for admin dashboard
   */
  async getTicketStats() {
    const [open, waitingUser, waitingSupport, resolved, closed] = await Promise.all([
      prisma.supportTicket.count({ where: { status: TicketStatus.OPEN } }),
      prisma.supportTicket.count({ where: { status: TicketStatus.WAITING_USER } }),
      prisma.supportTicket.count({ where: { status: TicketStatus.WAITING_SUPPORT } }),
      prisma.supportTicket.count({ where: { status: TicketStatus.RESOLVED } }),
      prisma.supportTicket.count({ where: { status: TicketStatus.CLOSED } }),
    ]);

    return {
      open,
      waitingUser,
      waitingSupport,
      resolved,
      closed,
      total: open + waitingUser + waitingSupport + resolved + closed,
    };
  },
};
