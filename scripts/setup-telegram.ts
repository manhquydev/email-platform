/**
 * Script to setup Telegram Webhook
 * Usage: npx ts-node scripts/setup-telegram.ts
 */
import { config } from "dotenv";
import fetch from "node-fetch";
import path from "path";

// Load environment variables
config();
config({ path: path.join(__dirname, "../services/api/.env") });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_URL = process.env.WEB_URL; // e.g. https://app.manhquy.click
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

async function setupWebhook() {
    if (!BOT_TOKEN) {
        console.error("❌ Error: TELEGRAM_BOT_TOKEN is not set in .env");
        process.exit(1);
    }

    if (!WEB_URL) {
        console.error("❌ Error: WEB_URL is not set in .env");
        console.log("Infra requirement: The webhook URL needs the public domain of your API.");
        process.exit(1);
    }

    // Derive API URL (assuming api.subdomain or /api path)
    // If WEB_URL is app.domain.com, we might need a separate API_URL env or just let user provide it.
    const API_URL = process.env.API_URL || WEB_URL.replace("app.", "api.");
    const webhookUrl = `${API_URL}/telegram/webhook`;

    console.log(`🚀 Setting Telegram Webhook to: ${webhookUrl}`);

    const payload: any = {
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
    };

    if (WEBHOOK_SECRET) {
        payload.secret_token = WEBHOOK_SECRET;
        console.log("🔒 Using Webhook Secret Token for security.");
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.ok) {
            console.log("✅ Success: Webhook has been set!");
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.error("❌ Failed to set webhook:");
            console.error(JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.error("💥 Error calling Telegram API:", error);
    }
}

setupWebhook();
