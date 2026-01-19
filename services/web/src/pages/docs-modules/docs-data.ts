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
    createInbox: `curl -X POST https://api.manhquy.click/inboxes \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"domainId": "your-domain-id"}'`,

    listMessages: `curl https://api.manhquy.click/inboxes/{inbox_id}/messages \\
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
console.log(inbox.address); // random@yourdomain.com`
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

export const PLANNED_SDKS = [
    { name: "JavaScript/TypeScript", icon: "🟨", status: "Đang phát triển" },
    { name: "Python", icon: "🐍", status: "Planned Q2 2024" },
    { name: "Go", icon: "🔵", status: "Planned Q3 2024" },
    { name: "PHP", icon: "🐘", status: "Community" },
];
