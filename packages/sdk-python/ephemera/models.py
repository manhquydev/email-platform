"""Ephemera SDK Models - Pydantic models for API responses."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class Domain(BaseModel):
    """A domain registered with Ephemera."""
    id: str
    name: str
    verified: bool = False
    is_public: bool = Field(alias="isPublic", default=False)
    owner_id: Optional[str] = Field(alias="ownerId", default=None)
    created_at: datetime = Field(alias="createdAt")

    class Config:
        populate_by_name = True


class Inbox(BaseModel):
    """A temporary email inbox."""
    id: str
    local_part: str = Field(alias="localPart")
    domain_id: str = Field(alias="domainId")
    domain: Optional[Domain] = None
    address: str = ""
    owner_id: Optional[str] = Field(alias="ownerId", default=None)
    expires_at: Optional[datetime] = Field(alias="expiresAt", default=None)
    created_at: datetime = Field(alias="createdAt")

    class Config:
        populate_by_name = True


class Attachment(BaseModel):
    """An email attachment."""
    id: str
    filename: str
    mime_type: str = Field(alias="mimeType")
    size: int
    storage_key: str = Field(alias="storageKey")

    class Config:
        populate_by_name = True


class Message(BaseModel):
    """An email message."""
    id: str
    inbox_id: str = Field(alias="inboxId")
    message_id: str = Field(alias="messageId")
    from_address: Optional[str] = Field(alias="fromAddress", default=None)
    to_address: str = Field(alias="toAddress")
    subject: str
    text_body: Optional[str] = Field(alias="textBody", default=None)
    html_body: Optional[str] = Field(alias="htmlBody", default=None)
    received_at: datetime = Field(alias="receivedAt")
    is_read: bool = Field(alias="isRead", default=False)
    is_pinned: bool = Field(alias="isPinned", default=False)
    spam_score: Optional[float] = Field(alias="spamScore", default=None)
    size: int = 0
    attachments: List[Attachment] = []

    class Config:
        populate_by_name = True
