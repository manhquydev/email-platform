# Single Sign-On (SSO)

Generate magic links to allow users to log in to their webmail without entering a password. This is useful for "One Click Login" buttons in your client area.

## Generate SSO Link
Create a temporary, single-use login URL for a specific mailbox.

**Endpoint:** `POST /v1/provider/tenants/:id/mailboxes/:email/sso`

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clientIp` | string | **Yes** | The IP address of the user (for security binding) |
| `returnUrl` | string | No | URL to redirect after login (default: inbox) |

**Example Request:**
```bash
curl -X POST "https://api.manhquy.click/v1/provider/tenants/{tenant_id}/mailboxes/{email}/sso" \
  -H "X-Provider-Key: eph_provider_xxx..." \
  -H "Content-Type: application/json" \
  -d '{
    "clientIp": "203.0.113.1",
    "returnUrl": "https://app.manhquy.click/inbox"
  }'
```

**Example Response:**
```json
{
  "ssoUrl": "https://app.manhquy.click/auth/sso?token=8f44d6ff4eac7c81..."
}
```

## Security Details
- **Time To Live (TTL):** Links are valid for **5 minutes**.
- **Single Use:** Once used, the token is invalidated.
- **IP Binding:** The link can **only** be used from the specified `clientIp`.

## Test SSO Flow
```bash
# 1. Generate SSO URL (replace YOUR_IP with your actual IP)
API_KEY="eph_provider_3408c01b228155367cee5b46e13aaae55a9fb2144ef0b04fdd68acc169a0f313"
TENANT_ID="ece152f6-edce-4a26-ad45-c51a129cee2e"
EMAIL="admin@test-cpanel.manhquy.click"

curl -s -X POST "https://api.manhquy.click/v1/provider/tenants/$TENANT_ID/mailboxes/$EMAIL/sso" \
  -H "X-Provider-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clientIp":"YOUR_IP","returnUrl":"https://app.manhquy.click/inbox"}'

# 2. Copy the ssoUrl from response and open in browser
# 3. You will be auto-logged in to the mailbox!
```

## Implementation Example (PHP/WHMCS)
```php
$response = $client->post("v1/provider/tenants/{$tenantId}/mailboxes/{$email}/sso", [
    'headers' => ['X-Provider-Key' => $apiKey],
    'json' => [
        'clientIp' => $_SERVER['REMOTE_ADDR'],
        'returnUrl' => 'https://app.manhquy.click/inbox'
    ]
]);
$data = json_decode($response->getBody(), true);
header("Location: " . $data['ssoUrl']);
exit;
```
