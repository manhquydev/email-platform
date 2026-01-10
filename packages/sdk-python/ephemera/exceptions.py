"""
Ephemera SDK Exceptions

Error classes with codes for programmatic handling.
"""

from typing import Any, Dict, Optional


class EphemeraError(Exception):
    """Base exception for all Ephemera SDK errors."""

    def __init__(
        self,
        message: str,
        code: str = "UNKNOWN",
        status: int = 0,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status
        self.details = details or {}

    def __str__(self) -> str:
        return f"[{self.code}] {self.message}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "message": self.message,
            "code": self.code,
            "status": self.status,
            "details": self.details,
        }


class UnauthorizedError(EphemeraError):
    """Raised when API key is invalid or missing."""

    def __init__(self, message: str = "Invalid or missing API key"):
        super().__init__(message, code="UNAUTHORIZED", status=401)


class ForbiddenError(EphemeraError):
    """Raised when the action is not permitted."""

    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(message, code="FORBIDDEN", status=403)


class NotFoundError(EphemeraError):
    """Raised when a resource is not found."""

    def __init__(self, resource: str, resource_id: Optional[str] = None):
        message = f"{resource} with id '{resource_id}' not found" if resource_id else f"{resource} not found"
        super().__init__(message, code="NOT_FOUND", status=404)


class RateLimitedError(EphemeraError):
    """Raised when rate limit is exceeded."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        super().__init__(message, code="RATE_LIMITED", status=429, details={"retry_after": retry_after})
        self.retry_after = retry_after


class ValidationError(EphemeraError):
    """Raised when request validation fails."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, code="VALIDATION_ERROR", status=400, details=details)


class QuotaExceededError(EphemeraError):
    """Raised when a quota limit is exceeded."""

    def __init__(self, resource: str):
        super().__init__(f"Quota exceeded for {resource}", code="QUOTA_EXCEEDED", status=402)


class NetworkError(EphemeraError):
    """Raised when a network request fails."""

    def __init__(self, message: str = "Network request failed"):
        super().__init__(message, code="NETWORK_ERROR", status=0)


class TimeoutError(EphemeraError):
    """Raised when a request times out."""

    def __init__(self, message: str = "Request timed out"):
        super().__init__(message, code="TIMEOUT", status=0)


def create_error_from_response(status: int, body: Dict[str, Any]) -> EphemeraError:
    """Create an appropriate error from an API response."""
    message = body.get("error", "Unknown error")

    if status == 401:
        return UnauthorizedError(message)
    elif status == 403:
        return ForbiddenError(message)
    elif status == 404:
        return NotFoundError("Resource")
    elif status == 429:
        return RateLimitedError(message)
    elif status == 400:
        return ValidationError(message, body)
    elif status == 402:
        return QuotaExceededError("resource")
    else:
        return EphemeraError(message, code="UNKNOWN", status=status, details=body)
