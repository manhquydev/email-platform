"""Rate limit handling utilities for Ephemera SDK."""

import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional


@dataclass
class RateLimitInfo:
    """Rate limit information from response headers."""

    limit: int
    remaining: int
    reset: int
    retry_after: Optional[int] = None


def parse_rate_limit_headers(headers: Dict[str, Any]) -> Optional[RateLimitInfo]:
    """
    Parse rate limit headers from API response.

    Args:
        headers: Response headers dictionary.

    Returns:
        RateLimitInfo or None if headers not present.
    """
    limit = headers.get("X-RateLimit-Limit") or headers.get("x-ratelimit-limit")
    remaining = headers.get("X-RateLimit-Remaining") or headers.get("x-ratelimit-remaining")
    reset = headers.get("X-RateLimit-Reset") or headers.get("x-ratelimit-reset")

    if not all([limit, remaining, reset]):
        return None

    try:
        info = RateLimitInfo(
            limit=int(limit),
            remaining=int(remaining),
            reset=int(reset),
        )

        retry_after = headers.get("Retry-After") or headers.get("retry-after")
        if retry_after:
            info.retry_after = int(retry_after)

        return info
    except (ValueError, TypeError):
        return None


def calculate_rate_limit_delay(info: RateLimitInfo) -> float:
    """
    Calculate delay based on rate limit info.

    Returns:
        Seconds to wait before next request.
    """
    if info.retry_after:
        return float(info.retry_after)

    if info.remaining <= 0:
        now = int(time.time())
        return max(0.0, float(info.reset - now))

    return 0.0


def is_rate_limit_warning(info: RateLimitInfo, threshold: float = 0.1) -> bool:
    """
    Check if rate limit threshold is approaching.

    Args:
        info: Rate limit info.
        threshold: Warning threshold (0-1, default 0.1 = 10% remaining).

    Returns:
        True if remaining requests are below threshold.
    """
    return info.remaining / info.limit <= threshold


class RateLimitTracker:
    """
    Track rate limits across requests.

    Example:
        tracker = RateLimitTracker()
        tracker.on_rate_limit(lambda e: print(f"Rate limit: {e}"))

        # After each request
        tracker.update(response.headers, "/inboxes")

        # Before next request
        delay = tracker.get_required_delay()
        if delay > 0:
            time.sleep(delay)
    """

    def __init__(self) -> None:
        self._last_info: Optional[RateLimitInfo] = None
        self._handlers: List[Callable[[Dict[str, Any]], None]] = []

    def on_rate_limit(
        self, handler: Callable[[Dict[str, Any]], None]
    ) -> Callable[[], None]:
        """Add a rate limit event handler. Returns unsubscribe function."""
        self._handlers.append(handler)
        return lambda: self._handlers.remove(handler) if handler in self._handlers else None

    def update(self, headers: Dict[str, Any], endpoint: str) -> None:
        """Update rate limit info from response headers."""
        info = parse_rate_limit_headers(headers)
        if not info:
            return

        self._last_info = info

        if info.remaining <= 0:
            self._emit({"type": "exceeded", "info": info, "endpoint": endpoint})
        elif is_rate_limit_warning(info):
            self._emit({"type": "warning", "info": info, "endpoint": endpoint})

    def get_info(self) -> Optional[RateLimitInfo]:
        """Get current rate limit info."""
        return self._last_info

    def get_required_delay(self) -> float:
        """Get required delay before next request in seconds."""
        if not self._last_info:
            return 0.0
        return calculate_rate_limit_delay(self._last_info)

    def _emit(self, event: Dict[str, Any]) -> None:
        for handler in self._handlers:
            try:
                handler(event)
            except Exception:
                pass  # Ignore handler errors
