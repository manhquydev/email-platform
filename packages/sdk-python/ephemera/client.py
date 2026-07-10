"""Ephemera SDK Client - Main client for interacting with the Ephemera API."""

import re
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import httpx

from ephemera.exceptions import (
    EphemeraError,
    NetworkError,
    TimeoutError,
    create_error_from_response,
)
from ephemera.models import Domain, Inbox, Message


class EphemeraClient:
    """
    Client for interacting with the Ephemera API.

    Args:
        api_key: Your Ephemera API key.
        base_url: Base URL for the API.
        timeout: Request timeout in seconds.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.manhquy.id.vn",
        timeout: float = 30.0,
    ):
        if not api_key:
            raise EphemeraError("API key is required", code="UNAUTHORIZED", status=401)

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "ephemera-python/1.0.0",
            },
        )

    def __enter__(self) -> "EphemeraClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    def _request(self, method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make an authenticated request to the API."""
        try:
            response = self._client.request(method, path, json=body)
            data = response.json() if response.content else {}
            if not response.is_success:
                raise create_error_from_response(response.status_code, data)
            return data
        except httpx.TimeoutException:
            raise TimeoutError(f"Request timed out after {self.timeout}s")
        except httpx.RequestError as e:
            raise NetworkError(str(e))

    # Domain Methods
    def list_domains(self) -> List[Domain]:
        """List available domains."""
        response = self._request("GET", "/domains?limit=100")
        return [Domain.model_validate(d) for d in response.get("data", [])]

    def get_domain(self, domain_id: str) -> Domain:
        """Get a specific domain by ID."""
        return Domain.model_validate(self._request("GET", f"/domains/{domain_id}"))

    # Inbox Methods
    def create_inbox(
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
        return Inbox.model_validate(self._request("POST", "/inboxes", body))

    def get_inbox(self, inbox_id: str) -> Inbox:
        """Get an inbox by ID."""
        return Inbox.model_validate(self._request("GET", f"/inboxes/{inbox_id}"))

    def list_inboxes(self, limit: int = 100) -> List[Inbox]:
        """List all inboxes for the authenticated user."""
        response = self._request("GET", f"/inboxes?limit={limit}&personal=true")
        return [Inbox.model_validate(i) for i in response.get("data", [])]

    def delete_inbox(self, inbox_id: str) -> None:
        """Delete an inbox."""
        self._request("DELETE", f"/inboxes/{inbox_id}")

    # Message Methods
    def get_messages(self, inbox_id: str, limit: int = 50) -> List[Message]:
        """List messages in an inbox."""
        response = self._request("GET", f"/messages?inboxId={inbox_id}&limit={limit}")
        return [Message.model_validate(m) for m in response.get("data", [])]

    def get_message(self, message_id: str) -> Message:
        """Get a specific message by ID."""
        return Message.model_validate(self._request("GET", f"/messages/{message_id}"))

    def delete_message(self, message_id: str) -> None:
        """Delete a message."""
        self._request("DELETE", f"/messages/{message_id}")

    # Convenience Methods
    def wait_for_email(
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
            messages = self.get_messages(inbox_id, limit=20)
            for msg in messages:
                matches_subject = not subject or (subject.lower() in msg.subject.lower())
                matches_from = not from_address or (
                    msg.from_address and from_address.lower() in msg.from_address.lower()
                )
                if matches_subject and matches_from:
                    return msg
            time.sleep(interval)
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

    def create_inbox_and_wait(
        self,
        subject: Optional[str] = None,
        timeout: float = 60.0,
    ) -> Tuple[Inbox, Message]:
        """Create an inbox and wait for an email."""
        inbox = self.create_inbox()
        message = self.wait_for_email(inbox.id, subject=subject, timeout=timeout)
        return inbox, message
