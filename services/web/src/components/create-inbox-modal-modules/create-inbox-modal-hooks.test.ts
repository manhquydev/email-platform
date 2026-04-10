import { describe, expect, it } from "vitest";
import { buildBatchLocalParts, generateRandomName } from "./create-inbox-modal-hooks";

describe("buildBatchLocalParts", () => {
    it("returns only normalized base local part when count <= 1", () => {
        expect(buildBatchLocalParts("  DemoName  ", 1)).toEqual(["demoname"]);
        expect(buildBatchLocalParts("DemoName", 0)).toEqual(["demoname"]);
    });

    it("returns unique local parts with normalized base included", () => {
        const results = buildBatchLocalParts("FastInbox", 10);

        expect(results).toHaveLength(10);
        expect(new Set(results).size).toBe(10);
        expect(results[0]).toBe("fastinbox");
        expect(results.every((value) => value.startsWith("fastinbox"))).toBe(true);
    });
});

describe("generateRandomName", () => {
    it("generates realistic local parts within validation constraints", () => {
        const blocked = ["test", "temp", "fake", "spam", "throwaway", "google", "apple", "openai"];

        const samples = Array.from({ length: 120 }, () => generateRandomName());

        for (const sample of samples) {
            expect(sample).toMatch(/^[a-z0-9._]+$/);
            expect(sample.length).toBeGreaterThanOrEqual(6);
            expect(sample.length).toBeLessThanOrEqual(24);
            expect(sample).not.toMatch(/^[._]|[._]$/);
            expect(sample).not.toMatch(/[._]{2,}/);
            expect(sample).not.toMatch(/(.)\1{2,}/);
            expect(sample).not.toMatch(/\d{3,}/);
            expect(blocked.some((token) => sample.includes(token))).toBe(false);
        }
    });
});
