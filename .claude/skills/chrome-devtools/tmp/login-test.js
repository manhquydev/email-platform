import { getBrowser, getPage, disconnectBrowser, outputJSON } from '../scripts/lib/browser.js';

async function loginTest() {
  const browser = await getBrowser();
  const page = await getPage(browser);

  await page.goto('https://app.manhquy.click/login', { waitUntil: 'networkidle2' });

  // Wait for inputs
  await page.waitForSelector('input', { timeout: 10000 });

  // Type credentials
  const inputs = await page.$$('input');
  await inputs[0].type('quydoanahihi@gmail.com', { delay: 30 });
  await inputs[1].type(process.env.TEST_PASSWORD || 'CHANGE_ME', { delay: 30 });

  // Click submit
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

  // Get cookies for session
  const cookies = await page.cookies();

  outputJSON({
    success: true,
    url: page.url(),
    title: await page.title(),
    cookieCount: cookies.length,
    isLoggedIn: page.url().includes('/app') || page.url().includes('/focus')
  });

  await disconnectBrowser();
}

loginTest();
