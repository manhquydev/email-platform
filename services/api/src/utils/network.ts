/**
 * Network Security Utilities
 * Shared SSRF protection functions for webhook URL validation
 */

/**
 * Check if a URL points to an internal/private network
 * Used to prevent SSRF attacks in webhook delivery
 *
 * @param urlString - The URL to validate
 * @returns true if the URL is internal/blocked, false if safe
 */
export const isInternalUrl = (urlString: string): boolean => {
    try {
        const url = new URL(urlString);
        const hostname = url.hostname.toLowerCase();

        // Block localhost and loopback
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
            return true;
        }

        // Block private IP ranges
        const ipv4Parts = hostname.split('.');
        if (ipv4Parts.length === 4) {
            const first = parseInt(ipv4Parts[0], 10);
            const second = parseInt(ipv4Parts[1], 10);

            // 10.x.x.x
            if (first === 10) return true;
            // 172.16.x.x - 172.31.x.x
            if (first === 172 && second >= 16 && second <= 31) return true;
            // 192.168.x.x
            if (first === 192 && second === 168) return true;
            // 169.254.x.x (link-local)
            if (first === 169 && second === 254) return true;
        }

        // Block internal docker/kubernetes hostnames
        if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.svc.cluster.local')) {
            return true;
        }

        return false;
    } catch {
        return true; // Block invalid URLs
    }
};
