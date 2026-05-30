import { promises as dnsPromises } from "dns";

// Retryable DNS error codes — transient failures in Docker/container environments
const RETRYABLE_CODES = new Set(["ESERVFAIL", "ETIMEOUT", "ECONNREFUSED", "EREFUSED"]);
// Non-error codes — domain exists but has no record of that type
const EMPTY_RESULT_CODES = new Set(["ENOTFOUND", "ENODATA"]);

const EXTERNAL_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1000;

function createResolver(): dnsPromises.Resolver {
    const resolver = new dnsPromises.Resolver({ timeout: 5000 });
    resolver.setServers(EXTERNAL_DNS_SERVERS);
    return resolver;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code ?? "";
            if (RETRYABLE_CODES.has(code) && attempt < RETRY_COUNT) {
                console.warn(`[dns] ${label} transient error (${code}), retry ${attempt + 1}/${RETRY_COUNT}`);
                await sleep(RETRY_DELAY_MS);
                lastError = error;
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

export const resolveTxt = async (domain: string): Promise<string[][]> => {
    const resolver = createResolver();
    try {
        return await withRetry(
            () => resolver.resolveTxt(domain),
            `resolveTxt(${domain})`
        );
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code ?? "";
        if (EMPTY_RESULT_CODES.has(code)) {
            return [];
        }
        console.error(`[dns] resolveTxt(${domain}) failed [${code}]:`, (error as Error).message);
        throw error;
    }
};

export const verifyDomainOwnership = async (domain: string, token: string): Promise<boolean> => {
    try {
        const records = await resolveTxt(domain);
        const txtStrings = records.map(chunks => chunks.join(""));
        const verified = txtStrings.some(txt =>
            txt === token ||
            txt === `email-verification=${token}` ||
            txt === `verification=${token}`
        );
        if (!verified) {
            console.info(`[dns] verifyDomainOwnership(${domain}) — records found: ${txtStrings.length}, token not matched`);
        }
        return verified;
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code ?? "UNKNOWN";
        console.error(`[dns] verifyDomainOwnership(${domain}) failed [${code}]:`, (error as Error).message);
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
    const resolver = createResolver();
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
        const code = (error as NodeJS.ErrnoException).code ?? "UNKNOWN";
        console.warn(`[dns] checkDomainDns TXT(${domain}) skipped [${code}]`);
    }

    try {
        const mxRecords = await withRetry(
            () => resolver.resolveMx(domain),
            `resolveMx(${domain})`
        );
        result.mx = mxRecords.map(r => ({ exchange: r.exchange, priority: r.priority }));
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code ?? "UNKNOWN";
        console.warn(`[dns] checkDomainDns MX(${domain}) skipped [${code}]`);
    }

    return result;
};
