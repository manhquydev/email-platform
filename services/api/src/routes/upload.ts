
import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";

// Allowlist of uploadable types. Files are served back from the same origin under
// /public/uploads, so we must reject anything that could execute in a browser (svg/html) or
// mismatch its claimed type. Each entry validates the declared MIME, the extension, and the
// real content via magic bytes — a renamed .html → .png is rejected.
const ALLOWED_UPLOADS: Record<string, { ext: string[]; magic: (b: Buffer) => boolean }> = {
    "image/jpeg": { ext: [".jpg", ".jpeg"], magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    "image/png": { ext: [".png"], magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
    "image/gif": { ext: [".gif"], magic: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
    "image/webp": {
        ext: [".webp"],
        magic: (b) =>
            b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
            b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
    },
    "application/pdf": { ext: [".pdf"], magic: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
};

export async function uploadRoutes(app: FastifyInstance) {
    // Ensure storage directory exists - use relative path as default for CI compatibility
    const storageDir = process.env.STORAGE_DIR || "./storage";
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
                // Buffer the part (bounded by the @fastify/multipart fileSize limit) so the content
                // can be validated before it is ever written to the public uploads directory.
                const buf = await part.toBuffer();
                const declared = part.mimetype;
                const spec = ALLOWED_UPLOADS[declared];
                const ext = path.extname(part.filename || "").toLowerCase();

                if (!spec || !spec.ext.includes(ext) || buf.length < 12 || !spec.magic(buf)) {
                    return reply.status(400).send({ error: "Unsupported or invalid file type" });
                }

                const safeName = (part.filename || "file").replace(/[^a-zA-Z0-9.-]/g, "");
                const fileName = `${Date.now()}-${safeName}`;
                const filePath = path.join(uploadsDir, fileName);

                await fs.promises.writeFile(filePath, buf);

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
