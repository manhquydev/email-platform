
import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error({ err: error, reqId: request.id }, "Global Error Handler caught error");

    const statusCode = error.statusCode ?? 500;

    // Default message
    let message = "Internal Server Error";
    let code = "INTERNAL_ERROR";

    if (statusCode < 500) {
        message = error.message;
        code = error.code ?? "BAD_REQUEST";
    } else {
        // In production, hide internal error details to prevent information leakage
        if (process.env.NODE_ENV !== "production") {
            message = error.message;
        }
    }

    // Prisma errors (P2002, P2025 etc) handling could be added here if needed
    // But usually mapped in service layer.

    reply.status(statusCode).send({
        error: true,
        message,
        code,
        ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {})
    });
};
