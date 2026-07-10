export interface OpenAiCredentialRecord {
  id?: string;
  email: string;
  password: string;
  status?: 'ready' | 'used';
  createdAt: number;
  flow1CompletedAt?: number;
  flow2UsedAt?: number;
  inboxId?: string;
  inboxToken?: string;
}

export interface OpenAiCredentialSummary {
  total: number;
  ready: number;
  used: number;
}

function toDateTime(value?: number): string {
  if (!value || !Number.isFinite(value)) return '-';
  return new Date(value).toISOString();
}

function parseDateTime(value?: string): number | undefined {
  if (!value || value === '-') return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

function isUsed(record: OpenAiCredentialRecord): boolean {
  return record.status === 'used' || Boolean(record.flow2UsedAt);
}

export function summarizeOpenAiCredentials(
  records: OpenAiCredentialRecord[] | undefined,
): OpenAiCredentialSummary {
  const list = Array.isArray(records) ? records : [];
  let used = 0;

  for (const item of list) {
    if (isUsed(item)) used += 1;
  }

  return {
    total: list.length,
    ready: list.length - used,
    used,
  };
}

export function formatOpenAiCredentialsAsTxt(
  records: OpenAiCredentialRecord[] | undefined,
  generatedAt = Date.now(),
): string {
  const list = [...(records || [])].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const summary = summarizeOpenAiCredentials(list);
  const lines: string[] = [];

  lines.push('Ephemera OpenAI Auth Flow Credentials');
  lines.push(`GeneratedAt: ${toDateTime(generatedAt)}`);
  lines.push(`Total: ${summary.total}`);
  lines.push(`Ready: ${summary.ready}`);
  lines.push(`Used: ${summary.used}`);
  lines.push('');
  lines.push('Index | Email | Password | Status | CreatedAt | Flow2UsedAt');
  lines.push('----- | ----- | -------- | ------ | --------- | -----------');

  if (list.length === 0) {
    lines.push('0 | - | - | - | - | -');
    return lines.join('\n');
  }

  list.forEach((item, index) => {
    lines.push([
      String(index + 1),
      item.email || '-',
      item.password || '-',
      isUsed(item) ? 'used' : 'ready',
      toDateTime(item.createdAt),
      toDateTime(item.flow2UsedAt),
    ].join(' | '));
  });

  return lines.join('\n');
}

export function parseOpenAiCredentialsFromTxt(text: string): OpenAiCredentialRecord[] {
  const records: OpenAiCredentialRecord[] = [];
  if (!text) return records;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || !line.includes('|')) continue;

    const cols = line.split('|').map((c) => c.trim());
    if (cols.length < 3) continue;
    // Skip the header row and the separator row.
    if (!/^\d+$/.test(cols[0])) continue;

    const email = cols[1] && cols[1] !== '-' ? cols[1] : '';
    const password = cols[2] && cols[2] !== '-' ? cols[2] : '';
    if (!email || !password) continue;

    const status: 'ready' | 'used' = (cols[3] || '').toLowerCase() === 'used' ? 'used' : 'ready';
    const createdAt = parseDateTime(cols[4]);
    const flow2UsedAt = parseDateTime(cols[5]);

    records.push({
      email,
      password,
      status,
      createdAt: createdAt ?? Date.now(),
      ...(flow2UsedAt ? { flow2UsedAt } : {}),
    });
  }

  return records;
}
