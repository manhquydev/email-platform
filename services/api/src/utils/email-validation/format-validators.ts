/**
 * Email Format Validation Utilities
 */

// Email format regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Domain format regex
const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(?:\.[a-zA-Z]{2,})+$/;

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
    "tempmail.com", "throwaway.email", "guerrillamail.com", "mailinator.com",
    "10minutemail.com", "temp-mail.org", "fakeinbox.com", "trashmail.com",
    "yopmail.com", "getnada.com", "maildrop.cc", "dispostable.com",
    "tempinbox.com", "mohmal.com", "emailondeck.com", "mintemail.com",
]);

/** Validate email format (RFC 5322 simplified) */
export function isValidEmailFormat(email: string): boolean {
    if (!email || email.length > 254) return false;
    return EMAIL_REGEX.test(email);
}

/** Validate domain format */
export function isValidDomainFormat(domain: string): boolean {
    return DOMAIN_REGEX.test(domain);
}

/** Extract domain from email address */
export function extractDomain(email: string): string | null {
    const parts = email.split("@");
    return parts.length === 2 ? parts[1].toLowerCase() : null;
}

/** Check if domain is a known disposable email provider */
export function isDisposableDomain(domain: string): boolean {
    return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}
