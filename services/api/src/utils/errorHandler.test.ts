
import { vi, describe, it, expect } from "vitest";
import { errorHandler } from "./errorHandler";
import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

describe("errorHandler", () => {
    it("should format standard errors correctly", () => {
        const mockReq = {
            id: "req-1",
            log: { error: vi.fn() }
        } as unknown as FastifyRequest;

        const mockReply = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn()
        } as unknown as FastifyReply;

        const error = new Error("Something went wrong") as FastifyError;
        error.statusCode = 400;
        error.code = "BAD_REQUEST";

        errorHandler(error, mockReq, mockReply);

        expect(mockReq.log.error).toHaveBeenCalled();
        expect(mockReply.status).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
            error: true,
            message: "Something went wrong",
            code: "BAD_REQUEST"
        }));
    });

    it("should mask internal errors in production", () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";

        const mockReq = {
            id: "req-2",
            log: { error: vi.fn() }
        } as unknown as FastifyRequest;

        const mockReply = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn()
        } as unknown as FastifyReply;

        const error = new Error("Secret DB Error") as FastifyError;
        // No status code = 500

        errorHandler(error, mockReq, mockReply);

        expect(mockReply.status).toHaveBeenCalledWith(500);
        expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
            message: "Internal Server Error",
            code: "INTERNAL_ERROR"
        }));
        // Should not have stack
        expect(mockReply.send).not.toHaveBeenCalledWith(expect.objectContaining({
            stack: expect.anything()
        }));

        process.env.NODE_ENV = originalEnv;
    });
});
