import { describe, expect, it } from "vitest";
import { buildBatchLocalParts } from "./create-inbox-modal-hooks";

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
