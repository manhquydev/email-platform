import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { provisionUser } from "../identity/jit-provisioning";

export async function scimRoutes(app: FastifyInstance) {
  // Middleware to validate SCIM token
  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/scim/v2")) return;

    const { providerId } = request.params as { providerId: string };
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing authentication" });
    }

    const token = authHeader.substring(7);
    const provider = await prisma.identityProvider.findUnique({
      where: { id: providerId }
    });

    if (!provider || !provider.enabled) {
      return reply.status(404).send({ error: "Provider not found" });
    }

    // Check token from config
    const config = provider.config as any;
    if (config.scimSecret && config.scimSecret !== token) {
      return reply.status(401).send({ error: "Invalid token" });
    }
  });

  // SCIM User Creation
  app.post("/scim/v2/:providerId/Users", async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const body = request.body as any;

    try {
      // Basic SCIM mapping
      const email = body.emails?.find((e: any) => e.primary)?.value || body.userName;
      const externalId = body.externalId || body.id;

      const user = await provisionUser(
        providerId,
        externalId,
        email,
        body
      );

      return {
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
        id: user.id,
        userName: user.email,
        active: !user.isDisabled,
        emails: [{ value: user.email, primary: true }],
        meta: {
          resourceType: "User",
          created: user.createdAt,
          lastModified: new Date() // Should track updated at
        }
      };
    } catch (err) {
      request.log.error(err);
      return reply.status(409).send({ error: "User conflict or creation failed" });
    }
  });

  // SCIM User Retrieval
  app.get("/scim/v2/:providerId/Users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    // ID here might be internal ID or external ID depending on client.
    // Usually SCIM clients use the ID returned by Create.
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.status(404).send({ error: "User not found" });

    return {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      id: user.id,
      userName: user.email,
      active: !user.isDisabled,
      emails: [{ value: user.email, primary: true }],
      meta: {
        resourceType: "User",
        created: user.createdAt,
        lastModified: new Date()
      }
    };
  });

  // SCIM User Update (PUT/PATCH) - Simplified
  app.patch("/scim/v2/:providerId/Users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    // Handle 'active' status change (De-provisioning)
    let isDisabled = undefined;

    // Check Operations in body (PATCH)
    if (body.Operations) {
      for (const op of body.Operations) {
        if (op.path === "active" || (op.value && typeof op.value.active !== 'undefined')) {
           const active = op.value.active ?? op.value;
           isDisabled = !active;
        }
      }
    }

    if (isDisabled !== undefined) {
      await prisma.user.update({
        where: { id },
        data: { isDisabled }
      });
    }

    return reply.status(200).send({ id, meta: { resourceType: "User" } });
  });

  // SCIM User Delete
  app.delete("/scim/v2/:providerId/Users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    // Soft delete / disable
    await prisma.user.update({
      where: { id },
      data: { isDisabled: true }
    });

    return reply.status(204).send();
  });
}
