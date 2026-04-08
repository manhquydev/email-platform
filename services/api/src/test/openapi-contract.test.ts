import { describe, it, expect } from "vitest";
import { app } from "./setup";

describe("OpenAPI contract baseline", () => {
  it("serves /docs/json with core API paths and security schemes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/docs/json",
    });

    expect(res.statusCode).toBe(200);
    const doc = res.json() as {
      openapi: string;
      paths: Record<string, unknown>;
      servers?: Array<{ url: string }>;
      components?: {
        securitySchemes?: Record<string, unknown>;
        responses?: Record<string, unknown>;
        schemas?: Record<string, unknown>;
      };
    };

    expect(doc.openapi).toMatch(/^3\./);

    const requiredPaths = [
      "/health",
      "/ready",
      "/metrics",
      "/auth/login",
      "/auth/refresh",
      "/domains",
      "/domains/{id}",
      "/domains/{id}/verify",
      "/inboxes",
      "/inboxes/{id}",
      "/inboxes/{id}/messages",
      "/messages",
      "/messages/{id}",
      "/messages/{id}/read",
      "/messages/{id}/pin",
      "/messages/{id}/snooze",
      "/webhooks",
      "/webhooks/{id}",
      "/webhooks/{id}/logs",
      "/webhooks/{id}/logs/{logId}/retry",
      "/webhooks/{id}/test",
      "/webhooks/verify-signature",
    ];

    for (const path of requiredPaths) {
      expect(doc.paths[path], `missing OpenAPI path: ${path}`).toBeDefined();
    }

    expect(doc.components?.securitySchemes?.bearerAuth).toBeDefined();
    expect(doc.components?.securitySchemes?.apiKeyAuth).toBeDefined();
    expect(doc.components?.schemas?.ErrorResponse).toBeDefined();
    expect(doc.components?.responses?.BadRequest).toBeDefined();
    expect(doc.components?.responses?.Unauthorized).toBeDefined();
    expect(doc.components?.responses?.Forbidden).toBeDefined();
    expect(doc.components?.responses?.NotFound).toBeDefined();
    expect(doc.components?.responses?.InternalServerError).toBeDefined();
    const expectedServer = process.env.API_URL ?? "http://localhost:3001";
    expect(doc.servers?.[0]?.url).toBe(expectedServer);

    const resolveResponse = (response: Record<string, any> | undefined) => {
      if (!response) return undefined;
      if (!response.$ref) return response;
      const refKey = String(response.$ref).split("/").pop();
      return refKey ? (doc.components?.responses as Record<string, any> | undefined)?.[refKey] : undefined;
    };

    const resolveJsonSchema = (response: Record<string, any> | undefined) => {
      const resolvedResponse = resolveResponse(response);
      const schema = resolvedResponse?.content?.["application/json"]?.schema;
      if (!schema) return undefined;
      if (!schema.$ref) return schema;
      const refKey = String(schema.$ref).split("/").pop();
      return refKey ? (doc.components?.schemas as Record<string, any> | undefined)?.[refKey] : undefined;
    };

    const assertOperationHasStatusCodes = (
      path: string,
      method: "get" | "post" | "delete" | "patch" | "put",
      statusCodes: number[]
    ) => {
      const operation = (doc.paths[path] as Record<string, any> | undefined)?.[method];
      expect(operation, `missing OpenAPI operation ${method.toUpperCase()} ${path}`).toBeDefined();
      for (const statusCode of statusCodes) {
        const response = operation?.responses?.[String(statusCode)];
        expect(
          response,
          `missing status ${statusCode} for ${method.toUpperCase()} ${path}`
        ).toBeDefined();
        expect(
          resolveJsonSchema(response),
          `missing JSON schema for status ${statusCode} on ${method.toUpperCase()} ${path}`
        ).toBeDefined();
      }
    };

    assertOperationHasStatusCodes("/auth/login", "post", [200, 400, 401, 403, 500]);
    assertOperationHasStatusCodes("/auth/refresh", "post", [200, 401, 403, 500]);
    assertOperationHasStatusCodes("/domains", "get", [200, 400, 401, 500]);
    assertOperationHasStatusCodes("/domains", "post", [201, 400, 401, 409, 500]);
    assertOperationHasStatusCodes("/domains/{id}", "get", [200, 400, 401, 403, 404, 500]);
    assertOperationHasStatusCodes("/domains/{id}", "delete", [200, 400, 401, 403, 404, 500]);
    assertOperationHasStatusCodes("/domains/{id}", "patch", [200, 400, 401, 403, 404, 500]);
    assertOperationHasStatusCodes("/domains/{id}/verify", "post", [200, 400, 401, 403, 404, 500, 503]);
    assertOperationHasStatusCodes("/inboxes", "get", [200, 400, 401, 403, 500]);
    assertOperationHasStatusCodes("/inboxes", "post", [201, 400, 401, 403, 404, 409, 500]);
    assertOperationHasStatusCodes("/inboxes/{id}", "delete", [200, 400, 401, 403, 404, 500]);
    assertOperationHasStatusCodes("/inboxes/{id}", "patch", [200, 400, 401, 403, 404, 500]);
    assertOperationHasStatusCodes("/inboxes/{id}/messages", "get", [200, 400, 401, 403, 404, 500]);
    assertOperationHasStatusCodes("/messages", "get", [200, 400, 401, 403, 500]);
    assertOperationHasStatusCodes("/messages/{id}", "get", [200, 400, 401, 403, 404, 500]);
    assertOperationHasStatusCodes("/messages/{id}", "delete", [200, 400, 401, 403, 404, 500]);
    assertOperationHasStatusCodes("/messages/{id}/read", "patch", [200, 400, 401, 403, 404, 500]);
    assertOperationHasStatusCodes("/messages/{id}/pin", "patch", [200, 400, 401, 403, 404, 500]);
    assertOperationHasStatusCodes("/messages/{id}/snooze", "patch", [200, 400, 401, 403, 404, 500]);
    assertOperationHasStatusCodes("/webhooks/verify-signature", "post", [200, 400, 500]);
    assertOperationHasStatusCodes("/webhooks", "get", [200, 401, 500]);
    assertOperationHasStatusCodes("/webhooks", "post", [201, 400, 401, 403, 500]);
    assertOperationHasStatusCodes("/webhooks/{id}", "delete", [200, 400, 401, 404, 500]);
    assertOperationHasStatusCodes("/webhooks/{id}", "put", [200, 400, 401, 404, 500]);
    assertOperationHasStatusCodes("/webhooks/{id}/test", "post", [200, 400, 401, 404, 500]);
    assertOperationHasStatusCodes("/webhooks/{id}/logs", "get", [200, 400, 401, 404, 500]);
    assertOperationHasStatusCodes("/webhooks/{id}/logs/{logId}/retry", "post", [200, 400, 401, 404, 500]);

    const loginPost = (doc.paths["/auth/login"] as Record<string, any>)?.post;
    expect(loginPost?.requestBody?.content?.["application/json"]?.schema).toBeDefined();

    const domainsGet = (doc.paths["/domains"] as Record<string, any>)?.get;
    expect(domainsGet?.responses?.["200"]?.content?.["application/json"]?.schema).toBeDefined();
  });
});
