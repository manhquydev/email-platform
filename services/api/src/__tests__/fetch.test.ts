/**
 * Tests for fetch timeout utility
 */

import { fetchWithTimeout, fetchJsonWithTimeout, postJsonWithTimeout } from "../utils/fetch";

// Mock fetch globally
const originalFetch = global.fetch;

describe("Fetch Timeout Utility", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        global.fetch = originalFetch;
    });

    describe("fetchWithTimeout", () => {
        it("should resolve on successful fetch within timeout", async () => {
            const mockResponse = new Response(JSON.stringify({ data: "test" }), { status: 200 });
            global.fetch = jest.fn().mockResolvedValue(mockResponse);

            const promise = fetchWithTimeout("https://api.example.com/test");
            jest.runAllTimers();

            const response = await promise;
            expect(response.status).toBe(200);
        });

        it("should throw timeout error when request exceeds timeout", async () => {
            // Create a fetch that never resolves
            global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));

            const promise = fetchWithTimeout("https://api.example.com/slow", { timeout: 1000 });

            // Fast-forward past the timeout
            jest.advanceTimersByTime(1500);

            await expect(promise).rejects.toThrow("Request timeout after 1000ms");
        });

        it("should use default timeout when not specified", async () => {
            const mockResponse = new Response("OK", { status: 200 });
            global.fetch = jest.fn().mockResolvedValue(mockResponse);

            await fetchWithTimeout("https://api.example.com/test");

            expect(global.fetch).toHaveBeenCalledWith(
                "https://api.example.com/test",
                expect.objectContaining({ signal: expect.any(AbortSignal) })
            );
        });

        it("should pass through fetch options", async () => {
            const mockResponse = new Response("OK", { status: 200 });
            global.fetch = jest.fn().mockResolvedValue(mockResponse);

            await fetchWithTimeout("https://api.example.com/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                "https://api.example.com/test",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                })
            );
        });
    });

    describe("fetchJsonWithTimeout", () => {
        it("should parse JSON response", async () => {
            const testData = { id: 1, name: "test" };
            const mockResponse = new Response(JSON.stringify(testData), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
            global.fetch = jest.fn().mockResolvedValue(mockResponse);

            const result = await fetchJsonWithTimeout<typeof testData>("https://api.example.com/json");

            expect(result).toEqual(testData);
        });

        it("should throw on non-OK response", async () => {
            const mockResponse = new Response("Not Found", { status: 404 });
            global.fetch = jest.fn().mockResolvedValue(mockResponse);

            await expect(
                fetchJsonWithTimeout("https://api.example.com/notfound")
            ).rejects.toThrow("HTTP 404");
        });
    });

    describe("postJsonWithTimeout", () => {
        it("should send JSON body with correct headers", async () => {
            const mockResponse = new Response(JSON.stringify({ success: true }), { status: 200 });
            global.fetch = jest.fn().mockResolvedValue(mockResponse);

            const result = await postJsonWithTimeout<{ success: boolean }>(
                "https://api.example.com/create",
                { name: "test" }
            );

            expect(result).toEqual({ success: true });
            expect(global.fetch).toHaveBeenCalledWith(
                "https://api.example.com/create",
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        "Content-Type": "application/json",
                    }),
                    body: JSON.stringify({ name: "test" }),
                })
            );
        });
    });
});
