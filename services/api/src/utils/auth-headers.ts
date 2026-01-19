/**
 * Email Authentication Headers Utility
 * Generates RFC 8601 Authentication-Results headers
 * and prepares data for ARC (Authenticated Received Chain) support
 */

import type { SpamCheckResult } from '../services/spamFilter';

export interface AuthHeadersConfig {
  authservId: string; // Our domain identifier (e.g., "ephemera.email")
  messageId?: string;
  clientIp?: string;
}

export interface AuthenticationResults {
  header: string;
  summary: {
    spf: string;
    dkim: string;
    dmarc: string;
    overall: 'pass' | 'fail' | 'neutral';
  };
}

/**
 * Generate RFC 8601 compliant Authentication-Results header
 * @see https://datatracker.ietf.org/doc/html/rfc8601
 */
export function generateAuthResultsHeader(
  spamResult: SpamCheckResult,
  config: AuthHeadersConfig
): AuthenticationResults {
  const parts: string[] = [config.authservId];

  // SPF result
  const spfResult = spamResult.spf || 'none';
  const spfPart = formatSpfResult(spfResult, config.clientIp);
  parts.push(spfPart);

  // DKIM result
  const dkimResult = spamResult.dkim || 'none';
  const dkimPart = formatDkimResult(dkimResult);
  parts.push(dkimPart);

  // DMARC result
  const dmarcResult = spamResult.dmarc || 'none';
  const dmarcPart = formatDmarcResult(dmarcResult);
  parts.push(dmarcPart);

  // Calculate overall result
  const overall = calculateOverallResult(spfResult, dkimResult, dmarcResult);

  return {
    header: parts.join(';\n       '),
    summary: {
      spf: spfResult,
      dkim: dkimResult,
      dmarc: dmarcResult,
      overall,
    },
  };
}

/**
 * Format SPF result for Authentication-Results header
 */
function formatSpfResult(result: string, clientIp?: string): string {
  const ipPart = clientIp ? ` smtp.client-ip=${clientIp}` : '';

  switch (result) {
    case 'pass':
      return `spf=pass${ipPart}`;
    case 'fail':
      return `spf=fail (sender SPF not authorized)${ipPart}`;
    case 'softfail':
      return `spf=softfail (domain owner discourages use)${ipPart}`;
    case 'neutral':
      return `spf=neutral${ipPart}`;
    case 'error':
      return `spf=temperror (DNS error)${ipPart}`;
    default:
      return `spf=none${ipPart}`;
  }
}

/**
 * Format DKIM result for Authentication-Results header
 */
function formatDkimResult(result: string): string {
  switch (result) {
    case 'pass':
      return 'dkim=pass';
    case 'fail':
      return 'dkim=fail (signature verification failed)';
    case 'error':
      return 'dkim=temperror (verification error)';
    default:
      return 'dkim=none';
  }
}

/**
 * Format DMARC result for Authentication-Results header
 */
function formatDmarcResult(result: string): string {
  switch (result) {
    case 'pass':
      return 'dmarc=pass';
    case 'fail':
      return 'dmarc=fail (policy=reject)';
    case 'quarantine':
      return 'dmarc=fail (policy=quarantine)';
    case 'reject':
      return 'dmarc=fail (policy=reject)';
    default:
      return 'dmarc=none';
  }
}

/**
 * Calculate overall authentication result
 */
function calculateOverallResult(
  spf: string,
  dkim: string,
  dmarc: string
): 'pass' | 'fail' | 'neutral' {
  // If DMARC passes, overall is pass
  if (dmarc === 'pass') return 'pass';

  // If DMARC fails with reject, overall is fail
  if (dmarc === 'reject' || dmarc === 'fail') return 'fail';

  // If both SPF and DKIM pass, overall is pass
  if (spf === 'pass' && dkim === 'pass') return 'pass';

  // If either SPF or DKIM passes, neutral
  if (spf === 'pass' || dkim === 'pass') return 'neutral';

  // If SPF or DKIM fails hard, fail
  if (spf === 'fail' || dkim === 'fail') return 'fail';

  // Default to neutral
  return 'neutral';
}

/**
 * Generate Received-SPF header (RFC 7208)
 */
export function generateReceivedSpfHeader(
  spamResult: SpamCheckResult,
  config: AuthHeadersConfig & {
    fromDomain?: string;
    heloDomain?: string;
  }
): string {
  const result = spamResult.spf || 'none';
  const parts: string[] = [result];

  if (config.clientIp) {
    parts.push(`client-ip=${config.clientIp}`);
  }

  if (config.heloDomain) {
    parts.push(`helo=${config.heloDomain}`);
  }

  if (config.fromDomain) {
    parts.push(`envelope-from=<postmaster@${config.fromDomain}>`);
  }

  parts.push(`receiver=${config.authservId}`);

  return parts.join('; ');
}

/**
 * Build complete authentication headers object
 */
export function buildAuthHeaders(
  spamResult: SpamCheckResult,
  config: AuthHeadersConfig
): Record<string, string> {
  const authResults = generateAuthResultsHeader(spamResult, config);

  const headers: Record<string, string> = {
    'Authentication-Results': authResults.header,
  };

  // Add Received-SPF if we have client IP
  if (config.clientIp) {
    headers['Received-SPF'] = generateReceivedSpfHeader(spamResult, config);
  }

  return headers;
}

/**
 * Parse existing Authentication-Results header
 */
export function parseAuthResultsHeader(header: string): {
  authservId: string;
  spf?: string;
  dkim?: string;
  dmarc?: string;
} | null {
  if (!header) return null;

  const lines = header.split(/[;\n]/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const result: {
    authservId: string;
    spf?: string;
    dkim?: string;
    dmarc?: string;
  } = {
    authservId: lines[0],
  };

  for (const line of lines.slice(1)) {
    const spfMatch = line.match(/^spf=(\w+)/i);
    if (spfMatch) {
      result.spf = spfMatch[1].toLowerCase();
    }

    const dkimMatch = line.match(/^dkim=(\w+)/i);
    if (dkimMatch) {
      result.dkim = dkimMatch[1].toLowerCase();
    }

    const dmarcMatch = line.match(/^dmarc=(\w+)/i);
    if (dmarcMatch) {
      result.dmarc = dmarcMatch[1].toLowerCase();
    }
  }

  return result;
}

/**
 * Check if authentication results indicate trusted email
 */
export function isTrustedEmail(authResults: AuthenticationResults['summary']): boolean {
  return authResults.overall === 'pass';
}

/**
 * Get human-readable authentication status
 */
export function getAuthStatusLabel(authResults: AuthenticationResults['summary']): {
  label: string;
  color: 'success' | 'warning' | 'danger' | 'neutral';
  description: string;
} {
  if (authResults.overall === 'pass') {
    return {
      label: 'Authenticated',
      color: 'success',
      description: 'Email passed SPF, DKIM, and DMARC checks',
    };
  }

  if (authResults.overall === 'fail') {
    const failedChecks: string[] = [];
    if (authResults.spf === 'fail') failedChecks.push('SPF');
    if (authResults.dkim === 'fail') failedChecks.push('DKIM');
    if (['fail', 'reject'].includes(authResults.dmarc)) failedChecks.push('DMARC');

    return {
      label: 'Authentication Failed',
      color: 'danger',
      description: `Failed: ${failedChecks.join(', ')}`,
    };
  }

  return {
    label: 'Partial Authentication',
    color: 'warning',
    description: 'Some authentication checks did not pass',
  };
}
