/**
 * DNS Resolution Utilities for Email Validation
 */
import { promises as dns } from "dns";
import type { MxRecord } from "./types";

/** Handle DNS errors gracefully */
function isDnsNotFoundError(error: unknown): boolean {
    const code = (error as NodeJS.ErrnoException).code;
    return code === "ENOTFOUND" || code === "ENODATA";
}

/** Resolve MX records for a domain */
export async function resolveMxRecords(domain: string): Promise<MxRecord[]> {
    try {
        const records = await dns.resolveMx(domain);
        return records
            .map(r => ({ exchange: r.exchange, priority: r.priority }))
            .sort((a, b) => a.priority - b.priority);
    } catch (error) {
        if (isDnsNotFoundError(error)) return [];
        throw error;
    }
}

/** Resolve SPF record for a domain */
export async function resolveSpfRecord(domain: string): Promise<string | null> {
    try {
        const records = await dns.resolveTxt(domain);
        const spfRecords = records
            .map(chunks => chunks.join(""))
            .filter(txt => txt.startsWith("v=spf1"));
        return spfRecords[0] ?? null;
    } catch (error) {
        if (isDnsNotFoundError(error)) return null;
        throw error;
    }
}

/** Resolve DMARC record for a domain */
export async function resolveDmarcRecord(domain: string): Promise<string | null> {
    try {
        const records = await dns.resolveTxt(`_dmarc.${domain}`);
        const dmarcRecords = records
            .map(chunks => chunks.join(""))
            .filter(txt => txt.startsWith("v=DMARC1"));
        return dmarcRecords[0] ?? null;
    } catch (error) {
        if (isDnsNotFoundError(error)) return null;
        throw error;
    }
}
