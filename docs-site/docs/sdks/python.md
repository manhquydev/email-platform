---
sidebar_position: 2
---

# Python SDK

Official Python SDK for Ephemera.

## Installation

```bash
pip install ephemera
```

## Quick Start

```python
from ephemera import EphemeraClient

client = EphemeraClient(os.environ["EPHEMERA_API_KEY"])

# Create inbox
inbox = client.create_inbox()

# Wait for email and extract code
message = client.wait_for_email(inbox.id, subject="Verify")
code = client.extract_code(message)
```

## API Reference

### Constructor

```python
EphemeraClient(api_key: str, base_url: str = None, timeout: int = 30)
```

### Methods

| Method | Description |
|--------|-------------|
| `create_inbox(domain=None, expires_in=3600)` | Create inbox |
| `get_inbox(inbox_id)` | Get inbox details |
| `delete_inbox(inbox_id)` | Delete inbox |
| `get_messages(inbox_id, limit=20)` | List messages |
| `get_message(message_id)` | Get message details |
| `wait_for_email(inbox_id, subject=None, timeout=60)` | Poll for email |
| `extract_code(message)` | Extract OTP code |

### Webhook Verification

```python
from ephemera.webhook import SignatureVerifier

is_valid = SignatureVerifier.verify(
    payload=request.body,
    signature=request.headers["X-Ephemera-Signature"],
    secret=os.environ["WEBHOOK_SECRET"],
    timestamp=int(request.headers["X-Ephemera-Timestamp"])
)
```

### Context Manager

```python
with EphemeraClient(api_key) as client:
    inbox = client.create_inbox()
    # Auto-cleanup on exit
```
