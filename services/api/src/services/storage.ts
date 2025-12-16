import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

import { appConfig } from "../config";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";

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

    private getPath(key: string) {
        return path.join(this.rootDir, key);
    }

    async save(key: string, content: Buffer | string, contentType?: string): Promise<void> {
        const targetPath = this.getPath(key);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, content);
    }

    async getReadStream(key: string): Promise<Readable> {
        const targetPath = this.getPath(key);
        return createReadStream(targetPath);
    }

    async exists(key: string): Promise<boolean> {
        try {
            await fs.access(this.getPath(key));
            return true;
        } catch {
            return false;
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await fs.unlink(this.getPath(key));
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

    async save(key: string, content: Buffer | string, contentType?: string): Promise<void> {
        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: content,
            ContentType: contentType || "application/octet-stream",
        }));
    }

    async getReadStream(key: string): Promise<Readable> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        const response = await this.client.send(command);
        if (!response.Body) {
            throw new Error("S3 object has no body");
        }
        return response.Body as Readable;
    }

    async exists(key: string): Promise<boolean> {
        try {
            await this.client.send(new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
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
        // await this.client.send(new DeleteObjectCommand(...));
    }
}

export const storageService: IStorageService = appConfig.s3.enabled
    ? new S3Storage()
    : new LocalStorage(appConfig.storageDir);
