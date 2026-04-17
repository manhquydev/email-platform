import browser from 'webextension-polyfill';
import { safeSendMessage } from '../shared/utils';
import type { FireworksFlow3CredentialRecord } from '../shared/fireworks-flow3-automation-export';
import { generateRandomFullName, generateStrongPassword } from './openai-auth-automation-utils';
import {
  clickElement,
  findButtonByLabels,
  findFirstInput,
  isVisible,
  normalizeText,
  pageContainsText,
  randomPick,
  setInputValue,
  sleep,
  waitForButtonByLabels,
  waitForInput,
} from './fireworks-flow3-dom-helpers';

const STATE_KEY = 'fireworks_flow3_automation_state';
const FIREWORKS_HOSTS = new Set(['app.fireworks.ai', 'fireworks.ai', 'www.fireworks.ai']);
const SIGNUP_URL = 'https://app.fireworks.ai/signup';
const LOGOUT_URL = 'https://app.fireworks.ai/logout';
const FLOW3_MAX_CREDENTIALS = 500;
const ACTION_COOLDOWN_MS = 1000;
const FLOW3_TEST_QUEUE_KEY = 'ephemera:fw3:test:credential-queue';
const FLOW3_TEST_AUTO_ENABLE_KEY = 'ephemera:fw3:test:auto-enable';

interface FireworksFlow3Credential extends FireworksFlow3CredentialRecord {
  inboxId?: string;
  inboxToken?: string;
  status?: 'pending' | 'completed';
  lastConfirmMessageId?: string;
  firstName?: string;
  lastName?: string;
  testConfirmUrl?: string;
}

interface FireworksFlow3State {
  flow3LoopEnabled?: boolean;
  credentials?: FireworksFlow3Credential[];
  activeCredentialId?: string;
  lastAutoActionKey?: string;
  lastAutoActionAt?: number;
  updatedAt?: number;
}

interface FireworksFlow3TestMockCredential {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  confirmUrl?: string;
  createdAt?: number;
}

function isSupportedHost(hostname: string): boolean {
  return FIREWORKS_HOSTS.has(hostname);
}

function getState(): Promise<FireworksFlow3State> {
  return browser.storage.local.get(STATE_KEY).then((result) => (result[STATE_KEY] as FireworksFlow3State) || {});
}

async function setState(patch: Partial<FireworksFlow3State>): Promise<FireworksFlow3State> {
  const current = await getState();
  const next = { ...current, ...patch, updatedAt: Date.now() };
  await browser.storage.local.set({ [STATE_KEY]: next });
  return next;
}

function trimCredentials(records: FireworksFlow3Credential[] | undefined): FireworksFlow3Credential[] {
  return [...(records || [])]
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .slice(-FLOW3_MAX_CREDENTIALS);
}

function getCredentialById(state: FireworksFlow3State, id: string | undefined): FireworksFlow3Credential | null {
  if (!id) return null;
  return state.credentials?.find((item) => item.id === id) || null;
}

function patchCredential(
  records: FireworksFlow3Credential[] | undefined,
  id: string,
  patch: Partial<FireworksFlow3Credential>,
): FireworksFlow3Credential[] {
  return (records || []).map((item) => (item.id === id ? { ...item, ...patch } : item));
}

async function clickWithCooldown(
  actionKey: string,
  labels: string[],
  timeoutMs = 10000,
  cooldownMs = ACTION_COOLDOWN_MS,
): Promise<boolean> {
  const state = await getState();
  const now = Date.now();
  if (state.lastAutoActionKey === actionKey && now - (state.lastAutoActionAt || 0) < cooldownMs) {
    return false;
  }

  const button = await waitForButtonByLabels(labels, timeoutMs);
  if (!button) return false;

  clickElement(button);
  await setState({ lastAutoActionKey: actionKey, lastAutoActionAt: now });
  return true;
}

function splitNameParts(fullName: string): { firstName: string; lastName: string } {
  const cleaned = String(fullName || '').trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || 'Alex', lastName: 'Nguyen' };
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

function consumeTestMockCredential(): FireworksFlow3TestMockCredential | null {
  try {
    const raw = localStorage.getItem(FLOW3_TEST_QUEUE_KEY);
    if (!raw) return null;
    const queue = JSON.parse(raw) as FireworksFlow3TestMockCredential[];
    if (!Array.isArray(queue) || queue.length === 0) return null;
    const [first, ...rest] = queue;
    localStorage.setItem(FLOW3_TEST_QUEUE_KEY, JSON.stringify(rest));
    if (!first?.email) return null;
    return first;
  } catch {
    return null;
  }
}

function isFlow3TestAutoEnable(): boolean {
  try {
    return localStorage.getItem(FLOW3_TEST_AUTO_ENABLE_KEY) === '1';
  } catch {
    return false;
  }
}

function extractVisibleEmailsFromPage(): string[] {
  const source = document.body?.innerText || '';
  const matches = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return [...new Set(matches.map((item) => normalizeText(item)).filter(Boolean))];
}

function isVerifyPageEmailMatched(expectedEmail: string): boolean {
  const visibleEmails = extractVisibleEmailsFromPage();
  if (visibleEmails.length === 0) return true;
  const expected = normalizeText(expectedEmail);
  return visibleEmails.includes(expected);
}

function findTermsCheckbox(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('button[role="checkbox"], [role="checkbox"]'))
    .filter((item) => isVisible(item));
  if (candidates.length === 0) return null;

  const preferred = candidates.find((item) => {
    const contextText = normalizeText(item.closest('label,li,div,fieldset,section,form')?.textContent || item.textContent || '');
    return (
      contextText.includes('term')
      || contextText.includes('agree')
      || contextText.includes('policy')
      || contextText.includes('condition')
    );
  });

  return preferred || candidates[0] || null;
}

function findVisibleMenuItemByLabel(label: string): HTMLElement | null {
  const expected = normalizeText(label);
  return Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"], [data-radix-collection-item]'))
    .find((item) => isVisible(item) && normalizeText(item.textContent || item.getAttribute('aria-label') || '').includes(expected))
    || null;
}

async function waitForVisibleMenuItem(label: string, timeoutMs = 3000): Promise<HTMLElement | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const item = findVisibleMenuItemByLabel(label);
    if (item) return item;
    await sleep(120);
  }
  return null;
}

async function ensureActiveCredential(state: FireworksFlow3State): Promise<FireworksFlow3Credential | null> {
  const existing = getCredentialById(state, state.activeCredentialId);
  if (existing) return existing;

  const resumable = [...(state.credentials || [])]
    .filter((item) => item.status !== 'completed')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

  if (resumable) {
    await setState({ activeCredentialId: resumable.id });
    return resumable;
  }

  const testMock = consumeTestMockCredential();
  if (testMock?.email) {
    const randomName = splitNameParts(generateRandomFullName());
    const firstName = testMock.firstName?.trim() || randomName.firstName;
    const lastName = testMock.lastName?.trim() || randomName.lastName;
    const record: FireworksFlow3Credential = {
      id: `fw3-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: testMock.email,
      password: String(testMock.password || generateStrongPassword(12, 20)),
      inboxId: 'flow3-test-inbox',
      inboxToken: 'flow3-test-token',
      createdAt: Number(testMock.createdAt || Date.now()),
      status: 'pending',
      firstName,
      lastName,
      testConfirmUrl: testMock.confirmUrl || undefined,
    };

    await setState({
      credentials: trimCredentials([...(state.credentials || []), record]),
      activeCredentialId: record.id,
    });
    return record;
  }

  const inboxResult = await safeSendMessage<{
    success: boolean;
    inbox?: { inboxId: string; inboxToken?: string; email: string; createdAt: number };
    error?: string;
  }>({ type: 'AUTOMATION_CREATE_INBOX' });

  if (!inboxResult?.success || !inboxResult.inbox?.email) return null;
  const generatedName = splitNameParts(generateRandomFullName());
  const record: FireworksFlow3Credential = {
    id: `fw3-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email: inboxResult.inbox.email,
    password: generateStrongPassword(12, 20),
    inboxId: inboxResult.inbox.inboxId,
    inboxToken: inboxResult.inbox.inboxToken,
    createdAt: inboxResult.inbox.createdAt || Date.now(),
    status: 'pending',
    firstName: generatedName.firstName,
    lastName: generatedName.lastName,
  };

  await setState({
    credentials: trimCredentials([...(state.credentials || []), record]),
    activeCredentialId: record.id,
  });
  return record;
}

async function handleSignupEmail(pathname: string, state: FireworksFlow3State): Promise<boolean> {
  if (pathname !== '/signup') return false;
  if (findFirstInput(['input[type="password"]'])) return false;
  const emailInput = await waitForInput(['input[type="email"]', 'input[name="email"]', 'input[placeholder*="email" i]'], 5000);
  if (!emailInput) return false;

  const credential = await ensureActiveCredential(state);
  if (!credential) return false;

  if (normalizeText(emailInput.value) !== normalizeText(credential.email)) {
    setInputValue(emailInput, credential.email, { blur: true });
    await sleep(100);
  }

  await clickWithCooldown('fw3-signup-next', ['Next']);
  return true;
}

async function handleSignupPassword(pathname: string, state: FireworksFlow3State): Promise<boolean> {
  if (!pathname.startsWith('/signup')) return false;
  const credential = getCredentialById(state, state.activeCredentialId);
  if (!credential) return false;

  const passwordInput = findFirstInput(['input[name="password"]', 'input[placeholder*="password" i]', 'input[type="password"]']);
  if (!passwordInput) return false;

  const confirmInput = (Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"]'))
    .find((item) => item !== passwordInput && isVisible(item)))
    || findFirstInput(['input[name*="confirm" i]', 'input[placeholder*="confirm" i]']);
  if (!confirmInput) return false;

  setInputValue(passwordInput, credential.password);
  setInputValue(confirmInput, credential.password, { blur: true });
  await sleep(120);
  await clickWithCooldown('fw3-create-account', ['Create Account']);
  return true;
}

async function handleSignupVerify(pathname: string, state: FireworksFlow3State): Promise<boolean> {
  if (!pathname.startsWith('/signup/verify')) return false;
  const credential = getCredentialById(state, state.activeCredentialId);
  if (!credential) return false;
  if (!isVerifyPageEmailMatched(credential.email)) return false;

  if (credential.testConfirmUrl) {
    await setState({
      credentials: patchCredential(state.credentials, credential.id, {
        verifiedAt: Date.now(),
      }),
    });
    window.location.href = credential.testConfirmUrl;
    return true;
  }

  const response = await safeSendMessage<{
    success: boolean;
    url?: string;
    messageId?: string;
    receivedAt?: number;
  }>({
    type: 'AUTOMATION_GET_LATEST_CONFIRMATION_LINK',
    inboxToken: credential.inboxToken,
    inboxId: credential.inboxId,
    sinceTimestamp: credential.createdAt,
    timeoutMs: 90000,
    pollIntervalMs: 2500,
    excludeMessageIds: credential.lastConfirmMessageId ? [credential.lastConfirmMessageId] : [],
    urlPattern: 'https://app\\.fireworks\\.ai/signup/confirm\\?[^\\s\"\'<>]+',
  });

  if (!response?.success || !response.url) return false;
  await setState({
    credentials: patchCredential(state.credentials, credential.id, {
      lastConfirmMessageId: response.messageId,
      verifiedAt: response.receivedAt || Date.now(),
    }),
  });
  window.location.href = response.url;
  return true;
}

async function handleAccountConfirmed(state: FireworksFlow3State): Promise<boolean> {
  if (!pageContainsText('Account Confirmed')) return false;
  const credential = getCredentialById(state, state.activeCredentialId);
  if (credential) {
    await setState({
      credentials: patchCredential(state.credentials, credential.id, { verifiedAt: Date.now() }),
    });
  }
  await clickWithCooldown('fw3-confirmed-signin', ['Sign In']);
  return true;
}

async function handleLoginEntry(pathname: string): Promise<boolean> {
  if (!pathname.startsWith('/login') || pathname.startsWith('/login/email')) return false;
  const button = findButtonByLabels(['Email Login']);
  if (!button) return false;
  clickElement(button);
  return true;
}

async function handleLoginEmail(pathname: string, state: FireworksFlow3State): Promise<boolean> {
  if (!pathname.startsWith('/login/email')) return false;
  const credential = getCredentialById(state, state.activeCredentialId);
  if (!credential) return false;

  const emailInput = await waitForInput(['input[type="email"]', 'input[name="email"]', 'input[placeholder*="email" i]'], 5000);
  const passwordInput = await waitForInput(['input[type="password"]', 'input[name="password"]', 'input[placeholder*="password" i]'], 5000);
  if (!emailInput || !passwordInput) return false;

  setInputValue(emailInput, credential.email);
  setInputValue(passwordInput, credential.password, { blur: true });
  await sleep(120);
  await clickWithCooldown('fw3-login-next', ['Next']);
  return true;
}

type SurveyQuestionStatus = 'picked' | 'already-selected' | 'missing';

function clickRandomSurveyOption(questionHint: string): SurveyQuestionStatus {
  const marker = Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3,p,span,legend,div'))
    .find((node) => normalizeText(node.textContent).includes(normalizeText(questionHint)));
  if (!marker) return 'missing';

  const container = marker.closest('section,fieldset,form,div') || marker.parentElement || document.body;
  const options = Array.from(container.querySelectorAll<HTMLElement>('button[role="checkbox"], [role="checkbox"]'))
    .filter((el) => isVisible(el))
    .filter((el) => !normalizeText(el.closest('label,li,div')?.textContent || el.textContent).includes('other'));

  if (options.length === 0) return 'missing';

  const selected = options.filter((el) => el.getAttribute('aria-checked') === 'true');
  if (selected.length > 0) return 'already-selected';

  const unselected = options.filter((el) => el.getAttribute('aria-checked') !== 'true');
  if (unselected.length === 0) return 'missing';

  clickElement(randomPick(unselected));
  return 'picked';
}

async function handleOnboarding(pathname: string, state: FireworksFlow3State): Promise<boolean> {
  if (!pathname.startsWith('/onboarding')) return false;
  const credential = getCredentialById(state, state.activeCredentialId);
  if (!credential) return false;

  const firstNameInput = findFirstInput(['input[name*="first" i]', 'input[placeholder*="first name" i]']);
  const lastNameInput = findFirstInput(['input[name*="last" i]', 'input[placeholder*="last name" i]']);
  if (firstNameInput && lastNameInput) {
    setInputValue(firstNameInput, credential.firstName || 'Alex');
    setInputValue(lastNameInput, credential.lastName || 'Nguyen');
    const termsButton = findTermsCheckbox();
    if (termsButton && termsButton.getAttribute('aria-checked') !== 'true') {
      clickElement(termsButton);
      await sleep(80);
    }
    await clickWithCooldown('fw3-onboarding-continue', ['Continue']);
    return true;
  }

  if (pageContainsText('Want free $5 credit') || pageContainsText('Answer 2 questions')) {
    const pickedGoals = clickRandomSurveyOption('What are your goals for using Fireworks?');
    const pickedUseCases = clickRandomSurveyOption('What are your primary use cases?');
    if (pickedGoals === 'missing' || pickedUseCases === 'missing') return false;
    if (pickedGoals === 'picked' || pickedUseCases === 'picked') await sleep(150);
    await clickWithCooldown('fw3-onboarding-submit', ['Submit to get $5 Credits', 'Submit to get']);
    return true;
  }

  return false;
}

async function handleApiKeys(pathname: string, state: FireworksFlow3State): Promise<boolean> {
  if (!pathname.startsWith('/settings/users/api-keys')) return false;
  const credential = getCredentialById(state, state.activeCredentialId);
  if (!credential) return false;

  const apiKey = Array.from(document.querySelectorAll<HTMLElement>('code'))
    .map((node) => String(node.textContent || '').trim())
    .find((text) => /^fw_[A-Za-z0-9]+$/.test(text));
  if (apiKey) {
    await setState({
      credentials: patchCredential(state.credentials, credential.id, {
        apiKey,
        apiKeyCreatedAt: Date.now(),
        status: 'completed',
      }),
      activeCredentialId: undefined,
    });
    window.location.href = LOGOUT_URL;
    return true;
  }

  const keyInput = findFirstInput(['input#name', 'input[name="name"]', 'input[placeholder*="enter a name" i]']);
  if (!keyInput) {
    const visibleMenuItem = findVisibleMenuItemByLabel('API Key');
    if (visibleMenuItem) {
      clickElement(visibleMenuItem);
      return true;
    }

    const opened = await clickWithCooldown('fw3-open-create-api-key-menu', ['Create API Key'], 6000, 1500);
    if (!opened) return false;

    const menuItem = await waitForVisibleMenuItem('API Key', 4000);
    if (!menuItem) return false;
    clickElement(menuItem);
    return true;
  }

  setInputValue(keyInput, `fw3-key-${Date.now().toString(36)}`);
  await sleep(120);
  await clickWithCooldown('fw3-generate-key', ['Generate Key'], 10000, 10000);
  return true;
}

async function handleLogoutRestart(pathname: string, state: FireworksFlow3State): Promise<boolean> {
  if (!pathname.startsWith('/logout')) return false;
  if (state.activeCredentialId) return false;

  const now = Date.now();
  if (state.lastAutoActionKey === 'fw3-restart-after-logout' && now - (state.lastAutoActionAt || 0) < 2500) {
    return true;
  }

  await setState({
    lastAutoActionKey: 'fw3-restart-after-logout',
    lastAutoActionAt: now,
  });
  window.location.href = SIGNUP_URL;
  return true;
}

async function runFireworksFlow3(): Promise<void> {
  let state = await getState();
  if (!state.flow3LoopEnabled && isFlow3TestAutoEnable()) {
    state = await setState({ flow3LoopEnabled: true });
  }
  if (!state.flow3LoopEnabled) return;
  const pathname = window.location.pathname;

  if (pathname.startsWith('/account/home')) {
    window.location.href = 'https://app.fireworks.ai/settings/users/api-keys';
    return;
  }

  if (await handleSignupEmail(pathname, state)) return;
  if (await handleSignupPassword(pathname, state)) return;
  if (await handleSignupVerify(pathname, state)) return;
  if (await handleAccountConfirmed(state)) return;
  if (await handleLoginEntry(pathname)) return;
  if (await handleLoginEmail(pathname, state)) return;
  if (await handleOnboarding(pathname, state)) return;
  if (await handleApiKeys(pathname, state)) return;
  if (await handleLogoutRestart(pathname, state)) return;

  if (!state.activeCredentialId && !pathname.startsWith('/signup') && !pathname.startsWith('/logout')) {
    window.location.href = SIGNUP_URL;
  }
}

export function initFireworksFlow3Automation(): void {
  if (!isSupportedHost(window.location.hostname)) return;

  let runInFlight = false;
  let rerunRequested = false;
  const runSafely = () => {
    if (runInFlight) {
      rerunRequested = true;
      return;
    }
    runInFlight = true;
    runFireworksFlow3()
      .catch((error) => console.warn('[Ephemera][Fireworks Flow3] failed:', error))
      .finally(() => {
        runInFlight = false;
        if (rerunRequested) {
          rerunRequested = false;
          queueMicrotask(runSafely);
        }
      });
  };

  const observer = new MutationObserver(runSafely);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'disabled', 'aria-checked', 'value'],
  });

  document.addEventListener('focusin', runSafely, true);
  document.addEventListener('click', runSafely, true);
  const intervalId = window.setInterval(runSafely, 700);

  window.addEventListener('unload', () => {
    clearInterval(intervalId);
    observer.disconnect();
    document.removeEventListener('focusin', runSafely, true);
    document.removeEventListener('click', runSafely, true);
  }, { once: true });

  runSafely();
}
