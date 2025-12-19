import os
import json
import time
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple, Union
from urllib.parse import urljoin, urlencode

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .types import (
    Config,
    User,
    Domain,
    Inbox,
    Message,
    Attachment,
    ApiKey,
    Webhook,
    CreateInboxOptions,
    FilterRule,
    CreateFilterRuleOptions,
    ListOptions,
    PaginationMeta,
    UsageStats,
    QuotaLimits,
    ErrorResponse,
)


class TempMailProError(Exception):
    """Custom exception for TempMailPro API errors"""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class TempMailPro:
    """TempMail Pro API Client"""

    def __init__(self, config: Optional[Config] = None):
        """Initialize the TempMailPro client

        Args:
            config: Configuration object. If not provided, will use environment variables.
        """
        if config is None:
            config = Config(
                api_key=os.getenv("TEMPMAILPRO_API_KEY", ""),
                base_url=os.getenv("TEMPMAILPRO_BASE_URL", "https://api.tempmail.pro/v1"),
                timeout=int(os.getenv("TEMPMAILPRO_TIMEOUT", "30")),
                retries=int(os.getenv("TEMPMAILPRO_RETRIES", "3"))
            )

        if not config.api_key:
            raise ValueError("API key is required. Set it in config or TEMPMAILPRO_API_KEY environment variable")

        self.config = config
        self.session = requests.Session()

        # Configure retries
        retry_strategy = Retry(
            total=config.retries,
            backoff_factor=1,
            status_forcelist=[500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # Set default headers
        self.session.headers.update({
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json",
            "User-Agent": f"tempmailpro-python-sdk/1.0.0",
        })

    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        binary_data: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to the API

        Args:
            method: HTTP method
            endpoint: API endpoint
            params: Query parameters
            data: Request body data
            binary_data: Binary data for file downloads

        Returns:
            Response data

        Raises:
            TempMailProError: If API returns an error
        """
        url = urljoin(self.config.base_url, endpoint)

        try:
            if binary_data is not None:
                # Handle binary data response
                response = self.session.request(
                    method,
                    url,
                    params=params,
                    timeout=self.config.timeout
                )
                if response.status_code != 200:
                    self._handle_error(response)
                return {"data": binary_data, "headers": dict(response.headers)}

            response = self.session.request(
                method,
                url,
                params=params,
                json=data,
                timeout=self.config.timeout
            )

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                self._handle_error(e.response)
            raise TempMailProError(f"Network error: {str(e)}")

    def _handle_error(self, response: requests.Response) -> None:
        """Handle API error response

        Args:
            response: HTTP response object

        Raises:
            TempMailProError: With error details from response
        """
        try:
            error_data = response.json()
            error_msg = error_data.get("error") or error_data.get("message") or "API request failed"
        except (ValueError, json.JSONDecodeError):
            error_msg = f"API request failed with status {response.status_code}"

        raise TempMailProError(error_msg, response.status_code)

    def _parse_datetime(self, dt_str: Optional[str]) -> Optional[datetime]:
        """Parse datetime string from API response"""
        if not dt_str:
            return None
        try:
            return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None

    # User operations
    def get_current_user(self) -> User:
        """Get current user information"""
        response = self._make_request("GET", "/auth/me")
        data = response["data"]
        return User(
            id=data["id"],
            email=data["email"],
            role=data["role"],
            email_verified=self._parse_datetime(data["emailVerified"]),
            created_at=self._parse_datetime(data["createdAt"]),
            updated_at=self._parse_datetime(data["updatedAt"])
        )

    # Domain operations
    def list_domains(self, options: Optional[ListOptions] = None) -> Tuple[List[Domain], PaginationMeta]:
        """List domains"""
        params = options.__dict__ if options else {}
        response = self._make_request("GET", "/domains", params=params)

        domains = []
        for item in response["data"]:
            domains.append(Domain(
                id=item["id"],
                name=item["name"],
                status=item["status"],
                verification_token=item.get("verificationToken"),
                is_public=item.get("isPublic", False),
                owner_id=item.get("ownerId"),
                organization_id=item.get("organizationId"),
                created_at=self._parse_datetime(item.get("createdAt")),
                updated_at=self._parse_datetime(item.get("updatedAt"))
            ))

        meta = PaginationMeta(
            total=response["meta"]["total"],
            limit=response["meta"]["limit"],
            offset=response["meta"]["offset"],
            has_next=response["meta"].get("hasNext"),
            has_prev=response["meta"].get("hasPrev")
        )

        return domains, meta

    def get_domain(self, domain_id: str) -> Domain:
        """Get domain by ID"""
        response = self._make_request("GET", f"/domains/{domain_id}")
        data = response["data"]
        return Domain(
            id=data["id"],
            name=data["name"],
            status=data["status"],
            verification_token=data.get("verificationToken"),
            is_public=data.get("isPublic", False),
            owner_id=data.get("ownerId"),
            organization_id=data.get("organizationId"),
            created_at=self._parse_datetime(data.get("createdAt")),
            updated_at=self._parse_datetime(data.get("updatedAt"))
        )

    def create_domain(self, name: str, organization_id: Optional[str] = None) -> Domain:
        """Create a new domain"""
        data = {"name": name}
        if organization_id:
            data["organizationId"] = organization_id

        response = self._make_request("POST", "/domains", data=data)
        data = response["domain"]
        return Domain(
            id=data["id"],
            name=data["name"],
            status=data["status"],
            verification_token=data.get("verificationToken"),
            is_public=data.get("isPublic", False),
            owner_id=data.get("ownerId"),
            organization_id=data.get("organizationId"),
            created_at=self._parse_datetime(data.get("createdAt")),
            updated_at=self._parse_datetime(data.get("updatedAt"))
        )

    def verify_domain(self, domain_id: str, token: str) -> Domain:
        """Verify domain ownership"""
        response = self._make_request("POST", f"/domains/{domain_id}/verify", data={"token": token})
        data = response["domain"]
        return Domain(
            id=data["id"],
            name=data["name"],
            status=data["status"],
            verification_token=data.get("verificationToken"),
            is_public=data.get("isPublic", False),
            owner_id=data.get("ownerId"),
            organization_id=data.get("organizationId"),
            created_at=self._parse_datetime(data.get("createdAt")),
            updated_at=self._parse_datetime(data.get("updatedAt"))
        )

    def delete_domain(self, domain_id: str) -> None:
        """Delete a domain"""
        self._make_request("DELETE", f"/domains/{domain_id}")

    # Inbox operations
    def list_inboxes(self, options: Optional[ListOptions] = None) -> Tuple[List[Inbox], PaginationMeta]:
        """List inboxes"""
        params = options.__dict__ if options else {}
        response = self._make_request("GET", "/inboxes", params=params)

        inboxes = []
        for item in response["data"]:
            inboxes.append(Inbox(
                id=item["id"],
                address=item["address"],
                domain_id=item["domainId"],
                is_active=item.get("isActive", True),
                auto_delete=item.get("autoDelete"),
                auto_delete_hours=item.get("autoDeleteHours"),
                description=item.get("description"),
                created_at=self._parse_datetime(item.get("createdAt")),
                updated_at=self._parse_datetime(item.get("updatedAt"))
            ))

        meta = PaginationMeta(
            total=response["meta"]["total"],
            limit=response["meta"]["limit"],
            offset=response["meta"]["offset"],
            has_next=response["meta"].get("hasNext"),
            has_prev=response["meta"].get("hasPrev")
        )

        return inboxes, meta

    def get_inbox(self, inbox_id: str) -> Inbox:
        """Get inbox by ID"""
        response = self._make_request("GET", f"/inboxes/{inbox_id}")
        data = response["data"]
        return Inbox(
            id=data["id"],
            address=data["address"],
            domain_id=data["domainId"],
            is_active=data.get("isActive", True),
            auto_delete=data.get("autoDelete"),
            auto_delete_hours=data.get("autoDeleteHours"),
            description=data.get("description"),
            created_at=self._parse_datetime(data.get("createdAt")),
            updated_at=self._parse_datetime(data.get("updatedAt"))
        )

    def create_inbox(self, options: Optional[CreateInboxOptions] = None) -> Inbox:
        """Create a new inbox"""
        data = {}
        if options:
            data = {
                "domain": options.domain,
                "description": options.description,
                "autoDelete": options.auto_delete,
                "autoDeleteHours": options.auto_delete_hours,
                "expiresAt": options.expires_at.isoformat() if options.expires_at else None
            }
            # Remove None values
            data = {k: v for k, v in data.items() if v is not None}

        response = self._make_request("POST", "/inboxes", data=data)
        data = response["data"]
        return Inbox(
            id=data["id"],
            address=data["address"],
            domain_id=data["domainId"],
            is_active=data.get("isActive", True),
            auto_delete=data.get("autoDelete"),
            auto_delete_hours=data.get("autoDeleteHours"),
            description=data.get("description"),
            created_at=self._parse_datetime(data.get("createdAt")),
            updated_at=self._parse_datetime(data.get("updatedAt"))
        )

    def delete_inbox(self, inbox_id: str) -> None:
        """Delete an inbox"""
        self._make_request("DELETE", f"/inboxes/{inbox_id}")

    # Message operations
    def list_messages(self, inbox_id: str, options: Optional[ListOptions] = None) -> Tuple[List[Message], PaginationMeta]:
        """List messages in an inbox"""
        params = options.__dict__ if options else {}
        response = self._make_request("GET", f"/inboxes/{inbox_id}/messages", params=params)

        messages = []
        for item in response["data"]:
            messages.append(Message(
                id=item["id"],
                inbox_id=item["inboxId"],
                from_address=item["fromAddress"],
                to_address=item["toAddress"],
                subject=item.get("subject"),
                text_content=item.get("textContent"),
                html_content=item.get("htmlContent"),
                attachments=item.get("attachments", 0),
                read=item.get("read", False),
                received_at=self._parse_datetime(item.get("receivedAt"))
            ))

        meta = PaginationMeta(
            total=response["meta"]["total"],
            limit=response["meta"]["limit"],
            offset=response["meta"]["offset"],
            has_next=response["meta"].get("hasNext"),
            has_prev=response["meta"].get("hasPrev")
        )

        return messages, meta

    def get_message(self, message_id: str) -> Message:
        """Get message by ID"""
        response = self._make_request("GET", f"/messages/{message_id}")
        data = response["data"]
        return Message(
            id=data["id"],
            inbox_id=data["inboxId"],
            from_address=data["fromAddress"],
            to_address=data["toAddress"],
            subject=data.get("subject"),
            text_content=data.get("textContent"),
            html_content=data.get("htmlContent"),
            attachments=data.get("attachments", 0),
            read=data.get("read", False),
            received_at=self._parse_datetime(data.get("receivedAt"))
        )

    def mark_message_as_read(self, message_id: str) -> None:
        """Mark message as read"""
        self._make_request("PATCH", f"/messages/{message_id}", data={"read": True})

    def delete_message(self, message_id: str) -> None:
        """Delete a message"""
        self._make_request("DELETE", f"/messages/{message_id}")

    # Attachment operations
    def list_attachments(self, message_id: str) -> List[Attachment]:
        """List message attachments"""
        response = self._make_request("GET", f"/messages/{message_id}/attachments")

        attachments = []
        for item in response["data"]:
            attachments.append(Attachment(
                id=item["id"],
                message_id=item["messageId"],
                filename=item["filename"],
                content_type=item["contentType"],
                size=item["size"],
                url=item.get("url")
            ))

        return attachments

    def get_attachment(self, attachment_id: str) -> Dict[str, str]:
        """Get attachment URL and filename"""
        response = self._make_request("GET", f"/attachments/{attachment_id}")
        return {
            "url": response["url"],
            "filename": response["filename"]
        }

    def download_attachment(self, attachment_id: str) -> bytes:
        """Download attachment content"""
        response = self._make_request("GET", f"/attachments/{attachment_id}/download", binary_data=None)
        return response["data"]

    # Filter rules
    def list_filter_rules(self, inbox_id: Optional[str] = None, options: Optional[ListOptions] = None) -> List[FilterRule]:
        """List filter rules"""
        params = options.__dict__ if options else {}
        url = f"/inboxes/{inbox_id}/rules" if inbox_id else "/rules"
        response = self._make_request("GET", url, params=params)

        rules = []
        for item in response["data"]:
            rules.append(FilterRule(
                id=item["id"],
                name=item["name"],
                type=item["type"],
                field=item["field"],
                pattern=item["pattern"],
                is_active=item.get("isActive", True),
                priority=item.get("priority", 0)
            ))

        return rules

    def create_filter_rule(self, options: CreateFilterRuleOptions) -> FilterRule:
        """Create a new filter rule"""
        data = {
            "name": options.name,
            "type": options.type,
            "field": options.field,
            "pattern": options.pattern,
            "priority": options.priority,
            "isActive": options.is_active
        }

        response = self._make_request("POST", "/rules", data=data)
        item = response["data"]
        return FilterRule(
            id=item["id"],
            name=item["name"],
            type=item["type"],
            field=item["field"],
            pattern=item["pattern"],
            is_active=item.get("isActive", True),
            priority=item.get("priority", 0)
        )

    def update_filter_rule(self, rule_id: str, options: Dict[str, Any]) -> FilterRule:
        """Update a filter rule"""
        response = self._make_request("PATCH", f"/rules/{rule_id}", data=options)
        item = response["data"]
        return FilterRule(
            id=item["id"],
            name=item["name"],
            type=item["type"],
            field=item["field"],
            pattern=item["pattern"],
            is_active=item.get("isActive", True),
            priority=item.get("priority", 0)
        )

    def delete_filter_rule(self, rule_id: str) -> None:
        """Delete a filter rule"""
        self._make_request("DELETE", f"/rules/{rule_id}")

    # API Key operations
    def list_api_keys(self, organization_id: Optional[str] = None) -> List[ApiKey]:
        """List API keys"""
        params = {"organizationId": organization_id} if organization_id else {}
        response = self._make_request("GET", "/api-keys", params=params)

        keys = []
        for item in response["data"]:
            keys.append(ApiKey(
                id=item["id"],
                name=item["name"],
                key_prefix=item["keyPrefix"],
                key_last_four=item["keyLastFour"],
                permissions=item.get("permissions", []),
                status=item.get("status", "ACTIVE"),
                rate_limit=item.get("rateLimit"),
                usage_count=item.get("usageCount", 0),
                last_used_at=self._parse_datetime(item.get("lastUsedAt")),
                created_at=self._parse_datetime(item.get("createdAt"))
            ))

        return keys

    def create_api_key(
        self,
        name: str,
        permissions: Optional[List[str]] = None,
        organization_id: Optional[str] = None,
        rate_limit: Optional[int] = None,
        expires_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Create a new API key"""
        data = {"name": name}
        if permissions:
            data["permissions"] = permissions
        if organization_id:
            data["organizationId"] = organization_id
        if rate_limit:
            data["rateLimit"] = rate_limit
        if expires_at:
            data["expiresAt"] = expires_at.isoformat()

        response = self._make_request("POST", "/api-keys", data=data)
        return {
            "api_key": response["apiKey"],
            "key": response["key"]
        }

    def delete_api_key(self, key_id: str) -> None:
        """Delete an API key"""
        self._make_request("DELETE", f"/api-keys/{key_id}")

    # Webhook operations
    def list_webhooks(self, organization_id: Optional[str] = None) -> List[Webhook]:
        """List webhooks"""
        params = {"organizationId": organization_id} if organization_id else {}
        response = self._make_request("GET", "/webhooks", params=params)

        webhooks = []
        for item in response["data"]:
            webhooks.append(Webhook(
                id=item["id"],
                name=item["name"],
                url=item["url"],
                events=item.get("events", []),
                status=item.get("status", "ACTIVE"),
                timeout=item.get("timeout"),
                retry_attempts=item.get("retryAttempts"),
                created_at=self._parse_datetime(item.get("createdAt"))
            ))

        return webhooks

    def create_webhook(
        self,
        name: str,
        url: str,
        events: List[str],
        organization_id: Optional[str] = None,
        secret: Optional[str] = None,
        timeout: Optional[int] = None,
        retry_attempts: Optional[int] = None
    ) -> Dict[str, Any]:
        """Create a new webhook"""
        data = {"name": name, "url": url, "events": events}
        if organization_id:
            data["organizationId"] = organization_id
        if secret:
            data["secret"] = secret
        if timeout:
            data["timeout"] = timeout
        if retry_attempts:
            data["retryAttempts"] = retry_attempts

        response = self._make_request("POST", "/webhooks", data=data)
        return {
            "webhook": response["webhook"],
            "secret": response.get("secret")
        }

    def delete_webhook(self, webhook_id: str) -> None:
        """Delete a webhook"""
        self._make_request("DELETE", f"/webhooks/{webhook_id}")

    # Usage and quota
    def get_usage(self, organization_id: Optional[str] = None) -> UsageStats:
        """Get usage statistics"""
        url = f"/organizations/{organization_id}/usage" if organization_id else "/usage"
        response = self._make_request("GET", url)
        data = response["data"]
        return UsageStats(
            domains=data.get("domains", 0),
            inboxes=data.get("inboxes", 0),
            members=data.get("members", 0),
            api_keys=data.get("apiKeys", 0),
            webhooks=data.get("webhooks", 0),
            emails_this_month=data.get("emailsThisMonth", 0),
            storage_mb=data.get("storageMB", 0)
        )

    def get_quota_limits(self, organization_id: Optional[str] = None) -> QuotaLimits:
        """Get quota limits"""
        url = f"/organizations/{organization_id}/quota" if organization_id else "/quota"
        response = self._make_request("GET", url)
        data = response["data"]
        return QuotaLimits(
            domains=data.get("domains"),
            inboxes=data.get("inboxes"),
            members=data.get("members"),
            api_keys=data.get("apiKeys"),
            webhooks=data.get("webhooks"),
            emails_per_month=data.get("emailsPerMonth"),
            storage_mb=data.get("storageMB"),
            api_calls_per_minute=data.get("apiCallsPerMinute"),
            attachments_per_email=data.get("attachmentsPerEmail"),
            email_size_kb=data.get("emailSizeKB")
        )

    # Utility methods
    def test_webhook(self, webhook_id: str, event_type: str, test_payload: Optional[Dict[str, Any]] = None) -> None:
        """Test webhook"""
        data = {"eventType": event_type}
        if test_payload:
            data["testPayload"] = test_payload
        self._make_request("POST", f"/webhooks/{webhook_id}/test", data=data)

    def generate_random_address(self, domain: Optional[str] = None) -> str:
        """Generate a random email address"""
        import random
        random_str = uuid.uuid4().hex[:8]
        return f"{random_str}@{domain}" if domain else f"{random_str}@tempmail.pro"