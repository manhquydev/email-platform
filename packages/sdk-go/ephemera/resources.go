package ephemera

import (
	"context"
	"fmt"
)

// ListDomains returns all available domains.
func (c *Client) ListDomains(ctx context.Context) ([]Domain, error) {
	var resp PaginatedResponse[Domain]
	if err := c.get(ctx, "/domains?limit=100", &resp); err != nil {
		return nil, err
	}
	return resp.Data, nil
}

// GetDomain returns a domain by ID.
func (c *Client) GetDomain(ctx context.Context, id string) (*Domain, error) {
	var domain Domain
	if err := c.get(ctx, "/domains/"+id, &domain); err != nil {
		return nil, err
	}
	return &domain, nil
}

// CreateInbox creates a new inbox.
func (c *Client) CreateInbox(ctx context.Context, input *CreateInboxInput) (*Inbox, error) {
	var inbox Inbox
	body := input
	if body == nil {
		body = &CreateInboxInput{}
	}
	if err := c.post(ctx, "/inboxes", body, &inbox); err != nil {
		return nil, err
	}
	return &inbox, nil
}

// GetInbox returns an inbox by ID.
func (c *Client) GetInbox(ctx context.Context, id string) (*Inbox, error) {
	var inbox Inbox
	if err := c.get(ctx, "/inboxes/"+id, &inbox); err != nil {
		return nil, err
	}
	return &inbox, nil
}

// ListInboxes returns all inboxes for the authenticated user.
func (c *Client) ListInboxes(ctx context.Context, limit int) ([]Inbox, error) {
	if limit <= 0 {
		limit = 100
	}
	var resp PaginatedResponse[Inbox]
	if err := c.get(ctx, fmt.Sprintf("/inboxes?limit=%d&personal=true", limit), &resp); err != nil {
		return nil, err
	}
	return resp.Data, nil
}

// DeleteInbox deletes an inbox by ID.
func (c *Client) DeleteInbox(ctx context.Context, id string) error {
	return c.delete(ctx, "/inboxes/"+id)
}

// GetMessages returns messages for an inbox.
func (c *Client) GetMessages(ctx context.Context, inboxID string, limit int) ([]Message, error) {
	if limit <= 0 {
		limit = 50
	}
	var resp PaginatedResponse[Message]
	path := fmt.Sprintf("/messages?inboxId=%s&limit=%d", inboxID, limit)
	if err := c.get(ctx, path, &resp); err != nil {
		return nil, err
	}
	return resp.Data, nil
}

// GetMessage returns a message by ID.
func (c *Client) GetMessage(ctx context.Context, id string) (*Message, error) {
	var msg Message
	if err := c.get(ctx, "/messages/"+id, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}

// DeleteMessage deletes a message by ID.
func (c *Client) DeleteMessage(ctx context.Context, id string) error {
	return c.delete(ctx, "/messages/"+id)
}
