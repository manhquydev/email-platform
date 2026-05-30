const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}:,.?';

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Jamie', 'Avery',
  'Quinn', 'Skyler', 'Rowan', 'Parker', 'Hayden', 'Drew', 'Kai', 'Robin',
];

const LAST_NAMES = [
  'Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vu', 'Do', 'Bui',
  'Smith', 'Johnson', 'Davis', 'Miller', 'Anderson', 'Brown', 'Wilson', 'Moore',
];

function randomIndex(max: number): number {
  if (max <= 0) return 0;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % max;
}

function pick(str: string): string {
  return str[randomIndex(str.length)] ?? '';
}

function shuffle(input: string[]): string[] {
  const output = [...input];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

export function generateStrongPassword(min = 12, max = 24): string {
  const safeMin = Math.max(12, min);
  const safeMax = Math.max(safeMin, max);
  const length = safeMin + randomIndex(safeMax - safeMin + 1);
  const allChars = `${UPPER}${LOWER}${DIGITS}${SYMBOLS}`;

  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  const rest: string[] = [];
  for (let i = required.length; i < length; i += 1) {
    rest.push(pick(allChars));
  }

  return shuffle([...required, ...rest]).join('');
}

export function generateRandomFullName(): string {
  const first = FIRST_NAMES[randomIndex(FIRST_NAMES.length)];
  const last = LAST_NAMES[randomIndex(LAST_NAMES.length)];
  return `${first} ${last}`.trim();
}

export function generateRandomAge(min = 18, max = 60): string {
  const safeMin = Math.max(18, min);
  const safeMax = Math.max(safeMin, max);
  return String(safeMin + randomIndex(safeMax - safeMin + 1));
}

export function extractOtpFromText(text: string): string | null {
  const normalized = text.replace(/<[^>]*>/g, ' ');
  const patterns = [
    /(?:otp|code|verification|mã)\D{0,12}(\d{4,8})/i,
    /\b(\d{6})\b/,
    /\b(\d{4,8})\b/,
  ];

  for (const regex of patterns) {
    const match = normalized.match(regex);
    if (match?.[1]) return match[1];
  }
  return null;
}
