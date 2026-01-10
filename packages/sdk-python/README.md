# ephemera

Official Python SDK for [Ephemera](https://ephemera.email) temporary email platform.

## Installation

```bash
pip install ephemera
```

## Quick Start

```python
from ephemera import EphemeraClient

client = EphemeraClient("your-api-key")

# Create a temporary inbox
inbox = client.create_inbox()
print(f"Created inbox: {inbox.address}")

# Wait for an email
message = client.wait_for_email(inbox.id, subject="Verification", timeout=60)

# Extract OTP code
code = client.extract_code(message)
print(f"Verification code: {code}")

# Clean up
client.delete_inbox(inbox.id)
```

## Context Manager

```python
with EphemeraClient("your-api-key") as client:
    inbox = client.create_inbox()
    # Use inbox...
# Connection automatically closed
```

## API Reference

### Inbox Methods

```python
inbox = client.create_inbox()
inbox = client.create_inbox(local_part="test", domain_id="...")
inbox = client.get_inbox("inbox-id")
inboxes = client.list_inboxes()
client.delete_inbox("inbox-id")
```

### Message Methods

```python
messages = client.get_messages("inbox-id")
message = client.get_message("message-id")
client.delete_message("message-id")
```

### Convenience Methods

```python
# Wait for email (polling)
message = client.wait_for_email("inbox-id", subject="Welcome", timeout=60)

# Extract OTP code
code = client.extract_code(message)

# Create inbox and wait
inbox, message = client.create_inbox_and_wait(subject="Verification")
```

## Error Handling

```python
from ephemera import EphemeraClient, NotFoundError, RateLimitedError

try:
    inbox = client.get_inbox("invalid-id")
except NotFoundError:
    print("Inbox not found")
except RateLimitedError as e:
    print(f"Rate limited. Retry after: {e.retry_after}s")
```

## Privacy

Ephemera is built with privacy-first principles:
- Zero-log policy: No original IPs stored
- Tracking pixels automatically removed
- Sensitive headers filtered

## License

MIT
