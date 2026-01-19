/**
 * Email and Domain Validation Functions
 */
import type { EmailValidationResult, DomainValidationResult } from "./types";
import { resolveMxRecords, resolveSpfRecord, resolveDmarcRecord } from "./dns-resolver";
import { isValidEmailFormat, isValidDomainFormat, extractDomain, isDisposableDomain } from "./format-validators";

/** Validate an email address comprehensively */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const result: EmailValidationResult = {
        valid: false,
        email: normalizedEmail,
        domain: "",
        checks: { format: false, mxRecords: false, spfRecord: false, notDisposable: false },
        errors: [],
        warnings: [],
    };

    // Check format
    result.checks.format = isValidEmailFormat(normalizedEmail);
    if (!result.checks.format) {
        result.errors.push("Invalid email format");
        return result;
    }

    // Extract domain
    const domain = extractDomain(normalizedEmail);
    if (!domain) {
        result.errors.push("Could not extract domain from email");
        return result;
    }
    result.domain = domain;

    // Check disposable
    result.checks.notDisposable = !isDisposableDomain(domain);
    if (!result.checks.notDisposable) {
        result.errors.push("Disposable email addresses are not allowed");
        return result;
    }

    // Check MX records
    try {
        result.mxRecords = await resolveMxRecords(domain);
        result.checks.mxRecords = result.mxRecords.length > 0;
        if (!result.checks.mxRecords) {
            result.errors.push("Domain has no MX records - cannot receive email");
        }
    } catch {
        result.errors.push("Failed to lookup MX records");
    }

    // Check SPF record (warning only)
    try {
        result.spfRecord = (await resolveSpfRecord(domain)) ?? undefined;
        result.checks.spfRecord = !!result.spfRecord;
        if (!result.checks.spfRecord) {
            result.warnings.push("Domain has no SPF record - emails may be marked as spam");
        }
    } catch {
        result.warnings.push("Failed to lookup SPF record");
    }

    result.valid = result.checks.format && result.checks.mxRecords && result.checks.notDisposable;
    return result;
}

/** Validate a domain's email configuration */
export async function validateDomain(domainName: string): Promise<DomainValidationResult> {
    const normalizedDomain = domainName.toLowerCase().trim();
    const result: DomainValidationResult = {
        valid: false,
        domain: normalizedDomain,
        hasMx: false,
        hasSpf: false,
        hasDmarc: false,
        mxRecords: [],
        errors: [],
        recommendations: [],
    };

    if (!isValidDomainFormat(normalizedDomain)) {
        result.errors.push("Invalid domain format");
        return result;
    }

    // Check MX records
    try {
        result.mxRecords = await resolveMxRecords(normalizedDomain);
        result.hasMx = result.mxRecords.length > 0;
        if (!result.hasMx) {
            result.errors.push("No MX records found - domain cannot receive email");
            result.recommendations.push("Add MX records pointing to your mail server");
        }
    } catch {
        result.errors.push("Failed to lookup MX records");
    }

    // Check SPF record
    try {
        result.spfRecord = (await resolveSpfRecord(normalizedDomain)) ?? undefined;
        result.hasSpf = !!result.spfRecord;
        if (!result.hasSpf) {
            result.recommendations.push("Add SPF record: v=spf1 include:_spf.yourmailserver.com ~all");
        }
    } catch {
        result.recommendations.push("Could not verify SPF record");
    }

    // Check DMARC record
    try {
        result.dmarcRecord = (await resolveDmarcRecord(normalizedDomain)) ?? undefined;
        result.hasDmarc = !!result.dmarcRecord;
        if (!result.hasDmarc) {
            result.recommendations.push("Add DMARC record: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com");
        }
    } catch {
        result.recommendations.push("Could not verify DMARC record");
    }

    result.valid = result.hasMx;
    return result;
}

/** Quick check if email can receive messages */
export async function canReceiveEmail(email: string): Promise<boolean> {
    if (!isValidEmailFormat(email)) return false;
    const domain = extractDomain(email);
    if (!domain || isDisposableDomain(domain)) return false;

    try {
        const mxRecords = await resolveMxRecords(domain);
        return mxRecords.length > 0;
    } catch {
        return false;
    }
}
