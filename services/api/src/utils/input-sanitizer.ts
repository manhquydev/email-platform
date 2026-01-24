/**
 * Input Sanitization Utilities
 * Phase 4: Input Validation & Injection Prevention
 *
 * Defense in depth: Multiple layers of validation to prevent:
 * - Path traversal attacks
 * - Email header injection
 * - SSRF via webhooks
 * - SQL injection (via parameterization audit)
 */
import { isIP } from "net";

/**
 * Sanitize storage key to prevent path traversal attacks
 * Removes: .., leading slashes, special characters
 */
export function sanitizeStorageKey(key: string): string {
  if (!key || typeof key !== "string") {
    throw new Error("Invalid storage key: empty or non-string");
  }

  // Remove path traversal attempts
  const sanitized = key
    .replace(/\.\./g, "") // Remove parent directory references
    .replace(/^\/+/, "") // Remove leading slashes
    .replace(/[<>:"|?*\x00-\x1f]/g, "") // Remove dangerous characters
    .replace(/\\/g, "/") // Normalize path separators
    .replace(/\/+/g, "/"); // Collapse consecutive slashes

  // Validate against allowed pattern (alphanumeric, dash, underscore, slash, dot)
  if (!/^[a-zA-Z0-9\-_\/\.]+$/.test(sanitized)) {
    throw new Error("Invalid storage key: contains invalid characters");
  }

  // Ensure not empty after sanitization
  if (sanitized.length === 0) {
    throw new Error("Invalid storage key: empty after sanitization");
  }

  return sanitized;
}

/**
 * Validate that a file path stays within the base directory
 * Prevents path traversal even if sanitization is bypassed
 */
export function isPathWithinBase(filePath: string, baseDir: string): boolean {
  const path = require("path");
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);

  return resolvedPath.startsWith(resolvedBase + path.sep) || resolvedPath === resolvedBase;
}

/**
 * Sanitize email header value to prevent header injection
 * Removes: CR, LF, null bytes (prevents injection of additional headers)
 */
export function sanitizeEmailHeader(value: string): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\r\n]/g, " ") // Replace CR/LF with space (prevents header injection)
    .replace(/\0/g, "") // Remove null bytes
    .replace(/\t/g, " ") // Replace tabs with space
    .trim();
}

/**
 * Sanitize email subject line
 * Additional protection for subject-specific attacks
 */
export function sanitizeEmailSubject(subject: string): string {
  const sanitized = sanitizeEmailHeader(subject);

  // Limit length to prevent buffer issues
  if (sanitized.length > 998) {
    return sanitized.slice(0, 995) + "...";
  }

  return sanitized;
}

/**
 * Validate webhook URL to prevent SSRF attacks
 * Blocks: internal protocols, localhost, private IPs, link-local addresses
 */
export function validateWebhookUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);

    // Only allow HTTP(S) protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, reason: "Only HTTP(S) protocols allowed" };
    }

    // Block localhost and common internal hostnames
    const blockedHosts = [
      "localhost",
      "127.0.0.1",
      "::1",
      "0.0.0.0",
      "[::1]",
      "localhost.localdomain",
      "ip6-localhost",
      "ip6-loopback",
    ];

    const hostname = parsed.hostname.toLowerCase();
    if (blockedHosts.includes(hostname)) {
      return { valid: false, reason: "Internal addresses not allowed" };
    }

    // Block private IP ranges
    if (isPrivateIP(hostname)) {
      return { valid: false, reason: "Private IP addresses not allowed" };
    }

    // Block metadata service endpoints (cloud provider SSRF)
    const metadataHosts = [
      "169.254.169.254", // AWS/GCP/Azure metadata
      "metadata.google.internal",
      "metadata.google.com",
    ];
    if (metadataHosts.includes(hostname)) {
      return { valid: false, reason: "Metadata endpoints not allowed" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }
}

/**
 * Check if a hostname is a private/internal IP address
 * Covers: RFC 1918, RFC 4193, link-local, loopback ranges
 */
export function isPrivateIP(host: string): boolean {
  // Remove IPv6 brackets if present
  const cleanHost = host.replace(/^\[|\]$/g, "");

  // Check if it's an IP address
  const ipVersion = isIP(cleanHost);
  if (ipVersion === 0) {
    return false; // Not an IP, could be a hostname
  }

  // IPv4 private ranges
  const ipv4PrivateRanges = [
    /^10\./, // 10.0.0.0/8 (Class A private)
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12 (Class B private)
    /^192\.168\./, // 192.168.0.0/16 (Class C private)
    /^169\.254\./, // 169.254.0.0/16 (Link-local)
    /^127\./, // 127.0.0.0/8 (Loopback)
    /^0\./, // 0.0.0.0/8 (Current network)
  ];

  // IPv6 private ranges
  const ipv6PrivateRanges = [
    /^fc00:/i, // fc00::/7 (Unique local addresses)
    /^fd/i, // fd00::/8 (Unique local addresses)
    /^fe80:/i, // fe80::/10 (Link-local)
    /^::1$/i, // ::1/128 (Loopback)
    /^::$/i, // ::/128 (Unspecified)
  ];

  const ranges = ipVersion === 4 ? ipv4PrivateRanges : ipv6PrivateRanges;
  return ranges.some((r) => r.test(cleanHost));
}

/**
 * Sanitize HTML content to prevent XSS
 * Basic sanitization - for full HTML, use a dedicated library like DOMPurify
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  return html
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate and sanitize a domain name
 */
export function sanitizeDomainName(domain: string): string {
  if (!domain || typeof domain !== "string") {
    throw new Error("Invalid domain: empty or non-string");
  }

  const sanitized = domain
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-\.]/g, "");

  // Basic domain validation
  if (!/^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)*$/.test(sanitized)) {
    throw new Error("Invalid domain format");
  }

  return sanitized;
}

/**
 * Log blocked injection attempt for security monitoring
 */
export function logInjectionAttempt(
  type: "path_traversal" | "header_injection" | "ssrf" | "sql_injection",
  details: Record<string, unknown>,
  logger?: { warn: (msg: string, data?: unknown) => void }
): void {
  const logData = {
    security_event: "injection_attempt",
    type,
    timestamp: new Date().toISOString(),
    ...details,
  };

  if (logger) {
    logger.warn("Security: Injection attempt blocked", logData);
  } else {
    console.warn("[SECURITY] Injection attempt blocked:", JSON.stringify(logData));
  }
}
