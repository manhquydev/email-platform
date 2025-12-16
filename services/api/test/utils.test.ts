import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/utils/password";
import { generateToken } from "../src/utils/token";
import { headersToObject } from "../src/utils/headers";

describe("utils", () => {
  it("hashes and verifies password", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).not.toBe("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("generates random token", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toEqual(b);
    expect(a).toHaveLength(32);
  });

  it("converts headers map", () => {
    const map = new Map<string, string | string[] | undefined>([
      ["a", "1"],
      ["b", ["2", "3"]],
      ["c", undefined],
    ]);
    const obj = headersToObject(map);
    expect(obj).toEqual({ a: "1", b: ["2", "3"] });
    expect(obj).not.toHaveProperty("c");
  });
});
