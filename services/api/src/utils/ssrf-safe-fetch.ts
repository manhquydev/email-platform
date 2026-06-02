import { resolve4, resolve6 } from "dns/promises";
import { isIP } from "net";

export interface SsrfSafeFetchOptions extends RequestInit {
    timeoutMs?: number;
    allowedPorts?: number[];
}

// Webhooks talk to the public internet only. Block admin/database ports and stick to web ports.
const DEFAULT_ALLOWED_PORTS = [80, 443, 8080, 8443];

function isBlockedIPv4(ip: string): boolean {
    const parts = ip.split(".").map((p) => Number(p));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
        return true; // malformed → fail closed
    }
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8 private
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 carrier-grade NAT
    if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
    return false;
}

function isBlockedIPv6(ip: string): boolean {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true; // loopback / unspecified
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 unique-local
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
    if (mapped) return isBlockedIPv4(mapped[1]);
    return false;
}

function isBlockedIp(ip: string): boolean {
    const family = isIP(ip);
    if (family === 4) return isBlockedIPv4(ip);
    if (family === 6) return isBlockedIPv6(ip);
    return true; // not a parseable IP → fail closed
}

/**
 * fetch() wrapper that blocks Server-Side Request Forgery against internal infrastructure.
 *
 * Enforces HTTPS, an explicit port allowlist, an FQDN hostname, and — critically — resolves
 * the hostname and rejects any A/AAAA record that points at loopback / private / link-local
 * (incl. cloud-metadata 169.254.169.254) ranges. Redirects are refused so a public host
 * cannot 30x-bounce the request to an internal target.
 *
 * Residual risk: DNS rebinding between this check and the socket connect is not fully closed
 * (would require pinning the resolved IP at connect time); the redirect ban + resolve check
 * cover the practical webhook abuse cases.
 */
export async function ssrfSafeFetch(urlString: string, options: SsrfSafeFetchOptions = {}): Promise<Response> {
    const { timeoutMs = 10000, allowedPorts = DEFAULT_ALLOWED_PORTS, ...fetchOptions } = options;

    const url = new URL(urlString); // throws on malformed input

    if (url.protocol !== "https:") {
        throw new Error("Only HTTPS webhook URLs are allowed");
    }

    const hostname = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : 443;
    if (!allowedPorts.includes(port)) {
        throw new Error(`Webhook port ${port} is not allowed`);
    }

    if (isIP(hostname)) {
        if (isBlockedIp(hostname)) {
            throw new Error("Webhook target resolves to a blocked address");
        }
    } else {
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(hostname)) {
            throw new Error("Webhook hostname must be a fully qualified domain name");
        }
        const addresses: string[] = [];
        const [v4, v6] = await Promise.allSettled([resolve4(hostname), resolve6(hostname)]);
        if (v4.status === "fulfilled") addresses.push(...v4.value);
        if (v6.status === "fulfilled") addresses.push(...v6.value);
        if (addresses.length === 0) {
            throw new Error("Webhook hostname did not resolve");
        }
        for (const ip of addresses) {
            if (isBlockedIp(ip)) {
                throw new Error("Webhook target resolves to an internal address");
            }
        }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(urlString, { ...fetchOptions, signal: controller.signal, redirect: "error" });
    } finally {
        clearTimeout(timer);
    }
}
