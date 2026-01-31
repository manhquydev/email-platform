import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { enforceDailyEmailLimit } from "../services/tier-enforcement.service";
import { outboundQueue } from "../queue/outboundQueue";

export async function outboundRoutes(app: FastifyInstance) {
    // Validation schema for outbound email
    const outboundEmailSchema = z.object({
        from: z.union([z.string().email(), z.object({ value: z.string().email() })]),
        to: z.union([z.string().email(), z.object({ value: z.string().email() })]),
        subject: z.union([z.string().min(1), z.object({ value: z.string().min(1) })]),
        text: z.union([z.string(), z.object({ value: z.string() })]).optional(),
        html: z.union([z.string(), z.object({ value: z.string() })]).optional(),
        attachments: z.any().optional(),
    });

    // Send outbound email - uses tier-based daily limits (enforced by preHandler)
    app.post("/messages/outbound", { preHandler: [app.authenticate, enforceDailyEmailLimit] }, async (request, reply) => {
        const userId = (request.user as any).userId;

        // Validate request body with Zod
        const parsed = outboundEmailSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
        }

        const body = parsed.data;
        const from = typeof body.from === 'object' ? body.from.value : body.from;
        const to = typeof body.to === 'object' ? body.to.value : body.to;
        const subject = typeof body.subject === 'object' ? body.subject.value : body.subject;
        const text = body.text ? (typeof body.text === 'object' ? body.text.value : body.text) : undefined;
        const html = body.html ? (typeof body.html === 'object' ? body.html.value : body.html) : undefined;

        // Validate Ownership of Sender Domain/Inbox
        const fromEmailParts = from.split("@");
        if (fromEmailParts.length !== 2) return reply.status(400).send({ error: "Invalid sender format" });
        const [localPart, domainName] = fromEmailParts;

        const domain = await prisma.domain.findUnique({
            where: { name: domainName },
            include: { owner: true }
        });

        if (!domain) {
            return reply.status(404).send({ error: "Domain not found" });
        }

        if (domain.ownerId !== userId) {
            return reply.status(403).send({ error: "You do not own this domain" });
        }

        if (domain.status !== "VERIFIED") {
            return reply.status(403).send({ error: "Domain not verified" });
        }

        // Process Attachments
        let attachments: any[] = [];
        if (body.attachments) {
            const files = Array.isArray(body.attachments) ? body.attachments : [body.attachments];
            for (const file of files) {
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

        // Create Outbound Message record (Status: QUEUED)
        const senderInbox = await prisma.inbox.findFirst({
            where: {
                localPart,
                domainId: domain.id,
                ownerId: userId,
                deletedAt: null
            }
        });

        const outboundMsg = await prisma.outboundMessage.create({
            data: {
                userId,
                domainId: domain.id,
                inboxId: senderInbox?.id,
                fromAddress: from,
                toAddress: to,
                subject,
                messageId: `queued-${Date.now()}-${Math.random().toString(36).substring(2)}`,
                status: "QUEUED"
            }
        });

        // Add to queue for async processing
        await outboundQueue.add('send-email', {
            outboundMessageId: outboundMsg.id,
            userId,
            domainId: domain.id,
            inboxId: senderInbox?.id,
            from,
            to,
            subject,
            text,
            html,
            attachments,
        });

        return reply.status(202).send({
            ok: true,
            message: "Email queued for delivery",
            outboundId: outboundMsg.id,
            status: "QUEUED"
        });
    });

    // List outbound message history
    app.get("/messages/outbound", { preHandler: app.authenticate }, async (request, reply) => {
        const query = z.object({
            limit: z.coerce.number().min(1).max(100).optional().default(50),
            offset: z.coerce.number().min(0).optional().default(0),
            status: z.nativeEnum(require("@prisma/client").OutboundStatus).optional(),
        }).safeParse(request.query);

        if (!query.success) {
            return reply.status(400).send({ error: "Invalid query parameters" });
        }

        const userId = (request.user as any).userId;
        const { limit, offset, status } = query.data;

        const where: any = { userId };
        if (status) where.status = status;

        const [messages, total] = await Promise.all([
            prisma.outboundMessage.findMany({
                where,
                include: { domain: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
            }),
            prisma.outboundMessage.count({ where }),
        ]);

        return { data: messages, meta: { total, limit, offset } };
    });

    // Get specific outbound message tracking info
    app.get("/messages/outbound/:id", { preHandler: app.authenticate }, async (request, reply) => {
        const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
        if (!params.success) {
            return reply.status(400).send({ error: "Invalid ID" });
        }

        const userId = (request.user as any).userId;
        const message = await prisma.outboundMessage.findUnique({
            where: { id: params.data.id },
            include: { domain: { select: { name: true } } }
        });

        if (!message || message.userId !== userId) {
            return reply.status(404).send({ error: "Message not found" });
        }

        return { message };
    });
}
