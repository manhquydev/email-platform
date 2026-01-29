import { getBrowser, getPage, disconnectBrowser, outputJSON } from 'C:/Users/manhquy/.claude/skills/chrome-devtools/scripts/lib/browser.js';

async function loginAndScreenshot() {
  const browser = await getBrowser();
  const page = await getPage(browser);

  // Navigate to login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  
  // Fill login form
  await page.evaluate(() => {
    const emailInput = document.querySelector('input[type="email"]');
    const passInput = document.querySelector('input[type="password"]');
    if (emailInput && passInput) {
      emailInput.value = 'admin@example.com';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.value = 'changeme';
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  
  // Click submit
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  
  // Navigate to my-domains
  await page.goto('http://localhost:5173/my-domains', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  
  // Take screenshot
  await page.screenshot({ 
    path: 'D:/project/Clone/email-platform/Wireframe/my_domains/screenshot-new-design.png',
    fullPage: true 
  });

  outputJSON({
    success: true,
    url: page.url(),
    title: await page.title()
  });

  await disconnectBrowser();
}

loginAndScreenshot();
