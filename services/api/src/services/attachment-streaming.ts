import { createReadStream, createWriteStream, Stats } from 'fs';
import { createGunzip, createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

interface StreamingOptions {
  chunkSize?: number;
  compress?: boolean;
  cacheControl?: string;
  contentType?: string;
  contentDisposition?: string;
}

interface StreamInfo {
  size: number;
  chunks: number;
  speed: number;
  progress: number;
}

/**
 * Optimized attachment streaming service
 * Handles large files without loading into memory
 */
export class AttachmentStreamingService {
  private readonly UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
  private readonly CHUNK_SIZE = 64 * 1024; // 64KB chunks
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

  constructor() {
    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  /**
   * Stream upload with memory efficiency
   */
  async streamUpload(
    request: FastifyRequest,
    filename: string,
    options: StreamingOptions = {}
  ): Promise<{ fileId: string; size: number; checksum: string }> {
    const fileId = uuidv4();
    const filePath = join(this.UPLOAD_DIR, fileId);
    const writeStream = createWriteStream(filePath);
    const chunkSize = options.chunkSize || this.CHUNK_SIZE;

    // Track upload progress
    let size = 0;
    let chunks = 0;
    const startTime = Date.now();

    try {
      // Create hash for integrity
      const { createHash } = await import('crypto');
      const hash = createHash('sha256');

      // Stream data with compression if enabled
      let processStream = request.raw;
      if (options.compress) {
        processStream = request.raw.pipe(createGzip());
      }

      for await (const chunk of processStream) {
        size += chunk.length;
        chunks++;

        // Check file size limit
        if (size > this.MAX_FILE_SIZE) {
          writeStream.destroy();
          this.cleanupFile(fileId);
          throw new Error('File size exceeds limit');
        }

        hash.update(chunk);
        writeStream.write(chunk);

        // Emit progress for WebSocket updates
        if (chunks % 10 === 0) {
          const progress = (size / this.MAX_FILE_SIZE) * 100;
          this.emitProgress(fileId, { size, chunks, progress, speed: 0 });
        }
      }

      writeStream.end();
      const checksum = hash.digest('hex');

      return { fileId, size, checksum };
    } catch (error) {
      writeStream.destroy();
      this.cleanupFile(fileId);
      throw error;
    }
  }

  /**
   * Stream download with range support
   */
  async streamDownload(
    reply: FastifyReply,
    fileId: string,
    filename: string,
    options: StreamingOptions = {}
  ): Promise<void> {
    const filePath = join(this.UPLOAD_DIR, fileId);
    const stats = await this.getFileStats(filePath);

    if (!stats) {
      reply.code(404).send({ error: 'File not found' });
      return;
    }

    // Handle range requests
    const range = request.headers.range;
    const start = range ? this.parseRange(range, stats.size) : 0;
    const end = stats.size - 1;

    // Set headers
    const headers = {
      'Content-Type': options.contentType || this.getMimeType(filename),
      'Content-Length': (end - start + 1).toString(),
      'Accept-Ranges': 'bytes',
      'Cache-Control': options.cacheControl || 'public, max-age=31536000',
      'Content-Disposition': options.contentDisposition ||
        `attachment; filename="${encodeURIComponent(filename)}"`,
    };

    if (range && start > 0) {
      headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
      reply.code(206); // Partial content
    }

    reply.headers(headers);

    // Stream file
    const readStream = createReadStream(filePath, { start, end });
    const streamInfo: StreamInfo = {
      size: stats.size,
      chunks: 0,
      speed: 0,
      progress: 0,
    };

    try {
      // Track download progress
      const startTime = Date.now();
      let downloaded = 0;

      readStream.on('data', (chunk) => {
        downloaded += chunk.length;
        streamInfo.chunks++;
        streamInfo.speed = downloaded / ((Date.now() - startTime) / 1000);
        streamInfo.progress = (downloaded / stats.size) * 100;
      });

      // Pipe to response
      await pipeline(readStream, reply.raw);
    } catch (error) {
      readStream.destroy();
      throw error;
    }
  }

  /**
   * Process attachment with streaming
   */
  async processAttachment(
    fileId: string,
    processor: (chunk: Buffer) => Promise<Buffer>
  ): Promise<string> {
    const filePath = join(this.UPLOAD_DIR, fileId);
    const tempFileId = uuidv4();
    const tempFilePath = join(this.UPLOAD_DIR, tempFileId);

    try {
      const readStream = createReadStream(filePath);
      const writeStream = createWriteStream(tempFilePath);

      for await (const chunk of readStream) {
        const processedChunk = await processor(chunk);
        writeStream.write(processedChunk);
      }

      writeStream.end();
      return tempFileId;
    } catch (error) {
      this.cleanupFile(tempFileId);
      throw error;
    }
  }

  /**
   * Compress attachment on-demand
   */
  async compressAttachment(fileId: string): Promise<string> {
    return this.processAttachment(fileId, async (chunk) => {
      return new Promise((resolve, reject) => {
        createGzip()(chunk, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
    });
  }

  /**
   * Decompress attachment on-demand
   */
  async decompressAttachment(fileId: string): Promise<string> {
    return this.processAttachment(fileId, async (chunk) => {
      return new Promise((resolve, reject) => {
        createGunzip()(chunk, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
    });
  }

  /**
   * Get file statistics without loading into memory
   */
  private async getFileStats(filePath: string): Promise<Stats | null> {
    try {
      const { stat } = await import('fs/promises');
      return await stat(filePath);
    } catch {
      return null;
    }
  }

  /**
   * Parse Range header
   */
  private parseRange(range: string, fileSize: number): number {
    const matches = range.match(/bytes=(\d+)-/);
    if (matches) {
      const start = parseInt(matches[1]);
      return Math.min(start, fileSize - 1);
    }
    return 0;
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      zip: 'application/zip',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Emit progress for WebSocket connections
   */
  private emitProgress(fileId: string, info: StreamInfo): void {
    // Emit to WebSocket clients if available
    process.emit('attachment:progress', { fileId, info });
  }

  /**
   * Cleanup file
   */
  private async cleanupFile(fileId: string): Promise<void> {
    try {
      const { unlink } = await import('fs/promises');
      await unlink(join(this.UPLOAD_DIR, fileId));
    } catch (error) {
      console.error('Failed to cleanup file:', error);
    }
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      const { mkdir } = await import('fs/promises');
      await mkdir(this.UPLOAD_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  /**
   * Clean up old files
   */
  async cleanupOldFiles(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const { readdir, unlink, stat } = await import('fs/promises');
      const files = await readdir(this.UPLOAD_DIR);
      let cleaned = 0;

      for (const file of files) {
        const filePath = join(this.UPLOAD_DIR, file);
        const stats = await stat(filePath);

        if (Date.now() - stats.mtime.getTime() > maxAge) {
          await unlink(filePath);
          cleaned++;
        }
      }

      return cleaned;
    } catch (error) {
      console.error('Failed to cleanup old files:', error);
      return 0;
    }
  }
}

// Export singleton instance
const attachmentStreaming = new AttachmentStreamingService();
export default attachmentStreaming;

// Export class for testing
export { AttachmentStreamingService };