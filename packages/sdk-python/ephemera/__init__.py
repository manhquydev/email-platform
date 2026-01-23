"""
Ephemera Python SDK - Official SDK for Ephemera temporary email platform.

Example (sync):
    >>> from ephemera import EphemeraClient
    >>> client = EphemeraClient("your-api-key")
    >>> inbox = client.create_inbox()
    >>> message = client.wait_for_email(inbox.id, subject="Verification")
    >>> code = client.extract_code(message)

Example (async):
    >>> from ephemera import AsyncEphemeraClient
    >>> async with AsyncEphemeraClient("your-api-key") as client:
    ...     inbox = await client.create_inbox()
    ...     message = await client.wait_for_email(inbox.id)
"""

from ephemera.client import EphemeraClient
from ephemera.async_client import AsyncEphemeraClient
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
from ephemera.webhook import verify_webhook, extract_webhook_headers, parse_webhook
from ephemera.pagination import PaginatedIterator, AsyncPaginatedIterator, collect_all, collect_all_async
from ephemera.rate_limit import RateLimitInfo, RateLimitTracker, parse_rate_limit_headers

__version__ = "1.0.0"
__all__ = [
    # Clients
    "EphemeraClient",
    "AsyncEphemeraClient",
    # Models
    "Domain",
    "Inbox",
    "Message",
    "Attachment",
    # Exceptions
    "EphemeraError",
    "UnauthorizedError",
    "ForbiddenError",
    "NotFoundError",
    "RateLimitedError",
    "ValidationError",
    "QuotaExceededError",
    "NetworkError",
    "TimeoutError",
    # Webhook
    "verify_webhook",
    "extract_webhook_headers",
    "parse_webhook",
    # Pagination
    "PaginatedIterator",
    "AsyncPaginatedIterator",
    "collect_all",
    "collect_all_async",
    # Rate limit
    "RateLimitInfo",
    "RateLimitTracker",
    "parse_rate_limit_headers",
]
