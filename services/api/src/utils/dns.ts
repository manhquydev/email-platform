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
