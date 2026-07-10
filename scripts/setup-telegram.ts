import path from "path";
import fs from "fs";

// Simple manual .env parser to avoid external dependencies
function loadEnvRaw(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;

        // Split by = but handle values that might contain =
        const firstEquals = trimmed.indexOf("=");
        if (firstEquals === -1) return;

        const key = trimmed.slice(0, firstEquals).trim();
        let value = trimmed.slice(firstEquals + 1).trim();

        // Handle inline comments: if value is quoted, comment must be after the closing quote
        if (value.startsWith('"')) {
            const closingQuote = value.indexOf('"', 1);
            if (closingQuote !== -1) {
                value = value.slice(1, closingQuote);
            }
        } else if (value.startsWith("'")) {
            const closingQuote = value.indexOf("'", 1);
            if (closingQuote !== -1) {
                value = value.slice(1, closingQuote);
            }
        } else {
            // No quotes, just strip everything after first #
            const commentIndex = value.indexOf("#");
            if (commentIndex !== -1) {
                value = value.slice(0, commentIndex).trim();
            }
        }

        process.env[key] = value;
    });
}

// Load environment variables manually
const envPath = path.join(process.cwd(), "services/api/.env");
loadEnvRaw(envPath);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_URL = process.env.WEB_URL; // e.g. https://app.manhquy.id.vn
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const API_URL_ENV = process.env.API_URL;

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
