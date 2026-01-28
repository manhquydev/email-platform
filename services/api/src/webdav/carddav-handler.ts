import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";
import { GalService } from "../services/gal-service";

export class CardDavHandler {
  static async handlePropFind(req: FastifyRequest, reply: FastifyReply) {
    const user = (req as any).user;
    const depth = req.headers["depth"] || "0";

    let xml = `<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">`;

    if (req.url === "/.well-known/carddav" || req.url === "/.well-known/carddav/") {
        xml += `
  <D:response>
    <D:href>/.well-known/carddav/</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype><D:collection/></D:resourcetype>
        <D:current-user-principal><D:href>/principals/users/${user.userId}/</D:href></D:current-user-principal>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;

        if (depth === "1") {
            // Default addressbook
            xml += `
  <D:response>
    <D:href>/.well-known/carddav/default/</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype><D:collection/><C:addressbook/></D:resourcetype>
        <D:displayname>Default Address Book</D:displayname>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
        }
    }

    xml += `\n</D:multistatus>`;

    reply.code(207).header("Content-Type", "application/xml; charset=utf-8").send(xml);
  }

  static async handleReport(req: FastifyRequest, reply: FastifyReply) {
     const user = (req as any).user;
     // Basic implementation for addressbook-query
     const contacts = await prisma.contact.findMany({
         where: { userId: user.userId }
     });

     let xml = `<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">`;

     for (const contact of contacts) {
         xml += `
  <D:response>
    <D:href>/.well-known/carddav/default/${contact.uid}.vcf</D:href>
    <D:propstat>
      <D:prop>
        <D:getetag>"${contact.etag}"</D:getetag>
        <C:address-data>${contact.vcardData}</C:address-data>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
     }

     xml += `\n</D:multistatus>`;
     reply.code(207).header("Content-Type", "application/xml; charset=utf-8").send(xml);
  }
}
