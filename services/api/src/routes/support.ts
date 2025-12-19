import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../services/emailService';

const prisma = new PrismaClient();

const ticketSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  subject: z.string().min(5, 'Subject is required'),
  category: z.enum(['general', 'technical', 'billing', 'feature', 'bug', 'account']),
  message: z.string().min(10, 'Message is required'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  userId: z.string().uuid().optional()
});

export default async function supportRoutes(fastify: FastifyInstance) {
  // Submit support ticket
  fastify.post('/support/tickets', {
    schema: {
      body: ticketSchema
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const userId = (request.user as any)?.userId;

      // Check if user is authenticated or allow anonymous for certain categories
      if (!userId && !['general', 'billing'].includes(body.category)) {
        return reply.status(401).send({
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Please log in to submit a support ticket for this category'
        });
      }

      // Create support ticket
      const ticket = await prisma.supportTicket.create({
        data: {
          userId: userId || null,
          name: body.name,
          email: body.email,
          subject: body.subject,
          category: body.category,
          message: body.message,
          priority: body.priority,
          status: 'open'
        }
      });

      // Send confirmation email
      await sendEmail({
        to: body.email,
        subject: `Support Ticket #${ticket.id.slice(-6).toUpperCase()} Created`,
        template: 'support-ticket-confirmation',
        data: {
          ticketId: ticket.id,
          subject: body.subject,
          customerName: body.name,
          category: body.category
        }
      });

      // Send notification to support team
      if (body.priority === 'critical' || body.priority === 'high') {
        await sendEmail({
          to: process.env.SUPPORT_EMAIL || 'support@manhquy.click',
          subject: `New ${body.priority} priority support ticket: ${body.subject}`,
          template: 'support-team-notification',
          data: {
            ticketId: ticket.id,
            subject: body.subject,
            category: body.category,
            priority: body.priority,
            customerName: body.name,
            customerEmail: body.email,
            message: body.message
          }
        });
      }

      reply.send({
        success: true,
        ticketId: ticket.id,
        message: 'Support ticket created successfully'
      });

    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({
        error: 'TICKET_CREATION_FAILED',
        message: 'Failed to create support ticket'
      });
    }
  });

  // Get ticket details (for authenticated users)
  fastify.get('/support/tickets/:ticketId', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { ticketId } = request.params as any;
      const userId = (request.user as any).userId;

      const ticket = await prisma.supportTicket.findFirst({
        where: {
          id: ticketId,
          OR: [
            { userId },
            { userId: null } // Public tickets
          ]
        },
        include: {
          replies: {
            orderBy: {
              createdAt: 'asc'
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              tier: true
            }
          }
        }
      });

      if (!ticket) {
        return reply.status(404).send({
          error: 'TICKET_NOT_FOUND',
          message: 'Support ticket not found'
        });
      }

      // If ticket has a userId and it doesn't match current user, deny access
      if (ticket.userId && ticket.userId !== userId) {
        return reply.status(403).send({
          error: 'ACCESS_DENIED',
          message: 'You do not have permission to view this ticket'
        });
      }

      reply.send({
        ticket
      });

    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({
        error: 'FETCH_TICKET_FAILED',
        message: 'Failed to fetch support ticket'
      });
    }
  });

  // Get user's tickets
  fastify.get('/support/tickets', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { page = 1, limit = 20, status, category } = request.query as any;

      const where: any = {
        userId
      };

      if (status) {
        where.status = status;
      }

      if (category) {
        where.category = category;
      }

      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          include: {
            _count: {
              select: {
                replies: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: limit,
          skip: (page - 1) * limit
        }),
        prisma.supportTicket.count({ where })
      ]);

      reply.send({
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({
        error: 'FETCH_TICKETS_FAILED',
        message: 'Failed to fetch support tickets'
      });
    }
  });

  // Add reply to ticket
  fastify.post('/support/tickets/:ticketId/replies', {
    preHandler: [fastify.authenticate]
  }, {
    schema: {
      body: z.object({
        message: z.string().min(1),
        isInternal: z.boolean().default(false)
      })
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { ticketId } = request.params as any;
      const { message, isInternal } = request.body as any;
      const userId = (request.user as any).userId;

      // Check if ticket exists and user has access
      const ticket = await prisma.supportTicket.findFirst({
        where: {
          id: ticketId,
          OR: [
            { userId },
            { userId: null }
          ]
        }
      });

      if (!ticket) {
        return reply.status(404).send({
          error: 'TICKET_NOT_FOUND',
          message: 'Support ticket not found'
        });
      }

      if (ticket.userId && ticket.userId !== userId) {
        return reply.status(403).send({
          error: 'ACCESS_DENIED',
          message: 'You do not have permission to reply to this ticket'
        });
      }

      // Create reply
      const replyObj = await prisma.supportReply.create({
        data: {
          ticketId,
          userId,
          message,
          isInternal
        }
      });

      // Update ticket status if it was closed
      if (ticket.status === 'closed') {
        await prisma.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'open' }
        });
      }

      // Send email notification
      if (isInternal) {
        await sendEmail({
          to: ticket.email,
          subject: `Update on your support ticket #${ticketId.slice(-6).toUpperCase()}`,
          template: 'support-reply-notification',
          data: {
            ticketId: ticket.id,
            subject: ticket.subject,
            message: message
          }
        });
      }

      reply.send({
        success: true,
        reply: replyObj
      });

    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({
        error: 'REPLY_CREATION_FAILED',
        message: 'Failed to create reply'
      });
    }
  });

  // Close ticket
  fastify.post('/support/tickets/:ticketId/close', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { ticketId } = request.params as any;
      const userId = (request.user as any).userId;

      const ticket = await prisma.supportTicket.findFirst({
        where: { id: ticketId }
      });

      if (!ticket) {
        return reply.status(404).send({
          error: 'TICKET_NOT_FOUND',
          message: 'Support ticket not found'
        });
      }

      if (ticket.userId !== userId) {
        return reply.status(403).send({
          error: 'ACCESS_DENIED',
          message: 'You do not have permission to close this ticket'
        });
      }

      const updatedTicket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'closed',
          closedAt: new Date()
        }
      });

      // Send confirmation email
      await sendEmail({
        to: ticket.email,
        subject: `Support ticket #${ticketId.slice(-6).toUpperCase()} has been closed`,
        template: 'support-ticket-closed',
        data: {
          ticketId: ticket.id,
          subject: ticket.subject
        }
      });

      reply.send({
        success: true,
        ticket: updatedTicket
      });

    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({
        error: 'TICKET_CLOSING_FAILED',
        message: 'Failed to close support ticket'
      });
    }
  });

  // Get support statistics (admin only)
  fastify.get('/support/stats', {
    preHandler: [fastify.authenticate, async (request, reply) => {
      const user = request.user as any;
      if (user.role !== 'ADMIN') {
        return reply.status(403).send({
          error: 'ACCESS_DENIED',
          message: 'Admin access required'
        });
      }
    }]
  }, async (request: FastifyReply) => {
    try {
      const stats = await prisma.supportTicket.groupBy({
        by: ['status', 'category', 'priority'],
        _count: true
      });

      const totalTickets = await prisma.supportTicket.count();
      const openTickets = await prisma.supportTicket.count({
        where: { status: 'open' }
      });

      // Calculate average response time
      const avgResponseTime = await prisma.supportReply.aggregate({
        _avg: {
          responseTime: true
        }
      });

      reply.send({
        totalTickets,
        openTickets,
        stats,
        avgResponseTime: avgResponseTime._avg.responseTime || 0
      });

    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({
        error: 'STATS_FETCH_FAILED',
        message: 'Failed to fetch support statistics'
      });
    }
  });
}

/*
Add support models to schema:

model SupportTicket {
  id          String   @id @default(uuid())
  userId      String?
  name        String
  email       String
  subject     String
  category    String   // general, technical, billing, feature, bug, account
  message     String
  priority    String   @default("normal") // low, normal, high, critical
  status      String   @default("open") // open, in_progress, closed, resolved
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  closedAt    DateTime?
  replies     SupportReply[]
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([status])
  @@index([category])
  @@index([priority])
  @@index([createdAt])
}

model SupportReply {
  id          String   @id @default(uuid())
  ticketId    String
  userId      String
  message     String
  isInternal  Boolean  @default(false)
  createdAt   DateTime @default(now())

  ticket SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user    User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([ticketId])
  @@index([userId])
  @@index([createdAt])
}
*/