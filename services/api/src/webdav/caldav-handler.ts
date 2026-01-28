import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";

export class CalDavHandler {
  static async handlePropFind(req: FastifyRequest, reply: FastifyReply) {
    const user = (req as any).user;
    const depth = req.headers["depth"] || "0";

    // List calendars
    const calendars = await prisma.calendar.findMany({
      where: { userId: user.userId }
    });

    let xml = `<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:CS="http://calendarserver.org/ns/">`;

    const baseUrl = `${(req as any).protocol}://${req.hostname}/.well-known/caldav`;

    if (req.url === "/.well-known/caldav" || req.url === "/.well-known/caldav/") {
        // Root collection
        xml += `
  <D:response>
    <D:href>/.well-known/caldav/</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype><D:collection/></D:resourcetype>
        <D:current-user-principal><D:href>/principals/users/${user.userId}/</D:href></D:current-user-principal>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
    }

    if (depth === "1") {
        for (const cal of calendars) {
            xml += `
  <D:response>
    <D:href>/.well-known/caldav/${cal.id}/</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype><D:collection/><C:calendar/></D:resourcetype>
        <D:displayname>${cal.name}</D:displayname>
        <C:supported-calendar-component-set>
          <C:comp name="VEVENT"/>
        </C:supported-calendar-component-set>
        <CS:getctag>${cal.ctag}</CS:getctag>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
        }
    }

    xml += `\n</D:multistatus>`;

    reply.code(207).header("Content-Type", "application/xml; charset=utf-8").send(xml);
  }

  static async handleOptions(req: FastifyRequest, reply: FastifyReply) {
    reply
      .header("DAV", "1, 2, calendar-access, addressbook")
      .header("Allow", "OPTIONS, GET, HEAD, POST, PUT, DELETE, PROPFIND, PROPPATCH, REPORT, MKCALENDAR")
      .send();
  }
}
