import { FastifyInstance } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

export async function setupSwagger(app: FastifyInstance) {
    await app.register(fastifySwagger, {
        openapi: {
            info: {
                title: "Email Platform API",
                description: "API for the Inbound-first email alias service",
                version: "1.0.0",
            },
            servers: [
                {
                    url: "http://localhost:3001",
                    description: "Development server",
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
