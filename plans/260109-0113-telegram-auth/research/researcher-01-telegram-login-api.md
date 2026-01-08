# Telegram Login Widget & Authentication API Research

## 1. Overview
Telegram Login Widget allows websites to authenticate users using their Telegram accounts. It provides a seamless UI and a cryptographic verification method to ensure data integrity.

## 2. Integration Steps
1. **Bot Creation**: Create a bot via [@BotFather](https://t.me/BotFather) using `/newbot`.
2. **Domain Setup**: Use `/setdomain` in @BotFather to link your website's domain to the bot.
   - **Requirement**: Must use HTTPS.
   - **Local Dev**: Use `ngrok` or map `127.0.0.1` to a domain in `hosts`.
3. **Embed Widget**: Add the provided `<script>` to your frontend.
   - **Callback**: `onTelegramAuth(user)` function.
   - **Redirect**: Data sent via GET parameters to a specified URL.

## 3. Data Structure (Returned by Telegram)
| Field | Type | Description |
|-------|------|-------------|
| `id` | Number | Unique Telegram user ID |
| `first_name` | String | User's first name |
| `last_name` | String | User's last name (optional) |
| `username` | String | Telegram @username (optional) |
| `photo_url` | String | URL to user's profile photo |
| `auth_date` | Number | Unix timestamp of the authentication |
| `hash` | String | HMAC-SHA256 signature for verification |

## 4. Verification Logic (Node.js)
Verification ensures the data was not tampered with and originated from Telegram.

```javascript
const crypto = require('crypto');

function verifyTelegramAuth(authData, botToken) {
  const { hash, ...data } = authData;

  // 1. Sort keys alphabetically and filter empty values
  const checkString = Object.keys(data)
    .sort()
    .filter(k => data[k] !== undefined && data[k] !== null && data[k] !== '')
    .map(k => `${k}=${data[k]}`)
    .join('\n');

  // 2. Secret key = SHA256(botToken)
  const secretKey = crypto.createHash('sha256')
    .update(botToken)
    .digest();

  // 3. HMAC-SHA256(checkString, secretKey)
  const hmac = crypto.createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  return hmac === hash;
}
```

## 5. Security Best Practices
- **Token Safety**: NEVER expose the bot token on the client-side.
- **Timestamp Check**: Verify `auth_date` is recent (e.g., within 24 hours) to prevent replay attacks.
- **Domain Binding**: Telegram only sends data to the domain configured in @BotFather.
- **HTTPS Only**: Required for the widget to function.

## 6. Comparison: Widget vs OAuth 2.0
- **Flow**: Widget uses a popup/embedded frame; OAuth 2.0 typically uses full-page redirects.
- **Protocol**: Telegram uses a custom HMAC-SHA256 verification instead of JWT/Access Tokens (though they have a separate OAuth2-like redirect flow at `oauth.telegram.org`).
- **Simplicity**: Widget is easier for small apps; OAuth 2.0 is better for standard identity provider integrations.

## 7. Limitations
- **No Email**: Telegram does NOT provide the user's email address.
- **Bot-Centric**: Every integration must be tied to a specific Telegram bot.

## Sources
- [Telegram Core: Login Widget](https://core.telegram.org/widgets/login)
- [Verification Requirements](https://core.telegram.org/widgets/login#checking-authorization)

---
**Unresolved Questions:**
- None.
