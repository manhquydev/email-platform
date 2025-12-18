import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';

const execAsync = promisify(exec);

export interface SpamCheckResult {
    isSpam: boolean;
    score: number;
    requiredScore: number;
    symbols?: string[];
    description?: string;
    virusDetected?: boolean;
    virusName?: string;
}

export class SpamFilterService {
    private rspamdEnabled: boolean;
    private clamavEnabled: boolean;
    private rspamdHost: string;
    private rspamdPort: number;
    private clamavSocket: string;

    constructor() {
        this.rspamdEnabled = process.env.RSPAMD_ENABLED === 'true';
        this.clamavEnabled = process.env.CLAMAV_ENABLED === 'true';
        this.rspamdHost = process.env.RSPAMD_HOST || 'localhost';
        this.rspamdPort = parseInt(process.env.RSPAMD_PORT || '11333');
        this.clamavSocket = process.env.CLAMAV_SOCKET || '/tmp/clamd.sock';
    }

    /**
     * Check email for spam and viruses
     */
    async checkEmail(
        from: string,
        to: string[],
        subject: string,
        textBody?: string,
        htmlBody?: string,
        attachments?: Array<{ filename: string; data: Buffer; mimeType: string }>
    ): Promise<SpamCheckResult> {
        const results: SpamCheckResult = {
            isSpam: false,
            score: 0,
            requiredScore: 10,
            virusDetected: false,
        };

        // Check with Rspamd if enabled
        if (this.rspamdEnabled) {
            try {
                const rspamdResult = await this.checkWithRspamd(from, to, subject, textBody, htmlBody, attachments);
                Object.assign(results, rspamdResult);
            } catch (error: any) {
                console.error('Rspamd check failed:', error.message);
                // Continue with default values if Rspamd fails
            }
        }

        // Check attachments for viruses if ClamAV is enabled
        if (this.clamavEnabled && attachments && attachments.length > 0) {
            try {
                const virusResult = await this.checkWithClamAV(attachments);
                if (virusResult.virusDetected) {
                    results.virusDetected = true;
                    results.virusName = virusResult.virusName;
                    results.isSpam = true; // Treat virus as spam
                    results.score = Math.max(results.score, 100); // High score for viruses
                }
            } catch (error: any) {
                console.error('ClamAV check failed:', error.message);
                // Continue without virus check if ClamAV fails
            }
        }

        // Additional basic spam checks (always enabled)
        const basicSpamScore = this.performBasicSpamChecks(from, to, subject, textBody, htmlBody);
        results.score += basicSpamScore.score;
        results.isSpam = results.score > results.requiredScore;

        return results;
    }

    /**
     * Check email with Rspamd
     */
    private async checkWithRspamd(
        from: string,
        to: string[],
        subject: string,
        textBody?: string,
        htmlBody?: string,
        attachments?: Array<{ filename: string; data: Buffer; mimeType: string }>
    ): Promise<Partial<SpamCheckResult>> {
        // Build email message for Rspamd
        let message = `From: ${from}\n`;
        message += `To: ${to.join(', ')}\n`;
        message += `Subject: ${subject}\n`;
        message += `MIME-Version: 1.0\n`;

        if (attachments && attachments.length > 0) {
            // Simple multipart message
            const boundary = `boundary-${Date.now()}`;
            message += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

            // Text part
            message += `--${boundary}\n`;
            message += `Content-Type: text/plain; charset=utf-8\n\n`;
            message += textBody || '' + '\n\n';

            // Attachments
            for (const attachment of attachments) {
                message += `--${boundary}\n`;
                message += `Content-Type: ${attachment.mimeType}\n`;
                message += `Content-Disposition: attachment; filename="${attachment.filename}"\n`;
                message += `Content-Transfer-Encoding: base64\n\n`;
                message += attachment.data.toString('base64') + '\n\n';
            }

            message += `--${boundary}--`;
        } else {
            message += `Content-Type: text/plain; charset=utf-8\n\n`;
            message += textBody || htmlBody || '';
        }

        try {
            // Use HTTP API to scan with Rspamd
            const fetch = require('node-fetch');
            const response = await fetch(`http://${this.rspamdHost}:${this.rspamdPort}/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: message,
            });

            if (!response.ok) {
                throw new Error(`Rspamd API error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            const data = result.data || result;

            return {
                isSpam: data.action === 'reject' || data.action === 'add header',
                score: data.score || 0,
                requiredScore: data.required_score || 10,
                symbols: Object.keys(data.symbols || {}),
                description: data.action || 'No action',
            };
        } catch (error) {
            // Fallback to CLI if HTTP fails
            try {
                const tmpFile = `/tmp/email-${Date.now()}.eml`;
                require('fs').writeFileSync(tmpFile, message);

                const { stdout } = await execAsync(`rspamc --json ${tmpFile}`);
                const data = JSON.parse(stdout);

                // Clean up temp file
                await execAsync(`rm -f ${tmpFile}`);

                return {
                    isSpam: data.action === 'reject' || data.action === 'add header',
                    score: data.score || 0,
                    requiredScore: data.required_score || 10,
                    symbols: Object.keys(data.symbols || {}),
                    description: data.action || 'No action',
                };
            } catch (cliError) {
                throw new Error(`Both HTTP and CLI Rspamd checks failed: ${error}`);
            }
        }
    }

    /**
     * Check attachments with ClamAV
     */
    private async checkWithClamAV(
        attachments: Array<{ filename: string; data: Buffer; mimeType: string }>
    ): Promise<{ virusDetected: boolean; virusName?: string }> {
        for (const attachment of attachments) {
            try {
                // Write attachment to temp file
                const tmpFile = `/tmp/scan-${Date.now()}-${attachment.filename}`;
                require('fs').writeFileSync(tmpFile, attachment.data);

                // Scan with ClamAV
                const { stdout } = await execAsync(`clamdscan --no-summary "${tmpFile}"`);

                // Clean up temp file
                await execAsync(`rm -f "${tmpFile}"`);

                // Parse output
                if (stdout.includes('FOUND')) {
                    const match = stdout.match(/(.+):\s+(.+)\s+FOUND/);
                    if (match) {
                        return {
                            virusDetected: true,
                            virusName: match[2],
                        };
                    }
                }
            } catch (error: any) {
                // If scan fails, log but continue with other attachments
                console.error(`Failed to scan ${attachment.filename}:`, error.message);
            }
        }

        return { virusDetected: false };
    }

    /**
     * Perform basic spam checks (always enabled)
     */
    private performBasicSpamChecks(
        from: string,
        to: string[],
        subject: string,
        textBody?: string,
        htmlBody?: string
    ): { score: number; reasons: string[] } {
        let score = 0;
        const reasons: string[] = [];

        // Check from domain
        const fromDomain = from.split('@')[1];
        if (fromDomain) {
            // Common spam domains
            const spamDomains = ['10minutemail.com', 'guerrillamail.com', 'temp-mail.org'];
            if (spamDomains.some(domain => fromDomain.includes(domain))) {
                score += 5;
                reasons.push('From known temp email domain');
            }
        }

        // Check subject for spam indicators
        const spamKeywords = [
            'free money', 'viagra', 'casino', 'lottery', 'winner', 'claim now',
            'limited offer', 'act now', 'urgent', 'congratulations', 'you have won',
            'click here', 'risk free', '100% free', 'no cost', 'special promotion'
        ];

        const subjectLower = subject.toLowerCase();
        for (const keyword of spamKeywords) {
            if (subjectLower.includes(keyword)) {
                score += 2;
                reasons.push(`Spam keyword in subject: ${keyword}`);
            }
        }

        // Check for excessive capitalization
        const capsRatio = (subject.match(/[A-Z]/g) || []).length / subject.length;
        if (capsRatio > 0.5) {
            score += 3;
            reasons.push('Excessive capitalization in subject');
        }

        // Check for suspicious URLs
        const content = (textBody || htmlBody || '').toLowerCase();
        const suspiciousPatterns = [
            /bit\.ly/, /tinyurl\.com/, /shorturl\.at/,
            /\.xyz/, /\.top/, /\.loan/, /\.win/,
            /http.*http/, /www.*www/,
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(content)) {
                score += 1;
                reasons.push('Suspicious URL pattern detected');
            }
        }

        // Check body length
        const bodyLength = (textBody || htmlBody || '').length;
        if (bodyLength < 50 && !textBody?.match(/^(test|hi|hello|hey)/i)) {
            score += 1;
            reasons.push('Very short email body');
        }

        return { score, reasons };
    }

    /**
     * Learn from ham (non-spam)
     */
    async learnHam(
        from: string,
        to: string[],
        subject: string,
        textBody?: string,
        htmlBody?: string
    ): Promise<void> {
        if (!this.rspamdEnabled) return;

        try {
            // Build message
            const message = `From: ${from}\nTo: ${to.join(', ')}\nSubject: ${subject}\n\n${textBody || htmlBody || ''}`;

            const tmpFile = `/tmp/ham-${Date.now()}.eml`;
            require('fs').writeFileSync(tmpFile, message);

            // Train Rspamd
            await execAsync(`rspamc learn_ham ${tmpFile}`);

            // Clean up
            await execAsync(`rm -f ${tmpFile}`);

            console.log('Successfully trained ham in Rspamd');
        } catch (error: any) {
            console.error('Failed to train ham:', error.message);
        }
    }

    /**
     * Learn from spam
     */
    async learnSpam(
        from: string,
        to: string[],
        subject: string,
        textBody?: string,
        htmlBody?: string
    ): Promise<void> {
        if (!this.rspamdEnabled) return;

        try {
            // Build message
            const message = `From: ${from}\nTo: ${to.join(', ')}\nSubject: ${subject}\n\n${textBody || htmlBody || ''}`;

            const tmpFile = `/tmp/spam-${Date.now()}.eml`;
            require('fs').writeFileSync(tmpFile, message);

            // Train Rspamd
            await execAsync(`rspamc learn_spam ${tmpFile}`);

            // Clean up
            await execAsync(`rm -f ${tmpFile}`);

            console.log('Successfully trained spam in Rspamd');
        } catch (error: any) {
            console.error('Failed to train spam:', error.message);
        }
    }

    /**
     * Get statistics from Rspamd
     */
    async getStats(): Promise<any> {
        if (!this.rspamdEnabled) {
            return { enabled: false };
        }

        try {
            const { stdout } = await execAsync(`rspamc stat`);
            // Parse statistics output (implementation depends on your needs)
            return {
                enabled: true,
                raw: stdout,
            };
        } catch (error: any) {
            return {
                enabled: true,
                error: error.message,
            };
        }
    }
}

export const spamFilterService = new SpamFilterService();