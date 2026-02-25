import { vi, describe, it, expect, beforeEach } from "vitest";
import { ApiError, API_BASE } from "./api";

// Mock errorMapping
vi.mock("./errorMapping", () => ({
    getFriendlyErrorMessage: (msg: string) => msg,
}));

// Mock useApiError
vi.mock("../hooks/useApiError", () => ({
    handleCriticalError: vi.fn(),
}));

// Mock token-manager to avoid browser-only APIs
vi.mock("./token-manager", () => ({
    tokenManager: {
        getAccessToken: vi.fn().mockReturnValue(null),
        isTokenExpiringSoon: vi.fn().mockReturnValue(false),
        refreshAccessToken: vi.fn(),
        clearTokens: vi.fn(),
        setTokens: vi.fn(),
        setCsrfToken: vi.fn(),
        getRefreshToken: vi.fn().mockReturnValue(null),
    },
}));

// Hoist mock vars so vi.mock factory can reference them
const { mockAxiosRequest } = vi.hoisted(() => ({
    mockAxiosRequest: vi.fn(),
}));

vi.mock("axios", async (importOriginal) => {
    const actual = await importOriginal<typeof import("axios")>();
    return {
        ...actual,
        default: {
            ...actual.default,
            create: vi.fn().mockReturnValue({
                request: mockAxiosRequest,
                interceptors: {
                    request: { use: vi.fn() },
                    response: { use: vi.fn() },
                },
            }),
            isAxiosError: actual.default.isAxiosError,
        },
    };
});

describe("api.ts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
});
