import { chromium, test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

type MockEvent = {
  name: string;
  payload?: Record<string, unknown>;
  at: number;
};

const MOCK_EVENT_KEY = 'fw3_mock_events';
const MOCK_EMAIL_1 = 'flow3.e2e+1@mockfireworks.test';
const MOCK_API_KEY = 'fw_CbG49i9ush81rhuKpxvuYa';
const MOCK_CONFIRM_LINK = 'https://app.fireworks.ai/signup/confirm?client_id=sueas7prsfrdp16nantbeqcjv&user_name=a8add754-f348-4dd3-854a-91b2903dee8e&confirmation_code=343281';
const FLOW3_TEST_QUEUE_KEY = 'ephemera:fw3:test:credential-queue';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function htmlShell(title: string, body: string, script: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: sans-serif; max-width: 760px; margin: 24px auto; padding: 0 16px; }
      h1 { font-size: 24px; }
      .stack { display: flex; flex-direction: column; gap: 10px; }
      .row { display: flex; gap: 8px; align-items: center; }
      button, input, a { font-size: 14px; }
      input { padding: 8px; border: 1px solid #ddd; border-radius: 6px; width: 100%; }
      button { padding: 10px 14px; border: 1px solid #222; border-radius: 8px; background: #111; color: #fff; cursor: pointer; }
      .option { display: inline-flex; border: 1px solid #999; background: #fff; color: #222; margin-right: 8px; margin-bottom: 8px; }
      .option[aria-checked="true"] { background: #111; color: #fff; }
      .menu { border: 1px solid #ddd; border-radius: 8px; padding: 8px; width: fit-content; }
      code { background: #f5f5f5; padding: 4px 6px; border-radius: 4px; display: inline-block; }
    </style>
  </head>
  <body>
    ${body}
    <script>
      (() => {
        const key = '${MOCK_EVENT_KEY}';
        const read = () => {
          try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
        };
        const write = (items) => localStorage.setItem(key, JSON.stringify(items));
        window.__pushFlowEvent = (name, payload = {}) => {
          const items = read();
          items.push({ name, payload, at: Date.now() });
          write(items);
        };
        ${script}
      })();
    </script>
  </body>
</html>`;
}

function renderSignupPage(): string {
  return htmlShell(
    'Signup',
    '<h1>Sign up</h1><div id="root" class="stack"></div>',
    `
      const stageKey = 'fw3_signup_stage';
      const emailKey = 'fw3_signup_email';
      const passwordKey = 'fw3_signup_password';
      const root = document.getElementById('root');
      const stage = localStorage.getItem(stageKey) || 'email';

      const validatePassword = (value) => ({
        minLength: value.length >= 8,
        hasLower: /[a-z]/.test(value),
        hasUpper: /[A-Z]/.test(value),
        hasNumber: /\\d/.test(value),
        hasSpecial: /[^A-Za-z0-9]/.test(value),
      });

      const renderEmail = () => {
        window.__pushFlowEvent('step1_signup_page_loaded', { stage: 'email' });
        root.innerHTML = \`
          <form id="signup-email-form" class="stack">
            <label>Email</label>
            <input name="email" type="email" autocomplete="off" />
            <button type="submit">Next</button>
          </form>
        \`;
        document.getElementById('signup-email-form').addEventListener('submit', (event) => {
          event.preventDefault();
          const email = document.querySelector('input[name="email"]').value.trim();
          localStorage.setItem(emailKey, email);
          localStorage.setItem(stageKey, 'password');
          window.__pushFlowEvent('step2_email_submitted', { email });
          renderPassword();
        });
      };

      const renderPassword = () => {
        window.__pushFlowEvent('step3_password_form_visible', {});
        root.innerHTML = \`
          <form id="signup-password-form" class="stack">
            <label>Password</label>
            <input name="password" type="password" autocomplete="off" />
            <label>Confirm Password</label>
            <input name="confirmPassword" type="password" autocomplete="off" />
            <button type="submit">Create Account</button>
          </form>
        \`;
        document.getElementById('signup-password-form').addEventListener('submit', (event) => {
          event.preventDefault();
          const password = document.querySelector('input[name="password"]').value;
          const confirm = document.querySelector('input[name="confirmPassword"]').value;
          const checks = validatePassword(password);
          localStorage.setItem(passwordKey, password);
          window.__pushFlowEvent('step3_password_submitted', {
            password,
            confirm,
            match: password === confirm,
            checks,
          });
          window.__pushFlowEvent('step4_create_account_clicked', {});
          location.href = 'https://app.fireworks.ai/signup/verify';
        });
      };

      if (stage === 'password') {
        renderPassword();
      } else {
        if (localStorage.getItem('fw3_email_form_ready') === '1') {
          renderEmail();
        } else {
          root.innerHTML = '<p>Preparing sign-up form...</p>';
          setTimeout(() => {
            localStorage.setItem('fw3_email_form_ready', '1');
            renderEmail();
          }, 1500);
        }
      }
    `,
  );
}

function renderSignupVerifyPage(): string {
  return htmlShell(
    'Verify Email',
    '<h1>Verify your account</h1><p>Please verify: <strong id="verify-email"></strong></p>',
    `
      const email = localStorage.getItem('fw3_signup_email') || '';
      document.getElementById('verify-email').textContent = email;
      window.__pushFlowEvent('step5_verify_page_loaded', { email });
    `,
  );
}

function renderSignupConfirmPage(): string {
  return htmlShell(
    'Account Confirmed',
    '<h1>Account Confirmed!</h1><p>Your email address has been verified successfully. You can now sign in to your account.</p><button id="sign-in" type="button">Sign In</button>',
    `
      window.__pushFlowEvent('step5_confirmation_link_opened', { href: location.href });
      document.getElementById('sign-in').addEventListener('click', () => {
        window.__pushFlowEvent('step6_sign_in_clicked', {});
        location.href = 'https://app.fireworks.ai/login?redirectURI=%2Faccount%2Fhome%3Fsignup%3Dtrue';
      });
    `,
  );
}

function renderLoginOptionsPage(): string {
  return htmlShell(
    'Login Options',
    '<h1>Log In</h1><a id="email-login" href="/login/email?redirectURI=%2Faccount%2Fhome%3Fsignup%3Dtrue">Email Login</a>',
    `
      window.__pushFlowEvent('step6_login_options_visible', {});
      document.getElementById('email-login').addEventListener('click', () => {
        window.__pushFlowEvent('step6_email_login_selected', {});
      });
    `,
  );
}

function renderLoginEmailPage(): string {
  return htmlShell(
    'Email Login',
    '<h1>Email Login</h1><form id="login-form" class="stack"><label>Email</label><input name="email" type="email" autocomplete="off" /><label>Password</label><input name="password" type="password" autocomplete="off" /><button type="submit" data-testid="login-form-submit">Next</button></form>',
    `
      window.__pushFlowEvent('step7_login_form_visible', {});
      document.getElementById('login-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const email = document.querySelector('input[name="email"]').value;
        const password = document.querySelector('input[name="password"]').value;
        window.__pushFlowEvent('step7_credentials_submitted', { email, password });
        location.href = 'https://app.fireworks.ai/onboarding';
      });
    `,
  );
}

function renderOnboardingProfilePage(): string {
  return htmlShell(
    'Onboarding',
    '<h1>Onboarding</h1><div class="stack"><label>First Name</label><input name="firstName" placeholder="First Name" type="text" /><label>Last Name</label><input name="lastName" placeholder="Last Name" type="text" /><label class="row"><button id="terms" type="button" role="checkbox" aria-checked="false"></button><span>I agree to terms</span></label><button id="continue" type="button">Continue</button></div>',
    `
      window.__pushFlowEvent('step8_profile_visible', {});
      const terms = document.getElementById('terms');
      terms.addEventListener('click', () => {
        const next = terms.getAttribute('aria-checked') === 'true' ? 'false' : 'true';
        terms.setAttribute('aria-checked', next);
      });

      document.getElementById('continue').addEventListener('click', () => {
        const firstName = document.querySelector('input[name="firstName"]').value;
        const lastName = document.querySelector('input[name="lastName"]').value;
        const agreed = terms.getAttribute('aria-checked') === 'true';
        window.__pushFlowEvent('step8_profile_submitted', { firstName, lastName, agreed });
        location.href = 'https://app.fireworks.ai/onboarding?survey=1';
      });
    `,
  );
}

function renderOnboardingSurveyPage(): string {
  return htmlShell(
    'Survey',
    '<h1>Want free $5 credit? Answer 2 questions</h1><section data-question="goals"><h2>What are your goals for using Fireworks?</h2><button type="button" class="option" role="checkbox" aria-checked="false">Build products faster</button><button type="button" class="option" role="checkbox" aria-checked="false">Evaluate model quality</button><button type="button" class="option" role="checkbox" aria-checked="false">Other</button></section><section data-question="usecases"><h2>What are your primary use cases?</h2><button type="button" class="option" role="checkbox" aria-checked="false">Chatbot</button><button type="button" class="option" role="checkbox" aria-checked="false">Code generation</button><button type="button" class="option" role="checkbox" aria-checked="false">Other</button></section><button id="submit" type="button" name="done">Submit to get <span class="ml-1 text-green-primary">$5 Credits</span></button>',
    `
      window.__pushFlowEvent('step9_survey_visible', {});
      document.querySelectorAll('button[role="checkbox"]').forEach((button) => {
        button.addEventListener('click', () => {
          const checked = button.getAttribute('aria-checked') === 'true';
          button.setAttribute('aria-checked', checked ? 'false' : 'true');
        });
      });

      document.getElementById('submit').addEventListener('click', () => {
        const collect = (section) => Array.from(document.querySelectorAll(section + ' button[role="checkbox"][aria-checked="true"]'))
          .map((item) => item.textContent.trim());
        const selectedGoals = collect('[data-question="goals"]');
        const selectedUseCases = collect('[data-question="usecases"]');
        const selectedOther = [...selectedGoals, ...selectedUseCases].some((item) => item.toLowerCase() === 'other');
        window.__pushFlowEvent('step9_survey_submitted', { selectedGoals, selectedUseCases, selectedOther });
        location.href = 'https://app.fireworks.ai/account/home?signup=true';
      });
    `,
  );
}

function renderAccountHomePage(): string {
  return htmlShell(
    'Account Home',
    '<h1>Account Home</h1><p>signup=true</p>',
    `
      window.__pushFlowEvent('step10_account_home_visible', { href: location.href });
    `,
  );
}

function renderApiKeysPage(): string {
  return htmlShell(
    'API Keys',
    '<h1>API Keys</h1><div id="root"></div>',
    `
      const stageKey = 'fw3_api_keys_stage';
      const root = document.getElementById('root');
      const stage = localStorage.getItem(stageKey) || 'initial';
      const apiKey = '${MOCK_API_KEY}';
      window.__pushFlowEvent('step10_api_keys_page_visible', { stage });

      const render = () => {
        const current = localStorage.getItem(stageKey) || 'initial';
        if (current === 'initial') {
          root.innerHTML = '<button id="create-key" type="button">Create API Key</button>';
          document.getElementById('create-key').addEventListener('click', () => {
            window.__pushFlowEvent('step10_create_api_key_clicked', {});
            localStorage.setItem(stageKey, 'menu');
            render();
          });
          return;
        }

        if (current === 'menu') {
          root.innerHTML = '<button type="button">Create API Key</button><div class="menu"><div id="menu-api-key" role="menuitem"><span>API Key</span></div></div>';
          document.getElementById('menu-api-key').addEventListener('click', () => {
            window.__pushFlowEvent('step10_api_key_menu_selected', {});
            localStorage.setItem(stageKey, 'modal');
            render();
          });
          return;
        }

        if (current === 'modal') {
          root.innerHTML = '<form id="generate-form" class="stack"><label>API Key Name*</label><input id="name" name="name" placeholder="Enter a name" type="text" /><button type="submit">Generate Key</button></form>';
          document.getElementById('generate-form').addEventListener('submit', (event) => {
            event.preventDefault();
            const name = document.getElementById('name').value;
            window.__pushFlowEvent('step11_generate_key_clicked', { name });
            localStorage.setItem(stageKey, 'generated');
            render();
          });
          return;
        }

        root.innerHTML = '<h2>Copy your API Key</h2><code>' + apiKey + '</code>';
        window.__pushFlowEvent('step12_api_key_visible', { apiKey });
      };

      render();
    `,
  );
}

function renderLogoutPage(): string {
  return htmlShell(
    'Logout',
    '<h1>Logout</h1><p>Signed out</p>',
    `
      window.__pushFlowEvent('step13_logout_reached', {});
    `,
  );
}

function renderMockPage(requestUrl: string): string {
  const url = new URL(requestUrl);
  const path = url.pathname;
  const isSurvey = path === '/onboarding' && url.searchParams.get('survey') === '1';

  if (path === '/signup') return renderSignupPage();
  if (path === '/signup/verify') return renderSignupVerifyPage();
  if (path === '/signup/confirm') return renderSignupConfirmPage();
  if (path === '/login') return renderLoginOptionsPage();
  if (path === '/login/email') return renderLoginEmailPage();
  if (path === '/onboarding' && !isSurvey) return renderOnboardingProfilePage();
  if (isSurvey) return renderOnboardingSurveyPage();
  if (path === '/account/home') return renderAccountHomePage();
  if (path === '/settings/users/api-keys') return renderApiKeysPage();
  if (path === '/logout') return renderLogoutPage();

  return htmlShell(
    'Welcome',
    '<h1>Welcome</h1><p>Press Ctrl+Shift+9</p>',
    `
      localStorage.setItem('${FLOW3_TEST_QUEUE_KEY}', JSON.stringify([
        {
          email: '${MOCK_EMAIL_1}',
          confirmUrl: '${MOCK_CONFIRM_LINK}'
        }
      ]));
      localStorage.removeItem('fw3_signup_stage');
      localStorage.removeItem('fw3_email_form_ready');
      localStorage.removeItem('fw3_api_keys_stage');
      window.__pushFlowEvent('step0_welcome_loaded', {});
    `,
  );
}

async function waitForBackgroundWorker(context: Awaited<ReturnType<typeof chromium.launchPersistentContext>>) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const worker = context.serviceWorkers()[0];
    if (worker) return worker;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Background service worker was not available in time');
}

async function readMockEvents(page: Page): Promise<MockEvent[]> {
  return page.evaluate((key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }, MOCK_EVENT_KEY);
}

async function waitForMockEvent(page: Page, eventName: string, timeoutMs = 90_000): Promise<MockEvent[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let events: MockEvent[] = [];
    try {
      events = await readMockEvents(page);
    } catch {
      await page.waitForTimeout(100);
      continue;
    }
    if (events.some((item) => item.name === eventName)) return events;
    await page.waitForTimeout(250);
  }
  throw new Error(`Timed out waiting for mock event: ${eventName}`);
}

test.describe('Fireworks Flow 3 Automation', () => {
  test.skip(process.env.FLOW3_E2E !== '1', 'Set FLOW3_E2E=1 to run Flow 3 extension e2e');

  test('runs full 13-step flow with mocked inbox and captures email/password/api key', async () => {
    test.setTimeout(180_000);

    const pathToExtension = path.join(__dirname, '../../.output/chrome-mv3');
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-first-run',
        '--disable-gpu',
      ],
    });
    try {
      const page = await context.newPage();
      await page.route('https://app.fireworks.ai/**', async (route) => {
        if (route.request().resourceType() !== 'document') {
          await route.fulfill({ status: 204, body: '' });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: renderMockPage(route.request().url()),
        });
      });

      await page.goto('https://app.fireworks.ai/welcome', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      const worker = await waitForBackgroundWorker(context);
      await worker.evaluate(() => new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'AUTOMATION_TOGGLE_FIREWORKS_FLOW3_LOOP', source: 'e2e-test' }, () => resolve(null));
      }));

      await expect.poll(() => {
        try {
          return new URL(page.url()).pathname;
        } catch {
          return '';
        }
      }, { timeout: 10_000 }).toBe('/signup');

      const events = await waitForMockEvent(page, 'step13_logout_reached');

      const names = events.map((item) => item.name);
      const requiredOrder = [
        'step1_signup_page_loaded',
        'step2_email_submitted',
        'step3_password_submitted',
        'step4_create_account_clicked',
        'step5_verify_page_loaded',
        'step5_confirmation_link_opened',
        'step6_sign_in_clicked',
        'step6_email_login_selected',
        'step7_credentials_submitted',
        'step8_profile_submitted',
        'step9_survey_submitted',
        'step10_create_api_key_clicked',
        'step10_api_key_menu_selected',
        'step11_generate_key_clicked',
        'step12_api_key_visible',
        'step13_logout_reached',
      ];

      let lastIndex = -1;
      for (const required of requiredOrder) {
        const index = names.indexOf(required);
        expect(index, `missing event ${required}`).toBeGreaterThan(-1);
        expect(index, `event order broken at ${required}`).toBeGreaterThan(lastIndex);
        lastIndex = index;
      }

      const step3 = events.find((item) => item.name === 'step3_password_submitted');
      const step2 = events.find((item) => item.name === 'step2_email_submitted');
      const step7 = events.find((item) => item.name === 'step7_credentials_submitted');
      const step9 = events.find((item) => item.name === 'step9_survey_submitted');
      const step12 = events.find((item) => item.name === 'step12_api_key_visible');
      expect(step3?.payload?.match).toBe(true);
      expect((step3?.payload?.checks as Record<string, boolean>)?.minLength).toBe(true);
      expect((step3?.payload?.checks as Record<string, boolean>)?.hasLower).toBe(true);
      expect((step3?.payload?.checks as Record<string, boolean>)?.hasUpper).toBe(true);
      expect((step3?.payload?.checks as Record<string, boolean>)?.hasNumber).toBe(true);
      expect((step3?.payload?.checks as Record<string, boolean>)?.hasSpecial).toBe(true);
      expect(step2?.payload?.email).toBe(MOCK_EMAIL_1);
      expect(step7?.payload?.email).toBe(step2?.payload?.email);
      expect(step7?.payload?.password).toBe(step3?.payload?.password);
      expect(step9?.payload?.selectedOther).toBe(false);
      expect(step12?.payload?.apiKey).toBe(MOCK_API_KEY);
      expect(String(step12?.payload?.apiKey || '')).toMatch(/^fw_[A-Za-z0-9]+$/);
    } finally {
      await context.close();
    }
  });
});
