"""
Ephemera Python SDK - Official SDK for Ephemera temporary email platform.

Example:
    >>> from ephemera import EphemeraClient
    >>> client = EphemeraClient("your-api-key")
    >>> inbox = client.create_inbox()
    >>> message = client.wait_for_email(inbox.id, subject="Verification")
    >>> code = client.extract_code(message)
"""

from ephemera.client import EphemeraClient
from ephemera.models import Domain, Inbox, Message, Attachment
from ephemera.exceptions import (
    EphemeraError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    RateLimitedError,
    ValidationError,
    QuotaExceededError,
    NetworkError,
    TimeoutError,
)

__version__ = "1.0.0"
__all__ = [
    "EphemeraClient",
    "Domain",
    "Inbox",
    "Message",
    "Attachment",
    "EphemeraError",
    "UnauthorizedError",
    "ForbiddenError",
    "NotFoundError",
    "RateLimitedError",
    "ValidationError",
    "QuotaExceededError",
    "NetworkError",
    "TimeoutError",
]
