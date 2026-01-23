/**
 * Types and data for Docs page
 */

export type DocSection = "quickstart" | "api" | "webhooks" | "sdks";

export const DOC_TABS = [
    { id: "quickstart", label: "Bắt đầu nhanh", icon: "rocket_launch" },
    { id: "api", label: "API Reference", icon: "api" },
    { id: "webhooks", label: "Webhooks", icon: "webhook" },
    { id: "sdks", label: "SDKs", icon: "code" },
] as const;

export const CODE_EXAMPLES = {
    createInbox: `curl -X POST https://api.manhquy.click/inboxes \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domainId": "your-domain-id"}'`,

    listMessages: `curl https://api.manhquy.click/inboxes/{inbox_id}/messages \
  -H "Authorization: Bearer YOUR_API_KEY"`,

    webhookPayload: `{
  "event": "email.received",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "msg_abc123",
    "inboxId": "inbox_xyz",
    "from": "sender@example.com",
    "subject": "Welcome!",
    "preview": "Thanks for signing up..."
  }
}`,

    verifyWebhook: `import crypto from 'crypto';

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`,

    fetchExample: `const response = await fetch('https://api.manhquy.click/inboxes', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ domainId: 'your-domain-id' })
});

const inbox = await response.json();
console.log(inbox.address); // random@yourdomain.com`,

    // SDK code examples
    sdkJs: `import { EphemeraClient } from '@ephemera/sdk';

const client = new EphemeraClient(process.env.EPHEMERA_API_KEY);

// Create inbox and wait for email
const inbox = await client.createInbox();
const message = await client.waitForEmail(inbox.id, { subject: 'Verify' });
const code = client.extractCode(message);
console.log('OTP:', code);`,

    sdkPython: `from ephemera import EphemeraClient

client = EphemeraClient(os.environ["EPHEMERA_API_KEY"])

# Create inbox and wait for email
inbox = client.create_inbox()
message = client.wait_for_email(inbox.id, subject="Verify")
code = client.extract_code(message)
print(f"OTP: {code}")`,

    sdkGo: `client := ephemera.NewClient(os.Getenv("EPHEMERA_API_KEY"))
ctx := context.Background()

inbox, _ := client.CreateInbox(ctx, nil)
message, _ := client.WaitForEmail(ctx, inbox.ID, &ephemera.WaitOptions{
    Subject: "Verify",
    Timeout: 60 * time.Second,
})
code := ephemera.ExtractCode(message)
fmt.Println("OTP:", code)`,
};

export const API_ENDPOINTS = [
    { method: "POST", path: "/inboxes", desc: "Tạo inbox mới" },
    { method: "GET", path: "/inboxes", desc: "Liệt kê inbox" },
    { method: "GET", path: "/inboxes/:id", desc: "Chi tiết inbox" },
    { method: "DELETE", path: "/inboxes/:id", desc: "Xóa inbox" },
    { method: "GET", path: "/inboxes/:id/messages", desc: "Danh sách email" },
    { method: "GET", path: "/messages/:id", desc: "Chi tiết email" },
    { method: "DELETE", path: "/messages/:id", desc: "Xóa email" },
    { method: "GET", path: "/domains", desc: "Liệt kê domain" },
    { method: "POST", path: "/webhooks", desc: "Tạo webhook" },
    { method: "GET", path: "/webhooks", desc: "Liệt kê webhook" },
    { method: "DELETE", path: "/webhooks/:id", desc: "Xóa webhook" },
    { method: "POST", path: "/webhooks/:id/test", desc: "Test webhook" },
    { method: "GET", path: "/api-keys", desc: "Liệt kê API key" },
    { method: "POST", path: "/api-keys", desc: "Tạo API key" },
    { method: "DELETE", path: "/api-keys/:id", desc: "Thu hồi API key" },
];

export const AVAILABLE_SDKS = [
    { name: "JavaScript/TypeScript", icon: "🟨", status: "✅ Available", install: "npm install @ephemera/sdk" },
    { name: "Python", icon: "🐍", status: "✅ Available", install: "pip install ephemera" },
    { name: "Go", icon: "🔵", status: "✅ Available", install: "go get github.com/ephemera/sdk-go" },
    { name: "PHP", icon: "🐘", status: "✅ Available", install: "composer require ephemera/sdk" },
    { name: "Java", icon: "☕", status: "✅ Available", install: "Maven: com.ephemera:sdk" },
    { name: ".NET", icon: "🟣", status: "✅ Available", install: "dotnet add package Ephemera.Sdk" },
    { name: "CLI", icon: "⌨️", status: "✅ Available", install: "npm install -g @ephemera/cli" },
];
