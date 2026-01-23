"""Ephemera Async Client - Async client for Ephemera API using httpx."""

import asyncio
import re
import time
from datetime import datetime, timedelta
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

import httpx

from ephemera.exceptions import (
    EphemeraError,
    NetworkError,
    TimeoutError,
    create_error_from_response,
)
from ephemera.models import Domain, Inbox, Message


class AsyncEphemeraClient:
    """
    Async client for interacting with the Ephemera API.

    Args:
        api_key: Your Ephemera API key.
        base_url: Base URL for the API.
        timeout: Request timeout in seconds.

    Example:
        async with AsyncEphemeraClient("your-api-key") as client:
            inbox = await client.create_inbox()
            message = await client.wait_for_email(inbox.id)
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.manhquy.click",
        timeout: float = 30.0,
    ):
        if not api_key:
            raise EphemeraError("API key is required", code="UNAUTHORIZED", status=401)

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "ephemera-python/1.0.0",
            },
        )

    async def __aenter__(self) -> "AsyncEphemeraClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()

    async def _request(
        self, method: str, path: str, body: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make an authenticated request to the API."""
        try:
            response = await self._client.request(method, path, json=body)
            data = response.json() if response.content else {}
            if not response.is_success:
                raise create_error_from_response(response.status_code, data)
            return data
        except httpx.TimeoutException:
            raise TimeoutError(f"Request timed out after {self.timeout}s")
        except httpx.RequestError as e:
            raise NetworkError(str(e))

    # Domain Methods
    async def list_domains(self) -> List[Domain]:
        """List available domains."""
        response = await self._request("GET", "/domains?limit=100")
        return [Domain.model_validate(d) for d in response.get("data", [])]

    async def get_domain(self, domain_id: str) -> Domain:
        """Get a specific domain by ID."""
        data = await self._request("GET", f"/domains/{domain_id}")
        return Domain.model_validate(data)

    # Inbox Methods
    async def create_inbox(
        self,
        local_part: Optional[str] = None,
        domain_id: Optional[str] = None,
        expires_in: Optional[int] = None,
    ) -> Inbox:
        """Create a new inbox."""
        body: Dict[str, Any] = {}
        if local_part:
            body["localPart"] = local_part
        if domain_id:
            body["domainId"] = domain_id
        if expires_in:
            expires_at = datetime.utcnow() + timedelta(milliseconds=expires_in)
            body["expiresAt"] = expires_at.isoformat() + "Z"
        data = await self._request("POST", "/inboxes", body)
        return Inbox.model_validate(data)

    async def get_inbox(self, inbox_id: str) -> Inbox:
        """Get an inbox by ID."""
        data = await self._request("GET", f"/inboxes/{inbox_id}")
        return Inbox.model_validate(data)

    async def list_inboxes(self, limit: int = 100) -> List[Inbox]:
        """List all inboxes for the authenticated user."""
        response = await self._request("GET", f"/inboxes?limit={limit}&personal=true")
        return [Inbox.model_validate(i) for i in response.get("data", [])]

    async def list_inboxes_iter(self, limit: int = 50) -> AsyncIterator[Inbox]:
        """Async iterator for paginated inbox listing."""
        cursor: Optional[str] = None
        while True:
            params = f"limit={limit}&personal=true"
            if cursor:
                params += f"&cursor={cursor}"
            response = await self._request("GET", f"/inboxes?{params}")
            for inbox_data in response.get("data", []):
                yield Inbox.model_validate(inbox_data)
            cursor = response.get("nextCursor")
            if not cursor:
                break

    async def delete_inbox(self, inbox_id: str) -> None:
        """Delete an inbox."""
        await self._request("DELETE", f"/inboxes/{inbox_id}")

    # Message Methods
    async def get_messages(self, inbox_id: str, limit: int = 50) -> List[Message]:
        """List messages in an inbox."""
        response = await self._request(
            "GET", f"/messages?inboxId={inbox_id}&limit={limit}"
        )
        return [Message.model_validate(m) for m in response.get("data", [])]

    async def get_messages_iter(
        self, inbox_id: str, limit: int = 50
    ) -> AsyncIterator[Message]:
        """Async iterator for paginated message listing."""
        cursor: Optional[str] = None
        while True:
            params = f"inboxId={inbox_id}&limit={limit}"
            if cursor:
                params += f"&cursor={cursor}"
            response = await self._request("GET", f"/messages?{params}")
            for msg_data in response.get("data", []):
                yield Message.model_validate(msg_data)
            cursor = response.get("nextCursor")
            if not cursor:
                break

    async def get_message(self, message_id: str) -> Message:
        """Get a specific message by ID."""
        data = await self._request("GET", f"/messages/{message_id}")
        return Message.model_validate(data)

    async def delete_message(self, message_id: str) -> None:
        """Delete a message."""
        await self._request("DELETE", f"/messages/{message_id}")

    # Convenience Methods
    async def wait_for_email(
        self,
        inbox_id: str,
        subject: Optional[str] = None,
        from_address: Optional[str] = None,
        timeout: float = 60.0,
        interval: float = 2.0,
    ) -> Message:
        """Wait for an email to arrive in an inbox."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            messages = await self.get_messages(inbox_id, limit=20)
            for msg in messages:
                matches_subject = not subject or (
                    subject.lower() in msg.subject.lower()
                )
                matches_from = not from_address or (
                    msg.from_address
                    and from_address.lower() in msg.from_address.lower()
                )
                if matches_subject and matches_from:
                    return msg
            await asyncio.sleep(interval)
        raise TimeoutError(f"No matching email found within {timeout}s")

    def extract_code(self, message: Message) -> Optional[str]:
        """Extract OTP/verification code from email body."""
        text = message.text_body or message.html_body or ""
        patterns = [r"\b(\d{6})\b", r"\b(\d{4})\b", r"code[:\s]+(\d{4,8})"]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    async def create_inbox_and_wait(
        self,
        subject: Optional[str] = None,
        timeout: float = 60.0,
    ) -> Tuple[Inbox, Message]:
        """Create an inbox and wait for an email."""
        inbox = await self.create_inbox()
        message = await self.wait_for_email(inbox.id, subject=subject, timeout=timeout)
        return inbox, message
