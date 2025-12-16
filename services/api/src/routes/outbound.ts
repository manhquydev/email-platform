import { FastifyInstance } from "fastify";
import { z } from "zod";
import { outboundService } from "../services/outbound";
import { prisma } from "../lib/prisma";

export async function outboundRoutes(app: FastifyInstance) {
    app.post("/messages/outbound", { preHandler: app.requireAdmin }, async (request, reply) => {
        const bodySchema = z.object({
            from: z.string().email(),
            to: z.string().email(),
            subject: z.string(),
            text: z.string().optional(),
            html: z.string().optional(),
        });

        const parsed = bodySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
        }

        const { from, to, subject, text, html } = parsed.data;

        // Security check: Ensure 'from' address belongs to the user or a verified domain in this system
        // For MVP, we check if the domain of 'from' address exists in our DB and is verified.
        const fromDomain = from.split("@")[1];
        const domain = await prisma.domain.findUnique({ where: { name: fromDomain } });

        if (!domain || domain.status !== "VERIFIED") {
            return reply.status(403).send({ error: "Sender domain not verified in this system" });
        }

        try {
            const info = await outboundService.sendEmail(from, to, subject, text, html);
            request.log.info({ msgId: info.messageId, from, to }, "Outbound email sent");
            return { ok: true, messageId: info.messageId };
        } catch (err) {
            request.log.error(err, "Failed to send outbound email");
            return reply.status(500).send({ error: "Failed to send email", details: (err as Error).message });
        }
    });
}
