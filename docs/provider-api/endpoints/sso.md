# Single Sign-On (SSO)

Generate magic links to allow users to log in to their webmail without entering a password. This is useful for "One Click Login" buttons in your client area.

## Generate SSO Link
Create a temporary, single-use login URL for a specific mailbox.

**Endpoint:** `POST /tenants/:id/mailboxes/:email/sso`

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `remoteIp` | string | No | The IP address of the user (for security binding) |

**Example Request:**
```json
{
  "remoteIp": "203.0.113.1"
}
```

**Example Response:**
```json
{
  "url": "https://webmail.ephemera.email/auth/magic-login?token=eyJhbGciOi...",
  "expiresAt": "2024-03-20T10:05:00Z"
}
```

## Security Details
- **Time To Live (TTL):** Links are valid for 5 minutes.
- **Single Use:** Once used, the token is invalidated.
- **IP Binding:** If `remoteIp` is provided, the link can only be used from that IP address.

## Implementation Example (PHP/WHMCS)
```php
$response = $client->post("tenants/{$tenantId}/mailboxes/{$email}/sso", [
    'json' => ['remoteIp' => $_SERVER['REMOTE_ADDR']]
]);
$data = json_decode($response->getBody(), true);
header("Location: " . $data['url']);
exit;
```
