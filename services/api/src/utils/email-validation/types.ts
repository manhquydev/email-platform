/**
 * Email Validation Types
 */

export interface EmailValidationResult {
    valid: boolean;
    email: string;
    domain: string;
    checks: {
        format: boolean;
        mxRecords: boolean;
        spfRecord: boolean;
        notDisposable: boolean;
    };
    mxRecords?: MxRecord[];
    spfRecord?: string;
    errors: string[];
    warnings: string[];
}

export interface DomainValidationResult {
    valid: boolean;
    domain: string;
    hasMx: boolean;
    hasSpf: boolean;
    hasDmarc: boolean;
    mxRecords: MxRecord[];
    spfRecord?: string;
    dmarcRecord?: string;
    errors: string[];
    recommendations: string[];
}

export interface MxRecord {
    exchange: string;
    priority: number;
}
