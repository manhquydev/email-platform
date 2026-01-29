import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { GalService } from "../services/gal-service";
import crypto from "crypto";

export async function addressBookRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // GET /contacts
  app.get("/", async (req, reply) => {
    const user = (req as any).user;
    const contacts = await prisma.contact.findMany({
      where: { userId: user.userId },
      orderBy: { fullName: 'asc' }
    });
    return contacts;
  });

  // POST /contacts
  app.post("/", async (req, reply) => {
    const user = (req as any).user;
    const schema = z.object({
      fullName: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      organizationId: z.string().optional()
    });

    const body = schema.parse(req.body);
    const uid = crypto.randomUUID();

    const contact = await prisma.contact.create({
      data: {
        userId: user.userId,
        uid,
        etag: `${Date.now()}`,
        vcardData: `BEGIN:VCARD\r\nVERSION:3.0\r\nUID:${uid}\r\nFN:${body.fullName}\r\nEMAIL:${body.email}\r\nEND:VCARD`,
        ...body
      }
    });

    return contact;
  });

  // GET /contacts/gal
  app.get("/gal", async (req, reply) => {
    const user = (req as any).user;
    const gal = await GalService.getGalForUser(user.userId);
    return gal;
  });

  // POST /contacts/gal/sync
  app.post("/gal/sync", async (req, reply) => {
    const user = (req as any).user;
    await GalService.syncGalContacts(user.userId);
    return { success: true };
  });
}
