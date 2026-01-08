# Testing Guide: Public Inbox Viewer with Telegram Notifications

## Feature Overview

This feature provides:
1. **Public Inbox Viewer** - View emails without login at `/inbox-viewer`
2. **Telegram Linking** - Link any inbox to receive Telegram notifications

---

## 1. Accessing the Public Inbox Viewer

### URL
```
https://app.manhquy.click/inbox-viewer
```

Or locally:
```
http://localhost:5173/inbox-viewer
```

### Steps to Test

1. Open browser and go to `/inbox-viewer`
2. You'll see a search form asking for an email address
3. Enter a valid inbox email (e.g., `test@yourdomain.com`)
4. Click **Search**

### Expected Behavior
- If inbox exists: Shows paginated message list (20/page)
- If inbox doesn't exist: Shows error "Inbox not found"
- No login required

---

## 2. Viewing Messages

### Steps
1. After searching for an inbox, you'll see a list of messages on the left
2. Click any message to view its content on the right
3. Message detail shows:
   - Subject
   - From/To addresses
   - Date
   - HTML body (sanitized)
   - Attachments (if any)

### Pagination
- Messages are paginated (20 per page)
- Use **Prev/Next** buttons at bottom of message list

---

## 3. Linking Inbox to Telegram

### Prerequisites
- Telegram app installed
- Telegram Bot: `@EphemeraBot` (or your configured bot)

### Steps

1. After searching for an inbox, click **"Link to Telegram"** button (top right)
2. A modal appears with:
   - QR Code
   - 6-character linking code (e.g., `inbox_ABC123`)
   - Telegram deep link button
   - 24-hour countdown timer

3. **Option A: Scan QR Code**
   - Open Telegram app
   - Scan the QR code
   - This opens the bot with the linking code

4. **Option B: Click Button**
   - Click "Open in Telegram" button
   - This opens Telegram with the bot

5. After opening Telegram, send `/start inbox_XXXXXX` to the bot
6. Bot responds with success message
7. Modal shows "Successfully Linked!" confirmation

### Expected Behavior
- After linking, you'll receive Telegram notifications when new emails arrive at that inbox
- Up to 5 Telegram accounts can be linked to one inbox

---

## 4. Testing Telegram Notifications

### Steps
1. Link an inbox to your Telegram (see above)
2. Send an email to that inbox
3. Check Telegram - you should receive a notification with:
   - Email subject
   - From address
   - Preview of content
   - "View Email" button linking to inbox viewer

---

## 5. API Endpoints for Testing

### Search Inbox
```bash
curl -X POST https://app.manhquy.click/api/public/inbox/search \
  -H "Content-Type: application/json" \
  -d '{"email": "test@yourdomain.com"}'
```

### Get Messages
```bash
curl "https://app.manhquy.click/api/public/inbox/test@yourdomain.com/messages?limit=20&offset=0"
```

### Get Message Detail
```bash
curl "https://app.manhquy.click/api/public/inbox/test@yourdomain.com/messages/{messageId}"
```

### Generate Telegram Link Token
```bash
curl -X POST https://app.manhquy.click/api/public/telegram/generate-token \
  -H "Content-Type: application/json" \
  -d '{"inboxEmail": "test@yourdomain.com"}'
```

### Check Token Status
```bash
curl "https://app.manhquy.click/api/public/telegram/status/inbox_XXXXXX"
```

---

## 6. Troubleshooting

### "Inbox not found"
- The email address doesn't exist in the system
- Make sure the domain is verified

### "Token expired"
- Linking tokens expire after 24 hours
- Generate a new token

### Not receiving Telegram notifications
- Check if inbox is linked (generate new token shows if already linked)
- Max 5 Telegram accounts per inbox
- Check bot is running

### QR Code not loading
- Use the 6-character code manually: `/start inbox_XXXXXX`

---

## 7. Test Scenarios Checklist

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 1 | Search valid inbox | Shows message list |
| 2 | Search invalid inbox | Shows "Inbox not found" |
| 3 | View message detail | Shows HTML content, attachments |
| 4 | Pagination works | Next/Prev loads correct page |
| 5 | Generate Telegram token | Shows QR + code + timer |
| 6 | Link via Telegram | Modal shows "Successfully Linked" |
| 7 | Receive notification | New email triggers Telegram message |
| 8 | Token expires | Shows "Token expired" after 24h |
| 9 | Dark mode | UI adapts to dark theme |
| 10 | Mobile responsive | Works on mobile screens |

---

## 8. Screenshots Reference

### Inbox Viewer Page
- **Location:** `/inbox-viewer`
- **Layout:** Search form (initial) → Split view (list + detail)

### Telegram Link Modal
- Opens when clicking "Link to Telegram" button
- Shows QR code, token, timer, and Telegram button

---

## Notes

- This is a **public feature** - no authentication required
- Rate limited: 100 requests/minute per IP
- Only verified domains are accessible
- View only - no delete capability
