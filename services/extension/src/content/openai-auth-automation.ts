import browser from 'webextension-polyfill';
import { safeSendMessage } from '../shared/utils';
import {
  generateRandomAge,
  generateRandomFullName,
  generateStrongPassword,
} from './openai-auth-automation-utils';

const STATE_KEY = 'openai_auth_automation_state';
const HOST = 'auth.openai.com';

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

async function handleCreateAccount(): Promise<void> {
  const response = await safeSendMessage<{ success: boolean; inbox?: any; error?: string }>({ type: 'AUTOMATION_CREATE_INBOX' });
  if (!response?.success || !response.inbox?.email) return;

  const emailInput = await waitForInput([
    'input[type="email"]',
    'input[name="email"]',
    'input[name*="email" i]',
    'input[autocomplete="email"]',
    'input[placeholder*="email" i]',
    'input[aria-label*="email" i]',
    'input[name="identifier"]',
  ]);
  if (!emailInput) return;

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
    'input[autocomplete="one-time-code"], input[name*="code" i], input[id*="code" i], input[inputmode="numeric"]',
  )).filter((el) => isVisible(el) && !el.disabled && !el.readOnly);

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
