import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://app.manhquy.click/login', { waitUntil: 'networkidle2' });

  // Wait for inputs
  await page.waitForSelector('input', { timeout: 10000 });

  // Type credentials
  const inputs = await page.$$('input');
  await inputs[0].type('quydoanahihi@gmail.com', { delay: 50 });
  await inputs[1].type(process.env.TEST_PASSWORD || 'CHANGE_ME', { delay: 50 });

  // Click submit
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

  // Get cookies for session
  const cookies = await page.cookies();

  console.log(JSON.stringify({
    success: true,
    url: page.url(),
    title: await page.title(),
    cookieCount: cookies.length,
    cookies: cookies.map(c => ({ name: c.name, domain: c.domain }))
  }, null, 2));

  // Keep browser open for session reuse
  await browser.disconnect();
})();
