# Mailbox Management

Manage email accounts (mailboxes) for your tenants.

## Create Mailbox
Create a new email account. The domain must be verified first.

**Endpoint:** `POST /tenants/:id/mailboxes`

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `localPart` | string | Yes | The part before the @ (e.g., `alice` for `alice@example.com`) |
| `domain` | string | Yes | The domain name |
| `password` | string | Yes | Initial password (min 8 chars) |
| `displayName` | string | No | Sender name |
| `quotaMb` | number | No | Storage quota in MB (max 102400) |

**Example Request:**
```json
{
  "localPart": "alice",
  "domain": "example.com",
  "password": "SecurePassword123!",
  "displayName": "Alice Smith",
  "quotaMb": 5120
}
```

**Example Response:**
```json
{
  "mailbox": {
    "email": "alice@example.com",
    "displayName": "Alice Smith",
    "quotaMb": 5120,
    "createdAt": "2024-03-20T10:00:00Z"
  }
}
```

## List Mailboxes
Get all mailboxes for a tenant.

**Endpoint:** `GET /tenants/:id/mailboxes`

**Response:**
```json
{
  "mailboxes": [
    {
      "email": "alice@example.com",
      "displayName": "Alice Smith",
      "quotaMb": 5120,
      "createdAt": "2024-03-20T10:00:00Z"
    }
  ]
}
```

## Delete Mailbox
Delete an email account.

**Endpoint:** `DELETE /tenants/:id/mailboxes/:email`
*Note: The email parameter must be URL encoded.*
