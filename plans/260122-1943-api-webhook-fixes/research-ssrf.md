# SSRF Protection Research & Best Practices

## Executive Summary
Server-Side Request Forgery (SSRF) protection in Node.js requires a layered defense strategy. Relying solely on Regex or URL parsing is insufficient due to DNS rebinding and IPv6 obfuscation. The recommended approach uses a "Safe Fetch" utility that integrates Deep URL Validation and Request-Time IP Verification.

## 1. URL Validation Utility Patterns
Do not trust `regex` for URL validation. Use the WHATWG `URL` API.

### **Validation Checklist**
- [ ] **Protocol Whitelisting**: Strictly allow only `http:` and `https:`. Block `file:`, `gopher:`, `ftp:`.
- [ ] **Credential Stripping**: Reject URLs containing credentials (`user:pass@host`) to prevent leaking auth data to external endpoints.
- [ ] **Port Whitelisting**: Restrict to standard ports (80, 443) unless specific use cases require others.
- [ ] **Hostname Verification**: Ensure hostname is not an IP literal for private ranges before resolution.

```typescript
// Example: Basic Sanitization
const isValidUrl = (input: string): boolean => {
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (url.username || url.password) return false; // Block credentials
    return true;
  } catch {
    return false;
  }
};
```

## 2. IPv6 & IP Address Considerations
Attackers use IPv6 to bypass IPv4-only filters. Normalization is critical.

### **Critical Ranges to Block (Deny List)**
| Type | IPv4 Range | IPv6 Range |
|------|------------|------------|
| Loopback | `127.0.0.0/8` | `::1/128`, `::ffff:127.0.0.0/104` |
| Private (RFC 1918) | `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | `fc00::/7` (Unique Local) |
| Link-Local | `169.254.0.0/16` | `fe80::/10` |
| Cloud Metadata | `169.254.169.254` | (Varies by provider) |
| Any (0.0.0.0) | `0.0.0.0/8` | `::/128` |

### **IPv6 Utility Requirements**
- **Normalization**: Expand compressed IPv6 (e.g., `::1` → `0:0:0:0:0:0:0:1`) before checking against blocklists if performing string matching (though IP parsing libraries like `ipaddr.js` are preferred).
- **Mapped Addresses**: Block IPv4-mapped IPv6 addresses (e.g., `::ffff:127.0.0.1`) which can tunnel to localhost.

## 3. DNS Rebinding Protection
DNS Rebinding attacks exploit the gap between the "Check" (Validation) and the "Act" (HTTP Request).
*Attack Vector*: Attacker controls a DNS server.
1. First resolution (Check): Returns `1.2.3.4` (Safe).
2. Second resolution (Act): Returns `127.0.0.1` (Unsafe).

### **Recommended Mitigation: Custom Lookup Hook**
Instead of resolving first and then requesting, hook into the HTTP client's DNS lookup phase. This ensures the IP validated is the exact IP used for the connection.

#### **Implementation Strategy (Node.js)**
Use the `lookup` option in `http.request` (or `axios`/`fetch` agents).

```typescript
import * as dns from 'node:dns';
import * as net from 'node:net';

// 1. Define Blocklist Validator (using a library like ipaddr.js recommended)
const isSafeIP = (ip: string) => {
  // Check against private ranges (IPv4 & IPv6)
  // Return false if private/reserved
  return true;
};

// 2. Custom Lookup Function
const safeLookup = (hostname, options, callback) => {
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) return callback(err, address, family);

    if (!isSafeIP(address)) {
      return callback(new Error(`SSRF Blocked: resolved to ${address}`), null, null);
    }

    callback(null, address, family);
  });
};

// 3. Usage in Agent
// const agent = new https.Agent({ lookup: safeLookup });
// fetch(url, { agent });
```

## Unresolved Questions
- Which specific IP parsing library does the project prefer (`ipaddr.js` is standard)?
- Do we need to support redirects? (Redirects require re-validation of the new URL and its IP).

## Sources
- [OWASP Server Side Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Snyk: SSRF in Node.js](https://snyk.io/blog/detecting-and-preventing-ssrf-in-node-js/)
- [Node.js DNS Documentation](https://nodejs.org/api/dns.html)
