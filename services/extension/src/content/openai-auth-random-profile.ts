const LOCAL_PART_SUFFIX_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const LOCAL_PART_MIN_LENGTH = 6;
const LOCAL_PART_MAX_LENGTH = 24;

const VIETNAMESE_FIRST_NAMES = [
  'an', 'bao', 'binh', 'chi', 'duy', 'giang', 'hao', 'khanh', 'linh', 'mai',
  'minh', 'nam', 'ngoc', 'phuong', 'quan', 'trang', 'tuan', 'vy',
];
const VIETNAMESE_LAST_NAMES = [
  'nguyen', 'tran', 'le', 'pham', 'hoang', 'phan', 'vu', 'dang', 'bui', 'do',
];
const NEUTRAL_FIRST_NAMES = [
  'alex', 'sam', 'jules', 'kai', 'morgan', 'taylor', 'riley', 'jordan', 'casey', 'devon',
];
const ROLE_WORDS = ['hello', 'contact', 'support', 'info', 'desk'];
const TEAM_WORDS = ['team', 'studio', 'lab', 'ops', 'inbox'];

const BLOCKED_LOCAL_PART_TOKENS = [
  'test', 'temp', 'fake', 'spam', 'throwaway', 'xxx', 'qwerty', 'admin',
];
const BLOCKED_BRAND_TOKENS = [
  'google', 'apple', 'microsoft', 'amazon', 'meta', 'tiktok', 'openai',
];

type LocalPartPattern =
  | 'first.last'
  | 'firstlast'
  | 'firstlastnn'
  | 'f.lastname'
  | 'role.first'
  | 'team.first'
  | 'first_last'
  | 'first.lastnameyy';

const RANDOM_PATTERN_WEIGHTS: Array<{ pattern: LocalPartPattern; weight: number }> = [
  { pattern: 'first.last', weight: 28 },
  { pattern: 'firstlast', weight: 16 },
  { pattern: 'firstlastnn', weight: 14 },
  { pattern: 'f.lastname', weight: 10 },
  { pattern: 'role.first', weight: 10 },
  { pattern: 'team.first', weight: 8 },
  { pattern: 'first_last', weight: 8 },
  { pattern: 'first.lastnameyy', weight: 6 },
];

function randomIndex(max: number): number {
  if (max <= 0) return 0;
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint32Array(1);
    globalThis.crypto.getRandomValues(bytes);
    return bytes[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function pickRandom<T>(items: T[]): T {
  return items[randomIndex(items.length)];
}

function pickWeightedPattern(weights: Array<{ pattern: LocalPartPattern; weight: number }>): LocalPartPattern {
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = randomIndex(total || 1);
  for (const entry of weights) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.pattern;
  }
  return weights[0].pattern;
}

function normalizeLocalPartCandidate(raw: string): string {
  const deAccented = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return deAccented
    .replace(/[^a-z0-9._]/g, '')
    .replace(/[._]{2,}/g, '.')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, LOCAL_PART_MAX_LENGTH);
}

function hasLowVowelRatio(value: string): boolean {
  const letters = value.replace(/[^a-z]/g, '');
  if (letters.length < 7) return false;
  const vowels = letters.match(/[aeiou]/g)?.length ?? 0;
  return vowels / letters.length < 0.18;
}

function isLocalPartValid(value: string): boolean {
  if (!value) return false;
  if (value.length < LOCAL_PART_MIN_LENGTH || value.length > LOCAL_PART_MAX_LENGTH) return false;
  if (/[._]$|^[._]/.test(value)) return false;
  if (/[._]{2,}/.test(value)) return false;
  if (/(.)\1{2,}/.test(value)) return false;
  if (/\d{3,}/.test(value)) return false;

  const digitCount = value.match(/\d/g)?.length ?? 0;
  if (digitCount > 4) return false;
  if (digitCount / value.length > 0.3) return false;
  if ((value.match(/[._]/g)?.length ?? 0) > 2) return false;
  if (hasLowVowelRatio(value)) return false;

  if (BLOCKED_LOCAL_PART_TOKENS.some((token) => value.includes(token))) return false;
  if (BLOCKED_BRAND_TOKENS.some((token) => value.includes(token))) return false;
  return true;
}

function randomDigits(count = 2): string {
  return Array.from({ length: count }, () => LOCAL_PART_SUFFIX_CHARS[randomIndex(10) + 26]).join('');
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function generateRandomLocalPart(): string {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const pattern = pickWeightedPattern(RANDOM_PATTERN_WEIGHTS);
    const first = pickRandom([...VIETNAMESE_FIRST_NAMES, ...NEUTRAL_FIRST_NAMES]);
    const last = pickRandom(VIETNAMESE_LAST_NAMES);
    const role = pickRandom(ROLE_WORDS);
    const team = pickRandom(TEAM_WORDS);
    const twoDigits = randomDigits(2);

    let candidate = '';
    switch (pattern) {
      case 'first.last':
        candidate = `${first}.${last}`;
        break;
      case 'firstlast':
        candidate = `${first}${last}`;
        break;
      case 'firstlastnn':
        candidate = `${first}${last}${twoDigits}`;
        break;
      case 'f.lastname':
        candidate = `${first.charAt(0)}.${last}`;
        break;
      case 'role.first':
        candidate = `${role}.${first}`;
        break;
      case 'team.first':
        candidate = `${team}.${first}`;
        break;
      case 'first_last':
        candidate = `${first}_${last}`;
        break;
      case 'first.lastnameyy':
        candidate = `${first}.${last}${twoDigits}`;
        break;
    }

    const normalized = normalizeLocalPartCandidate(candidate);
    if (isLocalPartValid(normalized)) return normalized;
  }

  return normalizeLocalPartCandidate(`contact.${pickRandom(VIETNAMESE_FIRST_NAMES)}${randomDigits(2)}`);
}

export function generateRandomProfileName(): string {
  const first = capitalize(pickRandom([...VIETNAMESE_FIRST_NAMES, ...NEUTRAL_FIRST_NAMES]));
  const last = capitalize(pickRandom(VIETNAMESE_LAST_NAMES));
  return `${first} ${last}`;
}
