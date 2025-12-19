# Authentication

TempMail Pro uses JWT (JSON Web Tokens) for authentication. All API endpoints (except health checks) require a valid JWT token in the Authorization header.

## Authentication Flow

### 1. Login

```bash
curl -X POST "https://api.yourdomain.com/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "changeme"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBleGFtcGxlLmNvbSIsImlhdCI6MTcxND..."
}
```

### 2. Use Token in Requests

```bash
curl -X GET "https://api.yourdomain.com/inboxes" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## JWT Token Details

- **Algorithm**: HMAC-SHA256
- **Expiration**: 24 hours (configurable via `JWT_EXPIRES_IN`)
- **Payload contains**:
  - `sub`: User email (subject)
  - `iat`: Issued at timestamp
  - `exp`: Expiration timestamp

## Security Considerations

### Token Storage
- Store tokens securely in memory (preferred)
- Use HttpOnly cookies for web applications
- Never store tokens in localStorage or sessionStorage

### Token Refresh
TempMail Pro doesn't automatically refresh tokens. When a token expires:
1. The API will return `401 Unauthorized`
2. User must log in again to get a new token
3. Implement token refresh logic in your application

### Environment Variables

Configure authentication in your `.env` file:
```env
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
JWT_EXPIRES_IN="24h"
```

## Authentication Endpoints

### POST /auth/login

Authenticate and get a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded

## Role-Based Access Control

TempMail Pro implements role-based permissions:

### Admin Role
- Full access to all endpoints
- Can manage users, domains, and system settings
- Access to admin panel

### Regular User Role
- Can create and manage inboxes
- Can view their own messages
- Limited to their assigned domains

### API Key Support (Future Enhancement)

TempMail Pro will support API keys for programmatic access:
```env
API_KEY_PREFIX="tm_"
API_KEY_LENGTH=32
```

## Example: Authentication in Code

### JavaScript (Fetch API)

```javascript
// Login
async function login(email, password) {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const { token } = await response.json();
  localStorage.setItem('tempmail_token', token);
  return token;
}

// Authenticated request
async function getInboxes() {
  const token = localStorage.getItem('tempmail_token');

  const response = await fetch('/inboxes', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Token expired, redirect to login
    window.location.href = '/login';
    return;
  }

  return response.json();
}
```

### Python (Requests)

```python
import requests

class TempMailClient:
    def __init__(self, base_url, email, password):
        self.base_url = base_url
        self.email = email
        self.password = password
        self.token = None

    def login(self):
        """Authenticate and get JWT token"""
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={
                "email": self.email,
                "password": self.password
            }
        )

        if response.status_code == 200:
            self.token = response.json()["token"]
            return True
        return False

    def make_request(self, endpoint, method="GET", data=None):
        """Make authenticated request"""
        if not self.token:
            raise Exception("Not authenticated")

        headers = {
            "Authorization": f"Bearer {self.token}"
        }

        if data:
            headers["Content-Type"] = "application/json"

        response = requests.request(
            method,
            f"{self.base_url}{endpoint}",
            headers=headers,
            json=data
        )

        if response.status_code == 401:
            # Token expired, try to re-authenticate
            if self.login():
                return self.make_request(endpoint, method, data)
            raise Exception("Authentication failed")

        return response
```

## Security Headers

TempMail Pro includes security headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Rate Limiting

Authentication endpoints are rate limited:
- **Login attempts**: 5 per minute per IP
- **Failed logins**: Account lockout after 5 failures

## CORS Configuration

For web applications, CORS is configured to allow:
- Specific origins in production
- All origins in development

Configure in `.env`:
```env
CORS_ORIGIN="http://localhost:5173,https://yourdomain.com"
```

## Troubleshooting Authentication Issues

### Common Errors

**401 Unauthorized**
- Check if token is valid and not expired
- Verify token is properly formatted (`Bearer <token>`)
- Ensure user credentials are correct

**429 Too Many Requests**
- Wait for rate limit to reset
- Implement exponential backoff in your application

**Token Decode Errors**
- Verify JWT secret configuration
- Check token format (no extra characters)

### Debug Steps

1. **Verify token validity**:
```bash
# Decode JWT (requires jwt.io or similar tool)
echo "YOUR_TOKEN" | base64 -d  # View payload
```

2. **Check API logs**:
```bash
docker compose logs api | grep auth
```

3. **Test with curl**:
```bash
# Without token (should fail)
curl -X GET "http://localhost:3001/inboxes"

# With valid token (should succeed)
curl -X GET "http://localhost:3001/inboxes" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Best Practices

1. **Always use HTTPS** in production
2. **Rotate JWT secrets** periodically
3. **Implement proper error handling** for auth failures
4. **Log authentication events** for security auditing
5. **Use short token lifespans** (24 hours recommended)
6. **Implement token refresh** mechanism for better UX

## Next Steps

Now that you understand authentication:

- [Explore API endpoints](endpoints/domains.md)
- [Learn about inbox management](endpoints/inboxes.md)
- [Check out message operations](endpoints/messages.md)
- [Build an integration using our SDKs](../tutorials/)