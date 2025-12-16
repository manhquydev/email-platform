import "@testing-library/jest-dom";
import { vi } from "vitest";

if (!global.fetch) {
  global.fetch = vi.fn();
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, service: "api" }),
    }),
  );
});
