import { FastifyInstance } from "fastify";
import { z } from "zod";
import { outboundService } from "../services/outbound";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../utils/audit";

export async function outboundRoutes(app: FastifyInstance) {
    // Updated route: Allow authenticated users to send emails, costing credits
    app.post("/messages/outbound", { preHandler: app.authenticate }, async (request, reply) => {
        const userId = (request.user as any).userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        // Exclude ADMIN from credit check? Or treat them same? 
        // Let's treat them same for consistency, or give Admin infinite credits.
        // For professional realism: Admin creates "System" emails which might be free, 
        // but if Admin uses "Send" feature for their own account usage, they should behave like a user.
        // However, usually Admin bypasses limits. Let's keep it strict for now unless user asks.

        // 1. Parse body
        const body = request.body as any;
        const from = typeof body.from === 'object' ? body.from.value : body.from;
        const to = typeof body.to === 'object' ? body.to.value : body.to;
        const subject = typeof body.subject === 'object' ? body.subject.value : body.subject;
        const text = typeof body.text === 'object' ? body.text.value : body.text;
        const html = typeof body.html === 'object' ? body.html.value : body.html;

        if (!from || !to || !subject) {
            return reply.status(400).send({ error: "Missing required fields (from, to, subject)" });
        }

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

        // 5. Send Email
        try {
            const info = await outboundService.sendEmail(from, to, subject, text, html, attachments);

            await recordAudit(userId, "EMAIL_SENT", {
                msgId: info.messageId,
                from,
                to,
                cost: CREDIT_COST
            });

            return { ok: true, messageId: info.messageId, remainingCredits: (user?.credits || 0) - CREDIT_COST };
        } catch (err: any) {
            // Refund credits if sending failed!
            // This is crucial for "professional" consistency.
            await CreditService.addCredits(
                userId,
                CREDIT_COST,
                CreditTransactionType.REFUND,
                `Refund for failed send to ${to}`,
                { error: err.message }
            );

            request.log.error(err, "Failed to send outbound email");
            return reply.status(500).send({ error: "Failed to send email", details: err.message });
        }
    });
}
