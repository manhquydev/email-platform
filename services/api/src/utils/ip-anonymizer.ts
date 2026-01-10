/**
 * IP Anonymization Utility
 * Truncates the last octet of IP addresses to protect user privacy
 * while maintaining some geographic/network context for abuse prevention.
 */

/**
 * Anonymize an IP address by truncating the last segment
 * - IPv4: 192.168.1.100 → 192.168.1.0
 * - IPv6: 2001:db8::1234 → 2001:db8::0
 */
export function anonymizeIp(ip: string | undefined): string {
    if (!ip) return '0.0.0.0';

    // Handle IPv6
    if (ip.includes(':')) {
        // For IPv6, zero out the last 64 bits (interface identifier)
        const parts = ip.split(':');
        if (parts.length >= 4) {
            // Keep first 4 segments, zero rest
            return parts.slice(0, 4).join(':') + '::0';
        }
        return ip.replace(/:[^:]+$/, ':0');
    }

    // Handle IPv4
    const parts = ip.split('.');
    if (parts.length === 4) {
        parts[3] = '0';
        return parts.join('.');
    }

    // Fallback for malformed IPs
    return '0.0.0.0';
}

/**
 * Check if an IP is already anonymized
 */
export function isAnonymizedIp(ip: string): boolean {
    if (!ip) return true;

    // IPv4 ending in .0
    if (!ip.includes(':') && ip.endsWith('.0')) {
        return true;
    }

    // IPv6 ending in ::0 or :0
    if (ip.includes(':') && (ip.endsWith('::0') || ip.endsWith(':0'))) {
        return true;
    }

    return false;
}
