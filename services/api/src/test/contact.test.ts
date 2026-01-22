import { describe, it, expect } from "vitest";
import { buildServer } from "../server";

describe("Contact Routes", () => {
  describe("POST /contact/sales", () => {
    it("should accept valid sales inquiry", async () => {
      const app = await buildServer();

      const response = await app.inject({
        method: "POST",
        url: "/contact/sales",
        payload: {
          name: "Test User",
          email: "test@example.com",
          company: "Test Company",
          companySize: "1-10 nhân viên",
          message: "This is a test inquiry message with enough characters.",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ success: true });
    });

    it("should reject invalid email", async () => {
      const app = await buildServer();

      const response = await app.inject({
        method: "POST",
        url: "/contact/sales",
        payload: {
          name: "Test User",
          email: "invalid-email",
          company: "Test Company",
          companySize: "1-10 nhân viên",
          message: "This is a test inquiry message.",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty("error");
    });

    it("should reject short message", async () => {
      const app = await buildServer();

      const response = await app.inject({
        method: "POST",
        url: "/contact/sales",
        payload: {
          name: "Test User",
          email: "test@example.com",
          company: "Test Company",
          companySize: "1-10 nhân viên",
          message: "Short",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should reject missing required fields", async () => {
      const app = await buildServer();

      const response = await app.inject({
        method: "POST",
        url: "/contact/sales",
        payload: {
          name: "Test User",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
