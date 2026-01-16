/**
 * Rspamd Spam Filter Integration
 * Provides spam scoring and filtering for incoming emails
 */

export interface SpamCheckResult {
    score: number;
    requiredScore: number;
    isSpam: boolean;
    action: 'no action' | 'greylist' | 'add header' | 'rewrite subject' | 'soft reject' | 'reject';
    symbols: Record<string, { score: number; description?: string }>;
    messageId?: string;
    spf?: 'pass' | 'fail' | 'softfail' | 'neutral' | 'none' | 'error';
    dkim?: 'pass' | 'fail' | 'none' | 'error';
    dmarc?: 'pass' | 'fail' | 'quarantine' | 'reject' | 'none';
}

const RSPAMD_URL = process.env.RSPAMD_URL || 'http://rspamd:11333';
const SPAM_THRESHOLD = parseFloat(process.env.SPAM_THRESHOLD || '5.0');

/**
 * Check an email for spam using Rspamd
 * @param emailBuffer - Raw email content as a Buffer
 * @param clientIp - IP address of the sending client (optional)
 * @returns Spam check result with score and action
 */
export async function checkSpam(
    emailBuffer: Buffer,
    clientIp?: string
): Promise<SpamCheckResult> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'message/rfc822',
        };

        if (clientIp) {
            headers['IP'] = clientIp;
        }

        const response = await fetch(`${RSPAMD_URL}/checkv2`, {
            method: 'POST',
            body: new Uint8Array(emailBuffer),
            headers,
        });

        if (!response.ok) {
            console.error(`Rspamd check failed with status ${response.status}`);
            // Return a safe default if Rspamd is unavailable
            return {
                score: 0,
                requiredScore: SPAM_THRESHOLD,
                isSpam: false,
                action: 'no action',
                symbols: {},
            };
        }

        const result = await response.json() as {
            score?: number;
            required_score?: number;
            action?: string;
            symbols?: Record<string, { score: number; description?: string }>;
            'message-id'?: string;
        };

        const score = result.score || 0;
        const requiredScore = result.required_score || SPAM_THRESHOLD;
        const symbols = result.symbols || {};

        // Extract Authentication Results (SPF, DKIM, DMARC)
        let spf: SpamCheckResult['spf'] = 'none';
        if (symbols['R_SPF_ALLOW']) spf = 'pass';
        else if (symbols['R_SPF_FAIL']) spf = 'fail';
        else if (symbols['R_SPF_SOFTFAIL']) spf = 'softfail';
        else if (symbols['R_SPF_NEUTRAL']) spf = 'neutral';
        else if (symbols['R_SPF_DNSFAIL']) spf = 'error';

        let dkim: SpamCheckResult['dkim'] = 'none';
        if (symbols['R_DKIM_ALLOW']) dkim = 'pass';
        else if (symbols['R_DKIM_REJECT']) dkim = 'fail';
        else if (symbols['R_DKIM_TEMPFAIL']) dkim = 'error';

        let dmarc: SpamCheckResult['dmarc'] = 'none';
        if (symbols['DMARC_POLICY_ALLOW']) dmarc = 'pass';
        else if (symbols['DMARC_POLICY_REJECT']) dmarc = 'reject';
        else if (symbols['DMARC_POLICY_QUARANTINE']) dmarc = 'quarantine';
        else if (symbols['DMARC_POLICY_SOFTFAIL']) dmarc = 'fail';

        return {
            score,
            requiredScore,
            isSpam: score >= requiredScore,
            action: (result.action || 'no action') as SpamCheckResult['action'],
            symbols,
            messageId: result['message-id'],
            spf,
            dkim,
            dmarc
        };
    } catch (error) {
        console.error('Rspamd spam check error:', error);
        // Return safe default if Rspamd is unavailable
        return {
            score: 0,
            requiredScore: SPAM_THRESHOLD,
            isSpam: false,
            action: 'no action',
            symbols: {},
        };
    }
}

/**
 * Determine if an email should be rejected based on spam check result
 * @param result - Spam check result
 * @returns true if the email should be rejected
 */
export function shouldRejectEmail(result: SpamCheckResult): boolean {
    return result.action === 'reject';
}

/**
 * Determine if an email should be quarantined
 * @param result - Spam check result
 * @returns true if the email should be quarantined
 */
export function shouldQuarantineEmail(result: SpamCheckResult): boolean {
    return result.action === 'soft reject' || result.isSpam;
}

/**
 * Format spam symbols for logging
 * @param result - Spam check result
 * @returns Formatted string of spam symbols
 */
export function formatSpamSymbols(result: SpamCheckResult): string {
    if (!result.symbols || Object.keys(result.symbols).length === 0) {
        return 'No symbols';
    }

    return Object.entries(result.symbols)
        .map(([name, data]) => `${name}(${data.score.toFixed(2)})`)
        .join(', ');
}
