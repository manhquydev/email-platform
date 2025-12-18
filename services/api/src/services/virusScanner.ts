/**
 * ClamAV Virus Scanner Integration
 * Provides virus scanning for email attachments
 */

import { Socket } from 'net';

export interface ScanResult {
    isClean: boolean;
    virus?: string;
    error?: string;
}

const CLAMAV_HOST = process.env.CLAMAV_HOST || 'clamav';
const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT || '3310', 10);
const SCAN_TIMEOUT = parseInt(process.env.CLAMAV_TIMEOUT || '30000', 10);

/**
 * Scan a buffer for viruses using ClamAV
 * @param buffer - File content to scan
 * @returns Scan result with clean status and any detected virus name
 */
export async function scanBuffer(buffer: Buffer): Promise<ScanResult> {
    return new Promise((resolve) => {
        const client = new Socket();
        let response = '';
        let resolved = false;

        const cleanup = () => {
            if (!resolved) {
                resolved = true;
                client.destroy();
            }
        };

        const timeout = setTimeout(() => {
            cleanup();
            resolve({ isClean: true, error: 'Scan timeout - assuming clean' });
        }, SCAN_TIMEOUT);

        client.on('error', (err) => {
            clearTimeout(timeout);
            cleanup();
            console.error('ClamAV connection error:', err.message);
            // Assume clean if ClamAV is unavailable (fail-open for availability)
            resolve({ isClean: true, error: `ClamAV unavailable: ${err.message}` });
        });

        client.on('data', (data) => {
            response += data.toString();
        });

        client.on('end', () => {
            clearTimeout(timeout);
            cleanup();

            // Parse ClamAV response
            // Format: "stream: OK" or "stream: VirusName FOUND"
            const trimmed = response.trim();

            if (trimmed.includes('OK')) {
                resolve({ isClean: true });
            } else if (trimmed.includes('FOUND')) {
                // Extract virus name
                const match = trimmed.match(/stream: (.+) FOUND/);
                const virusName = match ? match[1] : 'Unknown virus';
                resolve({ isClean: false, virus: virusName });
            } else if (trimmed.includes('ERROR')) {
                console.error('ClamAV scan error:', trimmed);
                resolve({ isClean: true, error: trimmed });
            } else {
                resolve({ isClean: true, error: `Unknown response: ${trimmed}` });
            }
        });

        client.connect(CLAMAV_PORT, CLAMAV_HOST, () => {
            // Use INSTREAM command for streaming data
            client.write('zINSTREAM\0');

            // Send buffer size as 4-byte network order integer
            const sizeBuffer = Buffer.alloc(4);
            sizeBuffer.writeUInt32BE(buffer.length, 0);
            client.write(sizeBuffer);

            // Send the actual data
            client.write(buffer);

            // Send zero-length chunk to indicate end of stream
            const endBuffer = Buffer.alloc(4);
            endBuffer.writeUInt32BE(0, 0);
            client.write(endBuffer);
        });
    });
}

/**
 * Scan multiple buffers and return results for each
 * @param buffers - Array of buffers with identifiers
 * @returns Array of scan results with identifiers
 */
export async function scanMultipleBuffers(
    buffers: Array<{ id: string; buffer: Buffer; filename: string }>
): Promise<Array<{ id: string; filename: string; result: ScanResult }>> {
    const results = await Promise.all(
        buffers.map(async ({ id, buffer, filename }) => ({
            id,
            filename,
            result: await scanBuffer(buffer),
        }))
    );

    return results;
}

/**
 * Check if any scan results contain a virus
 * @param results - Array of scan results
 * @returns true if any file contains a virus
 */
export function hasVirus(
    results: Array<{ result: ScanResult }>
): boolean {
    return results.some((r) => !r.result.isClean);
}

/**
 * Get list of detected viruses from scan results
 * @param results - Array of scan results
 * @returns Array of virus detections with filename and virus name
 */
export function getDetectedViruses(
    results: Array<{ filename: string; result: ScanResult }>
): Array<{ filename: string; virus: string }> {
    return results
        .filter((r) => !r.result.isClean && r.result.virus)
        .map((r) => ({
            filename: r.filename,
            virus: r.result.virus!,
        }));
}
