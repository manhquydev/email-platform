# Tenant Management

Tenants represent your customers. Each tenant has their own plan, limits, domains, and mailboxes.

## Create Tenant
Create a new tenant account.

**Endpoint:** `POST /tenants`

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `externalId` | string | Yes | Your internal customer ID (e.g., WHMCS User ID) |
| `customerEmail` | string | Yes | Email address of the customer |
| `customerName` | string | No | Full name of the customer |
| `plan` | enum | Yes | Plan level: `LITE`, `PRO`, `BUSINESS` |

**Example Request:**
```json
{
  "externalId": "user_12345",
  "customerEmail": "alice@example.com",
  "customerName": "Alice Smith",
  "plan": "PRO"
}
```

**Example Response:**
```json
{
  "tenant": {
    "id": "tenant_xyz123",
    "externalId": "user_12345",
    "status": "ACTIVE",
    "plan": "PRO",
    "maxMailboxes": 999,
    "maxStorageGb": 10,
    "createdAt": "2024-03-20T10:00:00Z"
  }
}
```

## List Tenants
Retrieve a paginated list of your tenants.

**Endpoint:** `GET /tenants`

**Query Parameters:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 50 | Number of records to return (max 100) |
| `offset` | number | 0 | Number of records to skip |
| `status` | enum | - | Filter by status: `ACTIVE`, `SUSPENDED`, `TERMINATED` |

## Get Tenant
Get details of a specific tenant.

**Endpoint:** `GET /tenants/:id`

## Update Tenant
Update tenant details or upgrade/downgrade plan.

**Endpoint:** `PATCH /tenants/:id`

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| `customerEmail` | string | Update contact email |
| `customerName` | string | Update customer name |
| `plan` | enum | Change plan (`LITE`, `PRO`, `BUSINESS`) |

## Suspend Tenant
Temporarily disable a tenant. Mailboxes will stop receiving/sending email.

**Endpoint:** `POST /tenants/:id/suspend`

## Unsuspend Tenant
Re-activate a suspended tenant.

**Endpoint:** `POST /tenants/:id/unsuspend`

## Terminate Tenant
Permanently delete a tenant and all associated data (domains, mailboxes). This action cannot be undone.

**Endpoint:** `DELETE /tenants/:id`
