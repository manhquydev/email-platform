import { describe, expect, it } from "vitest";
import { app } from "./setup";

describe("Runtime error envelope normalization", () => {
  it("normalizes legacy validation errors into { error, code, details? }", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "invalid-email",
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json() as { error?: string; code?: string; details?: unknown };
    expect(typeof body.error).toBe("string");
    expect(body.code).toBe("BAD_REQUEST");
  });
});
