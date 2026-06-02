import { FastifyInstance } from "fastify";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { provisionUser } from "../_wip/identity/jit-provisioning";
import { sendApiError } from "../utils/errorHandler";

export async function scimRoutes(app: FastifyInstance) {
  // Middleware to validate SCIM token
  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/scim/v2")) return;

    const { providerId } = request.params as { providerId: string };
    if (!providerId) {
      return sendApiError(reply, 400, "Missing providerId", { code: "BAD_REQUEST" });
    }
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendApiError(reply, 401, "Missing authentication", { code: "UNAUTHORIZED" });
    }

    const token = authHeader.substring(7);
    const provider = await prisma.identityProvider.findUnique({
      where: { id: providerId }
    });

    if (!provider || !provider.enabled) {
      return sendApiError(reply, 404, "Provider not found", { code: "NOT_FOUND" });
    }

    // Fail closed: a provider with no configured SCIM secret must NOT accept any bearer
    // token, and the comparison is constant-time to avoid leaking the secret via timing.
    const config = provider.config as any;
    const expected = config.scimSecret ? String(config.scimSecret) : "";
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(token);
    if (
      !expected ||
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      return sendApiError(reply, 401, "Invalid token", { code: "UNAUTHORIZED" });
    }

    // Make the authenticated provider (incl. its organization scope) available to handlers.
    (request as any).identityProvider = provider;
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
      return sendApiError(reply, 409, "User conflict or creation failed", { code: "CONFLICT" });
    }
  });

  // SCIM User Retrieval
  app.get("/scim/v2/:providerId/Users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const provider = (request as any).identityProvider;

    // Scope to the provider's organization so a provider token cannot read users in other tenants.
    const user = await prisma.user.findFirst({
      where: { id, organizationId: provider.organizationId }
    });
    if (!user) return sendApiError(reply, 404, "User not found", { code: "NOT_FOUND" });

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
      const provider = (request as any).identityProvider;
      // Conditional update scoped to the provider's org: count 0 means the target user is
      // not in this tenant (or does not exist) → treat as not found, never touch other tenants.
      const result = await prisma.user.updateMany({
        where: { id, organizationId: provider.organizationId },
        data: { isDisabled }
      });
      if (result.count === 0) {
        return sendApiError(reply, 404, "User not found", { code: "NOT_FOUND" });
      }
    }

    return reply.status(200).send({ id, meta: { resourceType: "User" } });
  });

  // SCIM User Delete
  app.delete("/scim/v2/:providerId/Users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const provider = (request as any).identityProvider;

    // Soft delete / disable, scoped to the provider's organization (no cross-tenant deletes).
    const result = await prisma.user.updateMany({
      where: { id, organizationId: provider.organizationId },
      data: { isDisabled: true }
    });
    if (result.count === 0) {
      return sendApiError(reply, 404, "User not found", { code: "NOT_FOUND" });
    }

    return reply.status(204).send();
  });
}
