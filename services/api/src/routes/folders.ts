import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { FolderService } from "../services/folder-service";
import { TeamService } from "../services/team.service";

export const folderRoutes = async (app: FastifyInstance) => {
  // Get all folders for an inbox
  app.get("/inboxes/:inboxId/folders", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ inboxId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: "Invalid inbox ID" });

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, params.data.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    // Ensure special folders exist before returning
    await FolderService.ensureSpecialFolders(params.data.inboxId);

    const folders = await prisma.folder.findMany({
      where: { inboxId: params.data.inboxId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { messages: true } }
      }
    });

    return { folders };
  });

  // Create folder
  app.post("/inboxes/:inboxId/folders", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ inboxId: z.string().uuid() }).safeParse(request.params);
    const body = z.object({
      name: z.string().min(1).max(100),
      parentId: z.string().uuid().optional()
    }).safeParse(request.body);

    if (!params.success || !body.success) return reply.status(400).send({ error: "Invalid request" });

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, params.data.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    // Enforce max depth
    if (body.data.parentId) {
      let depth = 0;
      let currentId = body.data.parentId;
      while (currentId && depth < 5) {
        const parent = await prisma.folder.findUnique({ where: { id: currentId } });
        if (!parent) return reply.status(400).send({ error: "Parent not found" });
        currentId = parent.parentId!;
        depth++;
      }
      if (depth >= 5) return reply.status(400).send({ error: "Max folder depth exceeded" });
    }

    const folder = await prisma.folder.create({
      data: {
        inboxId: params.data.inboxId,
        name: body.data.name,
        parentId: body.data.parentId,
        sortOrder: 10 // Default for custom folders
      }
    });

    return { folder };
  });

  // Rename/Move folder
  app.patch("/inboxes/:inboxId/folders/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ inboxId: z.string().uuid(), id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({
      name: z.string().min(1).max(100).optional(),
      parentId: z.string().uuid().nullable().optional(),
      sortOrder: z.number().optional()
    }).safeParse(request.body);

    if (!params.success || !body.success) return reply.status(400).send({ error: "Invalid request" });

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, params.data.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const folder = await prisma.folder.findUnique({ where: { id: params.data.id } });
    if (!folder) return reply.status(404).send({ error: "Folder not found" });

    // Prevent modifying special folders (except sortOrder)
    if (folder.specialUse && (body.data.name || body.data.parentId)) {
      return reply.status(400).send({ error: "Cannot rename or move special folders" });
    }

    const updated = await prisma.folder.update({
      where: { id: params.data.id },
      data: {
        name: body.data.name,
        parentId: body.data.parentId,
        sortOrder: body.data.sortOrder
      }
    });

    return { folder: updated };
  });

  // Delete folder
  app.delete("/inboxes/:inboxId/folders/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ inboxId: z.string().uuid(), id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: "Invalid request" });

    const userId = (request.user as any).userId;
    const hasAccess = await TeamService.canAccessInbox(userId, params.data.inboxId);
    if (!hasAccess && (request.user as any).role !== "ADMIN") {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const folder = await prisma.folder.findUnique({ where: { id: params.data.id }, include: { messages: true, children: true } });
    if (!folder) return reply.status(404).send({ error: "Folder not found" });

    if (folder.specialUse) {
      return reply.status(400).send({ error: "Cannot delete special folder" });
    }

    if (folder.messages.length > 0 || folder.children.length > 0) {
      return reply.status(400).send({ error: "Folder is not empty" });
    }

    await prisma.folder.delete({ where: { id: params.data.id } });
    return { ok: true };
  });
};
