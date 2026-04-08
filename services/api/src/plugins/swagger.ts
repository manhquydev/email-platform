import { FastifyInstance } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { appConfig } from "../config";

export const sharedErrorResponseSchema: Record<string, any> = {
    type: "object",
    properties: {
        error: { type: "string" },
        details: { type: "object", additionalProperties: true },
        code: { type: "string" },
    },
    required: ["error"],
};

export async function setupSwagger(app: FastifyInstance) {
    const normalizedApiUrl = appConfig.apiUrl.replace(/\/+$/, "");

    await app.register(fastifySwagger, {
        openapi: {
            info: {
                title: "Email Platform API",
                description: "API for the Inbound-first email alias service",
                version: "1.0.0",
            },
            servers: [
                {
                    url: normalizedApiUrl,
                    description: appConfig.apiUrl.includes("localhost") ? "Development server" : "Configured server",
                },
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                    },
                    apiKeyAuth: {
                        type: "apiKey",
                        name: "x-api-key",
                        in: "header",
                    },
                },
                schemas: {
                    ErrorResponse: sharedErrorResponseSchema,
                },
                responses: {
                    BadRequest: {
                        description: "Invalid request",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    Unauthorized: {
                        description: "Authentication required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    Forbidden: {
                        description: "Access denied",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    NotFound: {
                        description: "Resource not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    InternalServerError: {
                        description: "Unexpected server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },
    });

    await app.register(fastifySwaggerUi, {
        routePrefix: "/docs",
        uiConfig: {
            docExpansion: "list",
            deepLinking: false,
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
    });
}
