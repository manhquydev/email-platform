package ephemera

import (
	"context"
	"regexp"
	"strings"
	"time"
)

// WaitForEmail polls for an email matching the criteria.
func (c *Client) WaitForEmail(ctx context.Context, inboxID string, input *WaitForEmailInput) (*Message, error) {
	if input == nil {
		input = &WaitForEmailInput{}
	}

	timeout := input.Timeout
	if timeout == 0 {
		timeout = 60 * time.Second
	}

	interval := input.PollInterval
	if interval == 0 {
		interval = 2 * time.Second
	}

	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		messages, err := c.GetMessages(ctx, inboxID, 20)
		if err != nil {
			return nil, err
		}

		for _, msg := range messages {
			matchesSubject := input.Subject == "" ||
				strings.Contains(strings.ToLower(msg.Subject), strings.ToLower(input.Subject))

			matchesFrom := input.From == ""
			if input.From != "" && msg.FromAddress != nil {
				matchesFrom = strings.Contains(strings.ToLower(*msg.FromAddress), strings.ToLower(input.From))
			}

			if matchesSubject && matchesFrom {
				return &msg, nil
			}
		}

		time.Sleep(interval)
	}

	return nil, &TimeoutError{Message: "no matching email found within timeout"}
}

// ExtractCode extracts an OTP/verification code from an email.
func ExtractCode(msg *Message) string {
	text := ""
	if msg.TextBody != nil {
		text = *msg.TextBody
	} else if msg.HTMLBody != nil {
		text = *msg.HTMLBody
	}

	patterns := []string{
		`\b(\d{6})\b`,           // 6 digits
		`\b(\d{4})\b`,           // 4 digits
		`(?i)code[:\s]+(\d{4,8})`, // "code: 123456"
		`(?i)otp[:\s]+(\d{4,8})`,  // "otp: 123456"
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		if matches := re.FindStringSubmatch(text); len(matches) > 1 {
			return matches[1]
		}
	}

	return ""
}

// CreateInboxAndWait creates an inbox and waits for an email.
func (c *Client) CreateInboxAndWait(ctx context.Context, input *WaitForEmailInput) (*Inbox, *Message, error) {
	inbox, err := c.CreateInbox(ctx, nil)
	if err != nil {
		return nil, nil, err
	}

	msg, err := c.WaitForEmail(ctx, inbox.ID, input)
	if err != nil {
		return inbox, nil, err
	}

	return inbox, msg, nil
}
