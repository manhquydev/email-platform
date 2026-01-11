#!/usr/bin/env node
/**
 * Combined auth injection and screenshot in single session
 * Usage: node auth-screenshot.js --token "xxx" --url "https://example.com/protected" --output "screenshot.png"
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function main() {
    const args = process.argv.slice(2);
    const getArg = (name) => {
        const idx = args.indexOf(`--${name}`);
        return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
    };

    const token = getArg('token');
    const url = getArg('url');
    const output = getArg('output');
    const viewport = getArg('viewport') || '1920x1080';
    const wait = parseInt(getArg('wait') || '3000');

    if (!token || !url || !output) {
        console.log(JSON.stringify({ success: false, error: '--token, --url, and --output are required' }));
        process.exit(1);
    }

    const [width, height] = viewport.split('x').map(Number);

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width, height });

        // First navigate to base domain to set localStorage
        const urlObj = new URL(url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

        await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Inject token into localStorage (app uses 'token' key)
        await page.evaluate((tok) => {
            localStorage.setItem('token', tok);
        }, token);

        // Now navigate to the target URL
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for page to stabilize
        await new Promise(r => setTimeout(r, wait));

        // Ensure output directory exists
        const dir = path.dirname(output);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Take screenshot
        await page.screenshot({ path: output, fullPage: false });

        const stats = fs.statSync(output);
        const finalUrl = page.url();

        await browser.close();

        console.log(JSON.stringify({
            success: true,
            output,
            size: stats.size,
            url: finalUrl
        }));
    } catch (error) {
        console.log(JSON.stringify({
            success: false,
            error: error.message
        }));
        process.exit(1);
    }
}

main();
