# Authentication

The Provider API uses API keys to authenticate requests. You can manage your API keys in the [Provider Portal](https://provider.ephemera.email).

## API Key Format
API keys start with the prefix `eph_provider_` followed by a random string.
Example: `eph_provider_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

## Using the API Key
Include the API key in the `X-Provider-Key` HTTP header for every request.

### curl Example
```bash
curl https://api.ephemera.email/v1/provider/me \
  -H "X-Provider-Key: eph_provider_..."
```

### Node.js (Axios) Example
```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.ephemera.email/v1/provider',
  headers: {
    'X-Provider-Key': process.env.PROVIDER_API_KEY
  }
});

await client.get('/me');
```

### PHP (Guzzle) Example
```php
$client = new \GuzzleHttp\Client([
    'base_uri' => 'https://api.ephemera.email/v1/provider/',
    'headers' => [
        'X-Provider-Key' => getenv('PROVIDER_API_KEY')
    ]
]);

$response = $client->get('me');
```

## Security Best Practices

1. **Keep it Secret**: Never expose your API key in client-side code (browsers, mobile apps).
2. **Rotate Keys**: If you suspect a key compromise, regenerate it immediately via the Provider Portal or the API.
3. **Environment Variables**: Store keys in environment variables, not in your code repository.

## Regenerating API Keys
You can regenerate your API key via the API itself (if you still have access) or the Provider Portal.

**Endpoint:** `POST /v1/provider/api-key`

**Response:**
```json
{
  "message": "API key regenerated. Store this key securely - it will not be shown again.",
  "apiKey": "eph_provider_new_key_..."
}
```
**Warning:** This will immediately invalidate the old API key.
