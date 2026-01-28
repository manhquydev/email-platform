import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { CalDavHandler } from "./caldav-handler";
import { CardDavHandler } from "./carddav-handler";

export async function webdavRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // CalDAV Routes
  fastify.route({
    method: "PROPFIND",
    url: "/.well-known/caldav",
    handler: CalDavHandler.handlePropFind
  });

  fastify.route({
    method: "PROPFIND",
    url: "/.well-known/caldav/*",
    handler: CalDavHandler.handlePropFind
  });

  fastify.options("/.well-known/caldav", CalDavHandler.handleOptions);
  fastify.options("/.well-known/caldav/*", CalDavHandler.handleOptions);

  // CardDAV Routes
  fastify.route({
    method: "PROPFIND",
    url: "/.well-known/carddav",
    handler: CardDavHandler.handlePropFind
  });

  fastify.route({
    method: "REPORT",
    url: "/.well-known/carddav/*",
    handler: CardDavHandler.handleReport
  });

  // Principal URLs
  fastify.get("/principals/users/:userId/", async (req, reply) => {
    // Return user principal info
    reply.code(200).send("User Principal");
  });
}
