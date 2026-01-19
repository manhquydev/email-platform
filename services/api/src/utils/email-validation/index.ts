/**
 * Email Validation Module
 * Validates email addresses and domains against DNS records (MX, SPF, DMARC)
 */

// Types
export type { EmailValidationResult, DomainValidationResult, MxRecord } from "./types";

// DNS resolvers
export { resolveMxRecords, resolveSpfRecord, resolveDmarcRecord } from "./dns-resolver";

// Format validators
export { isValidEmailFormat, isValidDomainFormat, extractDomain, isDisposableDomain } from "./format-validators";

// Main validators
export { validateEmail, validateDomain, canReceiveEmail } from "./validators";
