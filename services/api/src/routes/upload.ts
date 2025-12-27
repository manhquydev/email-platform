
import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import util from "util";
import { pipeline } from "stream";
import { z } from "zod";

const pump = util.promisify(pipeline);

export async function uploadRoutes(app: FastifyInstance) {
    // Ensure storage directory exists
    const storageDir = process.env.STORAGE_DIR || "/app/storage";
    if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
    }

    // Public folder for uploads
    const uploadsDir = path.join(storageDir, "uploads");
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    app.post("/upload", {
        preHandler: [app.authenticate]
    }, async (request, reply) => {
        const parts = request.parts();

        let fileUrl = "";

        for await (const part of parts) {
            if (part.type === 'file') {
                const fileName = `${Date.now()}-${part.filename.replace(/[^a-zA-Z0-9.-]/g, '')}`;
                const filePath = path.join(uploadsDir, fileName);

                await pump(part.file, fs.createWriteStream(filePath));

                // Construct Public URL
                // Assuming nginx/caddy serves /storage/uploads or similar
                // Or we serve static files via Fastify from this dir?
                // Let's assume the API serves static files for now or Caddy handles /storage
                // Docker compose says: caddy mapped /data, api mapped /app/storage
                // BUT caddy doesn't seem to map /storage to /app/storage currently. 
                // We might need to serve it via API statically or fix Caddy.
                // For now, let's serve static via fastify-static if possible or just return a relative path the frontend can use if we proxy.

                const baseUrl = process.env.VITE_API_BASE || "https://api.manhquy.click";
                fileUrl = `${baseUrl}/public/uploads/${fileName}`;
            }
        }

        if (!fileUrl) {
            return reply.status(400).send({ error: "No file uploaded" });
        }

        return { url: fileUrl };
    });
}
