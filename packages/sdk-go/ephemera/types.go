package ephemera

import "time"

// Domain represents an email domain.
type Domain struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Verified  bool      `json:"verified"`
	IsPublic  bool      `json:"isPublic"`
	OwnerID   *string   `json:"ownerId"`
	CreatedAt time.Time `json:"createdAt"`
}

// Inbox represents a temporary email inbox.
type Inbox struct {
	ID        string    `json:"id"`
	LocalPart string    `json:"localPart"`
	DomainID  string    `json:"domainId"`
	Domain    *Domain   `json:"domain,omitempty"`
	Address   string    `json:"address"`
	OwnerID   *string   `json:"ownerId"`
	ExpiresAt *string   `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
}

// Attachment represents an email attachment.
type Attachment struct {
	ID         string `json:"id"`
	Filename   string `json:"filename"`
	MimeType   string `json:"mimeType"`
	Size       int64  `json:"size"`
	StorageKey string `json:"storageKey"`
}

// Message represents an email message.
type Message struct {
	ID          string       `json:"id"`
	InboxID     string       `json:"inboxId"`
	MessageID   string       `json:"messageId"`
	FromAddress *string      `json:"fromAddress"`
	ToAddress   string       `json:"toAddress"`
	Subject     string       `json:"subject"`
	TextBody    *string      `json:"textBody"`
	HTMLBody    *string      `json:"htmlBody"`
	ReceivedAt  time.Time    `json:"receivedAt"`
	IsRead      bool         `json:"isRead"`
	IsPinned    bool         `json:"isPinned"`
	SpamScore   *float64     `json:"spamScore"`
	Size        int64        `json:"size"`
	Attachments []Attachment `json:"attachments"`
}

// PaginatedResponse is a generic paginated response.
type PaginatedResponse[T any] struct {
	Data       []T    `json:"data"`
	NextCursor string `json:"nextCursor,omitempty"`
	Meta       struct {
		Total  int `json:"total"`
		Offset int `json:"offset"`
		Limit  int `json:"limit"`
	} `json:"meta"`
}

// CreateInboxInput is the input for creating an inbox.
type CreateInboxInput struct {
	LocalPart string `json:"localPart,omitempty"`
	DomainID  string `json:"domainId,omitempty"`
	ExpiresAt string `json:"expiresAt,omitempty"`
}

// ListMessagesInput is the input for listing messages.
type ListMessagesInput struct {
	InboxID    string
	Query      string
	From       string
	UnreadOnly bool
	Limit      int
	Offset     int
}

// WaitForEmailInput is the input for waiting for an email.
type WaitForEmailInput struct {
	Subject     string
	From        string
	Timeout     time.Duration
	PollInterval time.Duration
}

// RateLimitInfo contains rate limit information from headers.
type RateLimitInfo struct {
	Limit      int
	Remaining  int
	Reset      int64
	RetryAfter int
}
