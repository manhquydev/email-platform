import { FastifyInstance } from "fastify";
import { z } from "zod";
import { outboundService } from "../services/outbound";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../utils/audit";

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

    // Updated route: Allow authenticated users to send emails, costing credits
    app.post("/messages/outbound", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });

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

        // 2. Validate Ownership of Sender Domain/Inbox
        // Logic: 'from' must be an address owned by the user.
        // Check if from matches an Inbox owned by user OR a verified Domain owned by user.
        const fromEmailParts = from.split("@");
        if (fromEmailParts.length !== 2) return reply.status(400).send({ error: "Invalid sender format" });
        const [localPart, domainName] = fromEmailParts;

        // Check if domain exists and is owned by user
        const domain = await prisma.domain.findUnique({
            where: { name: domainName },
            include: { owner: true }
        });

        if (!domain) {
            return reply.status(404).send({ error: "Domain not found" });
        }

        if (domain.ownerId !== userId) {
            // If user doesn't own domain, maybe they own the specific inbox? (Shared domain scenario?)
            // For now, strict ownership: User must own the domain.
            return reply.status(403).send({ error: "You do not own this domain" });
        }

        if (domain.status !== "VERIFIED") {
            return reply.status(403).send({ error: "Domain not verified" });
        }

        // 3. Process Attachments
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

        // 4. Credit Check & Deduction
        const CREDIT_COST = 1; // 1 Credit per email
        // Import dynamically to avoid circular ref issues if any (though unlikely here)
        const { CreditService } = await import("../services/credit.service");
        const { CreditTransactionType } = await import("@prisma/client");

        try {
            // This throws if insufficient credits
            await CreditService.deductCredits(
                userId,
                CREDIT_COST,
                CreditTransactionType.USAGE,
                `Sent email to ${to}`,
                { from, subject }
            );
        } catch (error: any) {
            if (error.message === "Insufficient credits") {
                return reply.status(402).send({ error: "Insufficient credits. Please top up your account." });
            }
            throw error;
        }

        // 5. Create Outbound Message record (Status: SENDING)
        // Check if from matches an existing inbox for this user to link them
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
                messageId: `tmp-${Date.now()}-${Math.random().toString(36).substring(2)}`, // Temporary until sent
                status: "SENDING"
            }
        });

        // 6. Send Email
        try {
            const info = await outboundService.sendEmail(from, to, subject, text, html, attachments);

            // Update record with real Message-ID and SENT status
            await prisma.outboundMessage.update({
                where: { id: outboundMsg.id },
                data: {
                    messageId: info.messageId,
                    status: "SENT",
                    sentAt: new Date(),
                }
            });

            await recordAudit(userId, "EMAIL_SENT", {
                msgId: info.messageId,
                outboundMessageId: outboundMsg.id,
                from,
                to,
                cost: CREDIT_COST
            });

            return {
                ok: true,
                messageId: info.messageId,
                outboundId: outboundMsg.id,
                remainingCredits: (user?.credits || 0) - CREDIT_COST
            };
        } catch (err: any) {
            // Update record to FAILED
            await prisma.outboundMessage.update({
                where: { id: outboundMsg.id },
                data: {
                    status: "FAILED",
                    bounceMessage: err.message
                }
            }).catch(() => { }); // Ignore secondary errors

            // Refund credits if sending failed!
            // This is crucial for "professional" consistency.
            await CreditService.addCredits(
                userId,
                CREDIT_COST,
                CreditTransactionType.REFUND,
                `Refund for failed send to ${to}`,
                { error: err.message, outboundId: outboundMsg.id }
            );

            request.log.error(err, "Failed to send outbound email");
            return reply.status(500).send({ error: "Failed to send email", details: err.message });
        }
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
