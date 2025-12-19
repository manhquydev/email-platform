from .client import TempMailPro
from .types import (
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
    UsageStats,
    QuotaLimits,
)

__version__ = "1.0.0"
__all__ = [
    "TempMailPro",
    "User",
    "Domain",
    "Inbox",
    "Message",
    "Attachment",
    "ApiKey",
    "Webhook",
    "CreateInboxOptions",
    "FilterRule",
    "CreateFilterRuleOptions",
    "ListOptions",
    "UsageStats",
    "QuotaLimits",
]