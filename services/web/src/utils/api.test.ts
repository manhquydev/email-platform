import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { api, ApiError, API_BASE } from "./api";

// Mock errorMapping
vi.mock("./errorMapping", () => ({
    getFriendlyErrorMessage: (msg: string) => msg,
}));

// Mock useApiError
vi.mock("../hooks/useApiError", () => ({
    handleCriticalError: vi.fn(),
}));

describe("api.ts", () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        vi.clearAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    describe("API_BASE", () => {
        it("should have a valid API base URL", () => {
            expect(API_BASE).toBeDefined();
            expect(typeof API_BASE).toBe("string");
        });
    });

    describe("ApiError", () => {
        it("creates error with message and status", () => {
            const error = new ApiError("Test error", 404);

            expect(error.message).toBe("Test error");
            expect(error.status).toBe(404);
            expect(error.name).toBe("ApiError");
        });

        it("extends Error class", () => {
            const error = new ApiError("Test", 500);

            expect(error instanceof Error).toBe(true);
            expect(error instanceof ApiError).toBe(true);
        });
    });

    describe("api function", () => {
        it("makes GET request by default", async () => {
            const mockResponse = { data: "test" };
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await api("/test");

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/test"),
                expect.objectContaining({ method: "GET" })
            );
            expect(result).toEqual(mockResponse);
        });

        it("makes POST request with JSON body", async () => {
            const mockBody = { name: "test" };
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });

            await api("/test", { method: "POST", body: mockBody });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify(mockBody),
                    headers: expect.objectContaining({
                        "Content-Type": "application/json",
                    }),
                })
            );
        });

        it("adds Authorization header when token provided", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });

            await api("/test", { token: "my-token" });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: "Bearer my-token",
                    }),
                })
            );
        });

        it("handles FormData without setting Content-Type", async () => {
            const formData = new FormData();
            formData.append("file", "test");

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });

            await api("/upload", { method: "POST", body: formData });

            const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
            expect(callArgs.headers["Content-Type"]).toBeUndefined();
        });

        it("throws ApiError on non-ok response", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ message: "Bad request" }),
            });

            await expect(api("/test")).rejects.toThrow(ApiError);
            await expect(api("/test")).rejects.toMatchObject({
                message: "Bad request",
                status: 400,
            });
        });

        it("uses error field when message not present", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 422,
                json: () => Promise.resolve({ error: "Validation failed" }),
            });

            await expect(api("/test")).rejects.toMatchObject({
                message: "Validation failed",
            });
        });

        it("includes details in error message when present", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: () => Promise.resolve({
                    message: "Error",
                    details: "Field X is required"
                }),
            });

            await expect(api("/test")).rejects.toMatchObject({
                message: "Error: Field X is required",
            });
        });

        it("throws timeout error on abort", async () => {
            global.fetch = vi.fn().mockRejectedValue(
                Object.assign(new Error("Aborted"), { name: "AbortError" })
            );

            await expect(api("/test")).rejects.toMatchObject({
                message: expect.stringContaining("quá hạn"),
                status: 408,
            });
        });

        it("handles JSON parse failure gracefully", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                json: () => Promise.reject(new Error("Invalid JSON")),
            });

            await expect(api("/test")).rejects.toMatchObject({
                message: "Request failed",
                status: 500,
            });
        });

        it("calls handleCriticalError for error responses", async () => {
            const { handleCriticalError } = await import("../hooks/useApiError");

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                json: () => Promise.resolve({ message: "Forbidden" }),
            });

            await expect(api("/protected")).rejects.toThrow();

            expect(handleCriticalError).toHaveBeenCalledWith(403, "/protected");
        });

        it("skips handleCriticalError when skipErrorRedirect is true", async () => {
            const { handleCriticalError } = await import("../hooks/useApiError");

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                json: () => Promise.resolve({ message: "Forbidden" }),
            });

            await expect(api("/protected", { skipErrorRedirect: true })).rejects.toThrow();

            expect(handleCriticalError).not.toHaveBeenCalled();
        });
    });
});
