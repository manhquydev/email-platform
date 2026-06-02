export interface FireworksFlow3CredentialRecord {
  id: string;
  email: string;
  password: string;
  apiKey?: string;
  createdAt: number;
  verifiedAt?: number;
  apiKeyCreatedAt?: number;
}

export interface FireworksFlow3CredentialSummary {
  total: number;
  withApiKey: number;
  withoutApiKey: number;
}

function toDateTime(value?: number): string {
  if (!value || !Number.isFinite(value)) return '-';
  return new Date(value).toISOString();
}

export function summarizeFireworksFlow3Credentials(
  records: FireworksFlow3CredentialRecord[] | undefined,
): FireworksFlow3CredentialSummary {
  const list = Array.isArray(records) ? records : [];
  let withApiKey = 0;
  let withoutApiKey = 0;

  for (const item of list) {
    if (String(item.apiKey || '').trim()) {
      withApiKey += 1;
    } else {
      withoutApiKey += 1;
    }
  }

  return {
    total: list.length,
    withApiKey,
    withoutApiKey,
  };
}

export function formatFireworksFlow3CredentialsAsTxt(
  records: FireworksFlow3CredentialRecord[] | undefined,
  generatedAt = Date.now(),
): string {
  const list = [...(records || [])].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const summary = summarizeFireworksFlow3Credentials(list);
  const lines: string[] = [];

  lines.push('Ephemera Fireworks Flow 3 Credentials');
  lines.push(`GeneratedAt: ${toDateTime(generatedAt)}`);
  lines.push(`Total: ${summary.total}`);
  lines.push(`WithApiKey: ${summary.withApiKey}`);
  lines.push(`WithoutApiKey: ${summary.withoutApiKey}`);
  lines.push('');
  lines.push('Index | Email | Password | ApiKey | CreatedAt | VerifiedAt | ApiKeyCreatedAt');
  lines.push('----- | ----- | -------- | ------ | --------- | ---------- | ---------------');

  if (list.length === 0) {
    lines.push('0 | - | - | - | - | - | -');
    return lines.join('\n');
  }

  list.forEach((item, index) => {
    lines.push([
      String(index + 1),
      item.email || '-',
      item.password || '-',
      item.apiKey || '-',
      toDateTime(item.createdAt),
      toDateTime(item.verifiedAt),
      toDateTime(item.apiKeyCreatedAt),
    ].join(' | '));
  });

  return lines.join('\n');
}
