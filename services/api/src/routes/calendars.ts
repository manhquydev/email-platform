import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from "zod";

export async function calendarRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // GET /calendars
  app.get("/", async (req, reply) => {
    const user = (req as any).user;
    const calendars = await prisma.calendar.findMany({
      where: { userId: user.userId },
      include: {
        _count: {
          select: { events: true }
        }
      }
    });
    return calendars;
  });

  // POST /calendars
  app.post("/", async (req, reply) => {
    const user = (req as any).user;
    const schema = z.object({
      name: z.string().min(1),
      color: z.string().optional(),
      timezone: z.string().optional(),
      description: z.string().optional()
    });

    const body = schema.parse(req.body);

    const calendar = await prisma.calendar.create({
      data: {
        userId: user.userId,
        ...body
      }
    });

    return calendar;
  });

  // GET /calendars/:id/events
  app.get("/:id/events", async (req, reply) => {
    const user = (req as any).user;
    const { id } = req.params as any;
    const { start, end } = req.query as any; // ISO dates

    const calendar = await prisma.calendar.findFirst({
      where: { id, userId: user.userId }
    });

    if (!calendar) return reply.status(404).send({ error: "Calendar not found" });

    const events = await prisma.event.findMany({
      where: {
        calendarId: id,
        startAt: { gte: start ? new Date(start) : undefined },
        endAt: { lte: end ? new Date(end) : undefined }
      }
    });

    return events;
  });
}
