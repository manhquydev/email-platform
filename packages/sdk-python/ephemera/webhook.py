"""Webhook verification utilities for Ephemera SDK."""

import hashlib
import hmac
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple, Union


@dataclass
class WebhookVerifyResult:
    """Result of webhook signature verification."""

    valid: bool
    error: Optional[str] = None


def verify_webhook(
    payload: Union[bytes, str],
    signature: str,
    secret: str,
    timestamp: int,
    tolerance_seconds: int = 300,
) -> WebhookVerifyResult:
    """
    Verify webhook signature from Ephemera.

    Args:
        payload: Raw request body (bytes or string).
        signature: Signature from X-Ephemera-Signature header.
        secret: Webhook secret from dashboard.
        timestamp: Timestamp from X-Ephemera-Timestamp header.
        tolerance_seconds: Max age of webhook in seconds (default: 300).

    Returns:
        WebhookVerifyResult with valid flag and optional error message.

    Example:
        result = verify_webhook(
            request.body,
            request.headers["X-Ephemera-Signature"],
            os.environ["WEBHOOK_SECRET"],
            int(request.headers["X-Ephemera-Timestamp"]),
        )
        if not result.valid:
            raise HTTPException(400, result.error)
    """
    # Validate timestamp to prevent replay attacks
    now = int(time.time())
    age = abs(now - timestamp)

    if age > tolerance_seconds:
        return WebhookVerifyResult(
            valid=False,
            error=f"Timestamp too old: {age}s > {tolerance_seconds}s tolerance",
        )

    # Ensure payload is string
    if isinstance(payload, bytes):
        payload = payload.decode("utf-8")

    # Compute expected signature
    signature_payload = f"{timestamp}.{payload}"
    expected = hmac.new(
        secret.encode("utf-8"),
        signature_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Extract hash from signature (remove 'sha256=' prefix if present)
    provided_hash = signature[7:] if signature.startswith("sha256=") else signature

    # Constant-time comparison to prevent timing attacks
    if not hmac.compare_digest(provided_hash, expected):
        return WebhookVerifyResult(valid=False, error="Invalid signature")

    return WebhookVerifyResult(valid=True)


def extract_webhook_headers(
    headers: Dict[str, Any]
) -> Optional[Tuple[str, int]]:
    """
    Extract webhook headers from request.

    Args:
        headers: Request headers dictionary.

    Returns:
        Tuple of (signature, timestamp) or None if headers missing.
    """
    # Try different header name formats
    signature = (
        headers.get("X-Ephemera-Signature")
        or headers.get("x-ephemera-signature")
        or headers.get("HTTP_X_EPHEMERA_SIGNATURE")
    )
    timestamp_str = (
        headers.get("X-Ephemera-Timestamp")
        or headers.get("x-ephemera-timestamp")
        or headers.get("HTTP_X_EPHEMERA_TIMESTAMP")
    )

    if not signature or not timestamp_str:
        return None

    try:
        timestamp = int(timestamp_str)
    except (ValueError, TypeError):
        return None

    return signature, timestamp


def parse_webhook(
    payload: Union[bytes, str],
    headers: Dict[str, Any],
    secret: str,
    tolerance_seconds: int = 300,
) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """
    Parse and verify a webhook request.

    Args:
        payload: Raw request body.
        headers: Request headers.
        secret: Webhook secret.
        tolerance_seconds: Max webhook age.

    Returns:
        Tuple of (success, parsed_data, error_message).

    Example:
        success, data, error = parse_webhook(request.body, request.headers, secret)
        if not success:
            return {"error": error}, 400
        handle_event(data["event"], data["data"])
    """
    import json

    webhook_headers = extract_webhook_headers(headers)
    if not webhook_headers:
        return False, None, "Missing webhook headers"

    signature, timestamp = webhook_headers

    result = verify_webhook(payload, signature, secret, timestamp, tolerance_seconds)
    if not result.valid:
        return False, None, result.error

    try:
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8")
        data = json.loads(payload)
        return True, data, None
    except json.JSONDecodeError:
        return False, None, "Invalid JSON payload"
