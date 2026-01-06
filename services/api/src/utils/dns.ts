import { promises as dns } from "dns";

export const resolveTxt = async (domain: string): Promise<string[][]> => {
    try {
        const records = await dns.resolveTxt(domain);
        return records;
    } catch (error) {
        // If domain not found or no TXT records, return empty array
        // ENOTFOUND or ENODATA are common errors for missing records
        if ((error as NodeJS.ErrnoException).code === "ENOTFOUND" || (error as NodeJS.ErrnoException).code === "ENODATA") {
            return [];
        }
        throw error;
    }
};

export const verifyDomainOwnership = async (domain: string, token: string): Promise<boolean> => {
    try {
        const records = await resolveTxt(domain);
        // records is an array of arrays of strings (chunks)
        // We flatten each record to a single string and check if it exactly matches the token
        // OR if the record is like "verification=token" (common pattern)
        // For this MVP, we look for exact match or "email-verification=<token>"

        // Flatten chunks
        const txtStrings = records.map(chunks => chunks.join(""));

        return txtStrings.some(txt =>
            txt === token ||
            txt === `email-verification=${token}` ||
            txt === `verification=${token}`
        );
    } catch (error) {
        console.error(`DNS lookup failed for ${domain}:`, error);
        return false;
    }
};

export interface DnsCheckResult {
    txt: string[];
    mx: { exchange: string; priority: number }[];
    hasVerificationRecord: boolean;
    expectedRecord: string;
}

export const checkDomainDns = async (domain: string, verificationToken: string): Promise<DnsCheckResult> => {
    const result: DnsCheckResult = {
        txt: [],
        mx: [],
        hasVerificationRecord: false,
        expectedRecord: `email-verification=${verificationToken}`,
    };

    try {
        const txtRecords = await resolveTxt(domain);
        result.txt = txtRecords.map(chunks => chunks.join(""));
        result.hasVerificationRecord = result.txt.some(txt =>
            txt === verificationToken ||
            txt === `email-verification=${verificationToken}` ||
            txt === `verification=${verificationToken}`
        );
    } catch (error) {
        // Ignore TXT lookup errors
    }

    try {
        const mxRecords = await dns.resolveMx(domain);
        result.mx = mxRecords.map(r => ({ exchange: r.exchange, priority: r.priority }));
    } catch (error) {
        // Ignore MX lookup errors
    }

    return result;
};
