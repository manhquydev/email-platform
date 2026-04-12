import browser from 'webextension-polyfill';
import { safeSendMessage } from '../shared/utils';
import {
  generateRandomAge,
  generateRandomFullName,
  generateStrongPassword,
} from './openai-auth-automation-utils';

const STATE_KEY = 'openai_auth_automation_state';
const HOST = 'auth.openai.com';
const CREATE_INBOX_RETRY_DELAYS_MS = [0, 1200, 2500];
const EMAIL_VERIFICATION_PATH = '/email-verification';

interface AutomationState {
  latestEmail?: string;
  latestInboxId?: string;
  latestInboxToken?: string;
  emailCreatedAt?: number;
  password?: string;
  otpRequestedAt?: number;
  verificationEnteredAt?: number;
  lastOtpMessageId?: string;
  lastOtpReceivedAt?: number;
  lastOtpUsedAt?: number;
  usedOtpMessageIds?: string[];
  createInboxRateLimitedUntil?: number;
  lastCreateInboxError?: string;
  updatedAt?: number;
}

function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function isEmailVerificationPath(pathname: string): boolean {
  return pathname === EMAIL_VERIFICATION_PATH;
}

function findFirstInput(selectors: string[]): HTMLInputElement | null {
  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll<HTMLInputElement>(selector));
    const visible = elements.find((el) => !el.disabled && !el.readOnly && isVisible(el));
    if (visible) return visible;
  }
  return null;
}

async function waitForInput(selectors: string[], timeoutMs = 12000): Promise<HTMLInputElement | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const input = findFirstInput(selectors);
    if (input) return input;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

async function getState(): Promise<AutomationState> {
  const result = await browser.storage.local.get(STATE_KEY);
  return (result[STATE_KEY] as AutomationState) || {};
}

async function setState(patch: Partial<AutomationState>): Promise<AutomationState> {
  const current = await getState();
  const next = { ...current, ...patch, updatedAt: Date.now() };
  await browser.storage.local.set({ [STATE_KEY]: next });
  return next;
}

function appendRecentIds(ids: string[] | undefined, messageId: string | undefined, limit = 10): string[] {
  if (!messageId) return ids ?? [];
  const next = (ids ?? []).filter((id) => id !== messageId);
  next.push(messageId);
  return next.slice(-limit);
}

function isLikelyOtpInput(input: HTMLInputElement): boolean {
  if (input.type === 'number') return false;

  const hintText = [
    input.name,
    input.id,
    input.placeholder,
    input.getAttribute('aria-label') || '',
    input.getAttribute('autocomplete') || '',
  ].join(' ').toLowerCase();

  if (/(age|tuổi|tuoi|birth|dob|year)/i.test(hintText)) return false;

  if (input.getAttribute('autocomplete') === 'one-time-code') return true;
  if (/(otp|code|verification|mã|ma)/i.test(hintText)) return true;

  const maxLength = Number(input.maxLength);
  if (input.inputMode === 'numeric' && Number.isFinite(maxLength) && maxLength > 0 && maxLength <= 8) {
    return true;
  }

  return false;
}

function isRateLimitedError(error: string | undefined): boolean {
  if (!error) return false;
  return /rate.?limit|429|retry in/i.test(error);
}

function parseRetryAfterMs(error: string | undefined): number | undefined {
  if (!error) return undefined;
  const minutesMatch = error.match(/retry in\s+(\d+)\s+minutes?/i);
  if (minutesMatch?.[1]) {
    const minutes = Number(minutesMatch[1]);
    if (Number.isFinite(minutes) && minutes > 0) return minutes * 60_000;
  }
  const secondsMatch = error.match(/retry in\s+(\d+)\s+seconds?/i);
  if (secondsMatch?.[1]) {
    const seconds = Number(secondsMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1_000;
  }
  return undefined;
}

async function createInboxWithRetry(): Promise<{ inbox?: any; error?: string; retryAfterMs?: number } | null> {
  let lastError = '';
  for (const delayMs of CREATE_INBOX_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const response = await safeSendMessage<{ success: boolean; inbox?: any; error?: string }>({
      type: 'AUTOMATION_CREATE_INBOX',
    });

    if (response?.success && response.inbox?.email) {
      return { inbox: response.inbox };
    }

    lastError = response?.error || 'Unknown inbox creation error';
    if (isRateLimitedError(lastError)) {
      return { error: lastError, retryAfterMs: parseRetryAfterMs(lastError) };
    }
    break;
  }

  return { error: lastError };
}

async function handleCreateAccount(): Promise<void> {
  const emailInput = await waitForInput([
    'input[type="email"]',
    'input[name="email"]',
    'input[name*="email" i]',
    'input[autocomplete="email"]',
    'input[placeholder*="email" i]',
    'input[aria-label*="email" i]',
    'input[name="identifier"]',
  ], 20000);
  if (!emailInput) return;
  if (emailInput.value.trim()) return;

  const state = await getState();
  const now = Date.now();
  if ((state.createInboxRateLimitedUntil ?? 0) > now) {
    if (state.latestEmail) {
      setInputValue(emailInput, state.latestEmail);
    }
    return;
  }

  const response = await createInboxWithRetry();
  if (!response?.inbox?.email) {
    const retryAfterMs = response?.retryAfterMs;
    await setState({
      lastCreateInboxError: response?.error,
      createInboxRateLimitedUntil: retryAfterMs ? now + retryAfterMs : undefined,
    });
    // Fallback to last known email so flow remains interactive even when API is rate-limited.
    if (state.latestEmail) {
      setInputValue(emailInput, state.latestEmail);
    }
    console.warn('[Ephemera][OpenAI Automation] create inbox failed:', response?.error || 'unknown');
    return;
  }

  setInputValue(emailInput, response.inbox.email);
  await setState({
    latestEmail: response.inbox.email,
    latestInboxId: response.inbox.inboxId,
    latestInboxToken: response.inbox.inboxToken,
    emailCreatedAt: response.inbox.createdAt,
    otpRequestedAt: undefined,
    verificationEnteredAt: undefined,
    lastOtpMessageId: undefined,
    lastOtpReceivedAt: undefined,
    lastOtpUsedAt: undefined,
    usedOtpMessageIds: [],
    createInboxRateLimitedUntil: undefined,
    lastCreateInboxError: undefined,
  });
}

async function handlePassword(): Promise<void> {
  const passwordInput = await waitForInput([
    'input[type="password"]',
    'input[name*="password" i]',
    'input[autocomplete="new-password"]',
    'input[autocomplete="current-password"]',
  ]);
  if (!passwordInput) return;

  const password = generateStrongPassword(12, 24);
  setInputValue(passwordInput, password);
  await setState({
    password,
    otpRequestedAt: Date.now(),
    verificationEnteredAt: undefined,
  });
}

function fillOtpFields(code: string): boolean {
  const candidates = Array.from(document.querySelectorAll<HTMLInputElement>(
    'input[autocomplete="one-time-code"], input[name*="code" i], input[id*="code" i], input[aria-label*="code" i], input[inputmode="numeric"][maxlength]',
  )).filter((el) => isVisible(el) && !el.disabled && !el.readOnly && isLikelyOtpInput(el));

  if (candidates.length === 0) return false;
  const singleCharInputs = candidates.filter((el) => Number(el.maxLength) === 1);
  if (singleCharInputs.length >= 4) {
    code.slice(0, singleCharInputs.length).split('').forEach((char, index) => {
      setInputValue(singleCharInputs[index], char);
    });
    return true;
  }

  setInputValue(candidates[0], code);
  return true;
}

async function handleEmailVerification(): Promise<void> {
  if (!isEmailVerificationPath(window.location.pathname)) return;

  const state = await getState();
  if (!state.latestInboxToken) return;

  const requestStartedAt = Date.now();
  const requestBaseline = state.otpRequestedAt ?? requestStartedAt;
  const sinceTimestamp = Math.max(
    state.emailCreatedAt ?? 0,
    requestBaseline - 2000,
    (state.lastOtpReceivedAt ?? 0) + 1,
  );

  const response = await safeSendMessage<{
    success: boolean;
    otp?: string;
    messageId?: string;
    receivedAt?: number;
  }>({
    type: 'AUTOMATION_GET_LATEST_OTP',
    inboxToken: state.latestInboxToken,
    sinceTimestamp,
    timeoutMs: 90000,
    pollIntervalMs: 2500,
    excludeMessageIds: appendRecentIds(state.usedOtpMessageIds, state.lastOtpMessageId),
  });

  if (!isEmailVerificationPath(window.location.pathname)) {
    return;
  }

  if (!response?.success || !response.otp) return;
  const filled = fillOtpFields(response.otp);
  if (!filled) return;

  await setState({
    otpRequestedAt: undefined,
    verificationEnteredAt: Date.now(),
    lastOtpMessageId: response.messageId,
    lastOtpReceivedAt: response.receivedAt,
    lastOtpUsedAt: Date.now(),
    usedOtpMessageIds: appendRecentIds(state.usedOtpMessageIds, response.messageId),
  });
}

async function handleAboutYou(): Promise<void> {
  const nameInput = await waitForInput([
    'input[name*="name" i]',
    'input[autocomplete="name"]',
    'input[placeholder*="name" i]',
    'input[aria-label*="name" i]',
    'input[aria-label*="họ" i]',
  ], 8000);

  if (nameInput && !nameInput.value) {
    setInputValue(nameInput, generateRandomFullName());
  }

  const ageInput = await waitForInput([
    'input[name*="age" i]',
    'input[id*="age" i]',
    'input[placeholder*="age" i]',
    'input[aria-label*="age" i]',
    'input[aria-label*="tuổi" i]',
    'input[type="number"]',
  ], 8000);
  if (ageInput && !ageInput.value) {
    setInputValue(ageInput, generateRandomAge(18, 60));
  }
}

async function handleLogin(): Promise<void> {
  const state = await getState();
  if (!state.latestEmail) return;

  const input = await waitForInput([
    'input[type="email"]',
    'input[name="email"]',
    'input[name*="email" i]',
    'input[autocomplete="email"]',
    'input[name="identifier"]',
  ]);
  if (!input) return;

  const currentValue = input.value.trim().toLowerCase();
  const latestEmail = state.latestEmail.trim().toLowerCase();
  if (currentValue && currentValue !== latestEmail) return;

  if (!currentValue) {
    setInputValue(input, state.latestEmail);
  }

  await setState({
    otpRequestedAt: Date.now(),
    verificationEnteredAt: undefined,
  });
}

export function initOpenAiAuthAutomation(): void {
  if (window.location.hostname !== HOST) return;

  const run = async () => {
    const path = window.location.pathname;
    if (path === '/create-account') return handleCreateAccount();
    if (path === '/create-account/password') return handlePassword();
    if (path === '/email-verification') return handleEmailVerification();
    if (path === '/about-you') return handleAboutYou();
    if (path === '/log-in') return handleLogin();
  };

  let previousPath = '';
  setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath === previousPath) return;
    previousPath = currentPath;
    run().catch((error) => console.warn('[Ephemera][OpenAI Automation] failed:', error));
  }, 400);

  run().catch((error) => console.warn('[Ephemera][OpenAI Automation] init failed:', error));
}
