import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

import { appConfig } from "../config";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { sanitizeStorageKey, isPathWithinBase, logInjectionAttempt } from "../utils/input-sanitizer";

export interface IStorageService {
    save(key: string, content: Buffer | string, contentType?: string): Promise<void>;
    getReadStream(key: string): Promise<Readable | Blob>; // Blob for S3 usually comes as stream, we'll normalize return type typically to stream
    exists(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
}

class LocalStorage implements IStorageService {
    private rootDir: string;

    constructor(rootDir: string) {
        this.rootDir = rootDir;
    }

    /**
     * SECURITY: Sanitize key and validate path stays within root directory
     * Defense in depth: sanitize + path validation prevents path traversal
     */
    private getSecurePath(key: string): string {
        const safeKey = sanitizeStorageKey(key);
        const targetPath = path.join(this.rootDir, safeKey);

        // Double-check: ensure resolved path is within root directory
        if (!isPathWithinBase(targetPath, this.rootDir)) {
            logInjectionAttempt("path_traversal", {
                originalKey: key,
                sanitizedKey: safeKey,
                attemptedPath: targetPath
            });
            throw new Error("Path traversal detected");
        }

        return targetPath;
    }

    async save(key: string, content: Buffer | string, contentType?: string): Promise<void> {
        const targetPath = this.getSecurePath(key);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, content);
    }

    async getReadStream(key: string): Promise<Readable> {
        const targetPath = this.getSecurePath(key);
        return createReadStream(targetPath);
    }

    async exists(key: string): Promise<boolean> {
        try {
            const targetPath = this.getSecurePath(key);
            await fs.access(targetPath);
            return true;
        } catch {
            return false;
        }
    }

    async delete(key: string): Promise<void> {
        try {
            const targetPath = this.getSecurePath(key);
            await fs.unlink(targetPath);
        } catch (e) {
            // ignore if not found
        }
    }
}

class S3Storage implements IStorageService {
    private client: S3Client;
    private bucket: string;

    constructor() {
        this.client = new S3Client({
            region: appConfig.s3.region,
            endpoint: appConfig.s3.endpoint,
            credentials: {
                accessKeyId: appConfig.s3.accessKeyId,
                secretAccessKey: appConfig.s3.secretAccessKey,
            },
            forcePathStyle: true, // often needed for MinIO or specialized endpoints
        });
        this.bucket = appConfig.s3.bucket;
    }

    /**
     * SECURITY: Sanitize S3 key for consistency with LocalStorage
     * S3 handles arbitrary keys, but sanitization ensures consistent behavior across providers
     */
    private getSafeKey(key: string): string {
        return sanitizeStorageKey(key);
    }

    async save(key: string, content: Buffer | string, contentType?: string): Promise<void> {
        const safeKey = this.getSafeKey(key);
        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: safeKey,
            Body: content,
            ContentType: contentType || "application/octet-stream",
        }));
    }

    async getReadStream(key: string): Promise<Readable> {
        const safeKey = this.getSafeKey(key);
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: safeKey,
        });
        const response = await this.client.send(command);
        if (!response.Body) {
            throw new Error("S3 object has no body");
        }
        return response.Body as Readable;
    }

    async exists(key: string): Promise<boolean> {
        try {
            const safeKey = this.getSafeKey(key);
            await this.client.send(new GetObjectCommand({
                Bucket: this.bucket,
                Key: safeKey,
            }));
            return true;
        } catch (e: any) {
            if (e.name === 'NoSuchKey' || e['$metadata']?.httpStatusCode === 404) return false;
            throw e;
        }
    }

    async delete(key: string): Promise<void> {
        // Not strictly implemented for now as strict deletes might be handled by lifecycle policies or manual
        // But for completeness:
        // const safeKey = this.getSafeKey(key);
        // await this.client.send(new DeleteObjectCommand(...));
    }
}

export const storageService: IStorageService = appConfig.s3.enabled
    ? new S3Storage()
    : new LocalStorage(appConfig.storageDir);
