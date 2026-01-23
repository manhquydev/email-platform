---
sidebar_position: 4
---

# Pytest Example

Python testing with pytest and Ephemera.

## Setup

```bash
pip install pytest ephemera selenium
```

## Fixtures

```python
# conftest.py
import os
import pytest
from ephemera import EphemeraClient

@pytest.fixture(scope="session")
def ephemera():
    """Shared Ephemera client for all tests."""
    return EphemeraClient(os.environ["EPHEMERA_API_KEY"])

@pytest.fixture
def inbox(ephemera):
    """Create inbox for each test, cleanup after."""
    inbox = ephemera.create_inbox()
    yield inbox
    ephemera.delete_inbox(inbox.id)
```

## Test Examples

```python
# test_email_flows.py
import re

def test_signup_sends_verification_email(ephemera, inbox, client):
    """Test that signup triggers verification email."""
    response = client.post("/api/signup", json={
        "email": inbox.address,
        "password": "SecurePass123!"
    })
    assert response.status_code == 201

    message = ephemera.wait_for_email(inbox.id, subject="Verify")
    assert "verification" in message.text_body.lower()

def test_extract_otp_code(ephemera, inbox, client):
    """Test OTP extraction from verification email."""
    client.post("/api/signup", json={
        "email": inbox.address,
        "password": "SecurePass123!"
    })

    message = ephemera.wait_for_email(inbox.id, subject="Verify")
    code = ephemera.extract_code(message)

    assert code is not None
    assert len(code) == 6
    assert code.isdigit()

def test_password_reset_flow(ephemera, inbox, client):
    """Test complete password reset flow."""
    # Request reset
    client.post("/api/forgot-password", json={"email": inbox.address})

    # Get reset email
    message = ephemera.wait_for_email(inbox.id, subject="Reset")

    # Extract reset token from link
    match = re.search(r'token=([a-zA-Z0-9]+)', message.text_body)
    assert match
    token = match.group(1)

    # Use token to reset password
    response = client.post("/api/reset-password", json={
        "token": token,
        "password": "NewSecurePass456!"
    })
    assert response.status_code == 200
```

## Running Tests

```bash
EPHEMERA_API_KEY=eph_live_xxx pytest tests/ -v
```
