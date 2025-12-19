from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal


@dataclass
class Config:
    """Configuration for TempMailPro client"""
    api_key: str = ""
    base_url: str = "https://api.tempmail.pro/v1"
    timeout: int = 30
    retries: int = 3


@dataclass
class User:
    """User object"""
    id: str
    email: str
    role: str
    email_verified: datetime
    created_at: datetime
    updated_at: datetime


@dataclass
class Domain:
    """Domain object"""
    id: str
    name: str
    status: Literal["PENDING", "VERIFIED", "FAILED"]
    verification_token: Optional[str] = None
    is_public: bool = False
    owner_id: Optional[str] = None
    organization_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Inbox:
    """Inbox object"""
    id: str
    address: str
    domain_id: str
    is_active: bool = True
    auto_delete: Optional[bool] = None
    auto_delete_hours: Optional[int] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Message:
    """Message object"""
    id: str
    inbox_id: str
    from_address: str
    to_address: str
    subject: Optional[str] = None
    text_content: Optional[str] = None
    html_content: Optional[str] = None
    attachments: int = 0
    read: bool = False
    received_at: Optional[datetime] = None


@dataclass
class Attachment:
    """Attachment object"""
    id: str
    message_id: str
    filename: str
    content_type: str
    size: int
    url: Optional[str] = None


@dataclass
class ApiKey:
    """API Key object"""
    id: str
    name: str
    key_prefix: str
    key_last_four: str
    permissions: List[str] = field(default_factory=list)
    status: Literal["ACTIVE", "INACTIVE", "REVOKED"] = "ACTIVE"
    rate_limit: Optional[int] = None
    usage_count: int = 0
    last_used_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


@dataclass
class Webhook:
    """Webhook object"""
    id: str
    name: str
    url: str
    events: List[str] = field(default_factory=list)
    status: Literal["ACTIVE", "INACTIVE", "FAILED"] = "ACTIVE"
    timeout: Optional[int] = None
    retry_attempts: Optional[int] = None
    created_at: Optional[datetime] = None


@dataclass
class CreateInboxOptions:
    """Options for creating an inbox"""
    domain: Optional[str] = None
    description: Optional[str] = None
    auto_delete: Optional[bool] = None
    auto_delete_hours: Optional[int] = None
    expires_at: Optional[datetime] = None


@dataclass
class FilterRule:
    """Filter rule object"""
    id: str
    name: str
    type: Literal["ALLOW", "BLOCK", "FORWARD"]
    field: Literal["FROM", "SUBJECT", "CONTENT", "ATTACHMENTS"]
    pattern: str
    is_active: bool = True
    priority: int = 0


@dataclass
class CreateFilterRuleOptions:
    """Options for creating a filter rule"""
    name: str
    type: Literal["ALLOW", "BLOCK", "FORWARD"]
    field: Literal["FROM", "SUBJECT", "CONTENT", "ATTACHMENTS"]
    pattern: str
    priority: int = 0
    is_active: bool = True


@dataclass
class ListOptions:
    """Options for listing resources"""
    limit: Optional[int] = None
    offset: Optional[int] = None
    search: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: Literal["asc", "desc"] = "desc"


@dataclass
class PaginationMeta:
    """Pagination metadata"""
    total: int
    limit: int
    offset: int
    has_next: Optional[bool] = None
    has_prev: Optional[bool] = None


@dataclass
class UsageStats:
    """Usage statistics"""
    domains: int = 0
    inboxes: int = 0
    members: int = 0
    api_keys: int = 0
    webhooks: int = 0
    emails_this_month: int = 0
    storage_mb: int = 0


@dataclass
class QuotaLimits:
    """Quota limits"""
    domains: Optional[int] = None
    inboxes: Optional[int] = None
    members: Optional[int] = None
    api_keys: Optional[int] = None
    webhooks: Optional[int] = None
    emails_per_month: Optional[int] = None
    storage_mb: Optional[int] = None
    api_calls_per_minute: Optional[int] = None
    attachments_per_email: Optional[int] = None
    email_size_kb: Optional[int] = None


@dataclass
class ApiResponse:
    """Generic API response"""
    data: Any
    meta: Optional[PaginationMeta] = None


@dataclass
class ErrorResponse:
    """Error response"""
    error: str
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None