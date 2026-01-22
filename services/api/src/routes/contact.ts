import { FastifyInstance } from "fastify";
import { z } from "zod";
import { recordAudit } from "../utils/audit";
import { OutboundService } from "../services/outbound";

const outbound = new OutboundService();

/**
 * Contact Routes - Sales inquiries and contact forms
 */
export async function contactRoutes(app: FastifyInstance) {
  /**
   * POST /contact/sales - Sales inquiry submission
   */
  app.post("/contact/sales", async (request, reply) => {
    const body = z
      .object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        company: z.string().min(1).max(100),
        companySize: z.string(),
        message: z.string().min(10).max(2000),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: "Invalid payload", details: body.error.flatten() });
    }

    const { name, email, company, companySize, message } = body.data;
    const salesEmail = process.env.SALES_EMAIL || process.env.MAIL_FROM_ADDRESS || "sales@ephemera.app";
    const fromAddress = process.env.MAIL_FROM_ADDRESS || "noreply@ephemera.app";
    const timestamp = new Date().toISOString();

    // Send email notification to sales team
    try {
      const textContent = `New Sales Inquiry

Name: ${name}
Email: ${email}
Company: ${company}
Size: ${companySize}

Message:
${message}

---
Submitted: ${timestamp}`;

      const htmlContent = `<div style="font-family: sans-serif; max-width: 600px;">
  <h2 style="color: #6366f1;">New Sales Inquiry</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${name}</td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${company}</td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Size:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${companySize}</td></tr>
  </table>
  <div style="margin-top: 16px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
    <strong>Message:</strong>
    <p style="margin: 8px 0 0 0; white-space: pre-wrap;">${message}</p>
  </div>
  <p style="color: #666; font-size: 12px; margin-top: 16px;">Submitted: ${timestamp}</p>
</div>`;

      await outbound.sendEmail(
        fromAddress,
        salesEmail,
        `[Sales Inquiry] ${company}`,
        textContent,
        htmlContent
      );
      console.log(`[ContactSales] Inquiry sent from ${email} (${company})`);
    } catch (err) {
      console.error("[ContactSales] Failed to send email notification:", err);
      // Don't fail the request - email failure shouldn't block user
    }

    await recordAudit(null, "SALES_INQUIRY_SUBMITTED", { email, company });

    return { success: true };
  });
}
