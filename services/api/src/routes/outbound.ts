import { FastifyInstance } from "fastify";
import { z } from "zod";
import { outboundService } from "../services/outbound";
import { prisma } from "../lib/prisma";

export async function outboundRoutes(app: FastifyInstance) {
    app.post("/messages/outbound", { preHandler: app.requireAdmin }, async (request, reply) => {
        // With attachFieldsToBody: true, fields are available in body.
        // Files are also there but we need to handle them carefully.
        const body = request.body as any;

        // Validation for multipart fields (which might be usually strings or objects)
        // We use a looser check or manual check because zod interacting with FormData fields can be tricky if they come as objects
        const from = typeof body.from === 'object' ? body.from.value : body.from;
        const to = typeof body.to === 'object' ? body.to.value : body.to;
        const subject = typeof body.subject === 'object' ? body.subject.value : body.subject;
        const text = typeof body.text === 'object' ? body.text.value : body.text;
        const html = typeof body.html === 'object' ? body.html.value : body.html;

        if (!from || !to || !subject) {
            return reply.status(400).send({ error: "Missing required fields (from, to, subject)" });
        }

        // Handle attachments
        let attachments: any[] = [];
        if (body.attachments) {
            const files = Array.isArray(body.attachments) ? body.attachments : [body.attachments];
            for (const file of files) {
                // fastify-multipart attaches file with toBuffer() method
                if (file.toBuffer) {
                    const buffer = await file.toBuffer();
                    attachments.push({
                        filename: file.filename,
                        content: buffer,
                        contentType: file.mimetype
                    });
                }
            }
        }

        const fromDomain = from.split("@")[1];
        const domain = await prisma.domain.findUnique({ where: { name: fromDomain } });

        if (!domain || domain.status !== "VERIFIED") {
            return reply.status(403).send({ error: "Sender domain not verified in this system" });
        }

        try {
            const info = await outboundService.sendEmail(from, to, subject, text, html, attachments);
            request.log.info({ msgId: info.messageId, from, to }, "Outbound email sent");
            return { ok: true, messageId: info.messageId };
        } catch (err) {
            request.log.error(err, "Failed to send outbound email");
            return reply.status(500).send({ error: "Failed to send email", details: (err as Error).message });
        }
    });
}
