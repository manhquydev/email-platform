# TempMail Pro Python SDK

Official Python SDK for the TempMail Pro API.

## Installation

```bash
pip install tempmailpro-sdk
```

Or install from source:

```bash
git clone https://github.com/tempmailpro/python-sdk.git
cd python-sdk
pip install -e .
```

## Quick Start

```python
import os
from tempmailpro import TempMailPro
from datetime import datetime, timedelta

# Initialize the client (reads from environment variables by default)
client = TempMailPro()

# Or pass config explicitly
# client = TempMailPro(Config(
#     api_key='your-api-key',
#     base_url='https://api.tempmail.pro/v1',
#     timeout=30,
#     retries=3
# ))

try:
    # Create an inbox
    inbox = client.create_inbox(CreateInboxOptions(
        description='My test inbox',
        auto_delete=True,
        auto_delete_hours=24
    ))
    print(f"Created inbox: {inbox.address}")

    # List messages
    messages, meta = client.list_messages(inbox.id)
    print(f"Messages: {len(messages)}")

    # Create an API key
    result = client.create_api_key(
        'My API Key',
        permissions=['read', 'write']
    )
    print(f"API Key created: {result['api_key']}")
except Exception as e:
    print(f"Error: {e}")
```

## Configuration

The SDK can be configured using environment variables or by passing a config object:

### Environment Variables

```bash
export TEMPMAILPRO_API_KEY=your-api-key
export TEMPMAILPRO_BASE_URL=https://api.tempmail.pro/v1
export TEMPMAILPRO_TIMEOUT=30
export TEMPMAILPRO_RETRIES=3
```

### Config Object

```python
from tempmailpro import TempMailPro, Config

client = TempMailPro(Config(
    api_key='your-api-key',
    base_url='https://api.tempmail.pro/v1',
    timeout=30,
    retries=3
))
```

## API Reference

### Users

```python
# Get current user
user = client.get_current_user()
print(f"User: {user.email}")
```

### Domains

```python
# List domains
domains, meta = client.list_domains(ListOptions(
    limit=10,
    offset=0,
    search='example.com'
))

# Create a domain
domain = client.create_domain('example.com')

# Verify domain
verified_domain = client.verify_domain(domain.id, 'verification-token')

# Delete domain
client.delete_domain(domain.id)
```

### Inboxes

```python
# List inboxes
inboxes, meta = client.list_inboxes(ListOptions(
    limit=10,
    search='test'
))

# Create an inbox
inbox = client.create_inbox(CreateInboxOptions(
    domain='example.com',
    description='Test inbox',
    auto_delete=True,
    auto_delete_hours=24
))

# Get inbox details
inbox = client.get_inbox(inbox_id)

# Delete inbox
client.delete_inbox(inbox_id)
```

### Messages

```python
# List messages in an inbox
messages, meta = client.list_messages(inbox_id, ListOptions(
    limit=50,
    sort_by='receivedAt',
    sort_order='desc'
))

# Get message
message = client.get_message(message_id)

# Mark as read
client.mark_message_as_read(message_id)

# Delete message
client.delete_message(message_id)
```

### Attachments

```python
# List attachments
attachments = client.list_attachments(message_id)

# Get attachment URL
attachment_info = client.get_attachment(attachment_id)
print(f"Download URL: {attachment_info['url']}")

# Download attachment
content = client.download_attachment(attachment_id)
with open(attachment_info['filename'], 'wb') as f:
    f.write(content)
```

### Filter Rules

```python
# List filter rules
rules = client.list_filter_rules()

# Create a filter rule
rule = client.create_filter_rule(CreateFilterRuleOptions(
    name='Block spam',
    type='BLOCK',
    field='FROM',
    pattern='*@spam.com',
    priority=100
))

# Update filter rule
updated_rule = client.update_filter_rule(rule_id, {
    'isActive': False
})

# Delete filter rule
client.delete_filter_rule(rule_id)
```

### API Keys

```python
# List API keys
api_keys = client.list_api_keys()

# Create API key
result = client.create_api_key(
    'My Key',
    permissions=['read', 'write'],
    organization_id='org-id',
    rate_limit=1000
)
print(f"API Key: {result['api_key']}")

# Delete API key
client.delete_api_key(key_id)
```

### Webhooks

```python
# List webhooks
webhooks = client.list_webhooks()

# Create webhook
result = client.create_webhook(
    'My Webhook',
    'https://example.com/webhook',
    ['email.received', 'email.bounced'],
    secret='webhook-secret',
    timeout=30000,
    retry_attempts=3
)
print(f"Webhook secret: {result['secret']}")

# Delete webhook
client.delete_webhook(webhook_id)
```

### Usage and Quotas

```python
# Get usage statistics
usage = client.get_usage()
print(f"Emails this month: {usage.emails_this_month}")

# Get quota limits
limits = client.get_quota_limits()
print(f"Max inboxes: {limits.inboxes}")
```

## Error Handling

The SDK raises `TempMailProError` for API failures:

```python
from tempmailpro import TempMailPro, TempMailProError

client = TempMailPro()

try:
    inbox = client.create_inbox()
except TempMailProError as e:
    if e.status_code == 401:
        print("Invalid API key")
    elif e.status_code == 429:
        print("Rate limit exceeded")
    else:
        print(f"Error: {e}")
```

## Data Models

The SDK uses dataclasses for all API responses:

```python
from tempmailpro import Inbox, Message, ApiKey

# Type hints work naturally
inbox: Inbox = client.create_inbox()
message: Message = client.get_message(message_id)
api_keys: list[ApiKey] = client.list_api_keys()

# Access properties
print(f"Inbox address: {inbox.address}")
print(f"Message subject: {message.subject}")
print(f"API key status: {api_keys[0].status}")
```

## Advanced Usage

### Working with Dates

```python
from datetime import datetime, timedelta

# Create inbox with expiration
expires_at = datetime.now() + timedelta(hours=24)
inbox = client.create_inbox(CreateInboxOptions(
    expires_at=expires_at
))

# Parse dates from responses
print(f"Inbox created: {inbox.created_at}")
```

### Pagination

```python
# Iterate through all domains
offset = 0
limit = 100
while True:
    domains, meta = client.list_domains(ListOptions(
        limit=limit,
        offset=offset
    ))

    for domain in domains:
        print(domain.name)

    if not meta.has_next:
        break

    offset += limit
```

### Organization Scoping

```python
# List organization resources
org_domains = client.list_domains(organization_id='org-id')
org_inboxes = client.list_inboxes(organization_id='org-id')
org_usage = client.get_usage(organization_id='org-id')
```

## Development

Install the SDK in development mode:

```bash
git clone https://github.com/tempmailpro/python-sdk.git
cd python-sdk
pip install -e ".[dev]"
```

Run tests:

```bash
pytest
```

Run code formatting:

```bash
black src/
```

Run type checking:

```bash
mypy src/
```

## License

MIT License - see [LICENSE](LICENSE) file for details.