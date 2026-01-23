# Ephemera Go SDK

Official Go SDK for the Ephemera temporary email platform.

## Installation

```bash
go get github.com/ephemera/sdk-go
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/ephemera/sdk-go/ephemera"
)

func main() {
    client := ephemera.NewClient("your-api-key")
    ctx := context.Background()

    // Create a temporary inbox
    inbox, err := client.CreateInbox(ctx, nil)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Created inbox: %s\n", inbox.Address)

    // Wait for an email
    msg, err := client.WaitForEmail(ctx, inbox.ID, &ephemera.WaitForEmailInput{
        Subject: "Verification",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Received: %s\n", msg.Subject)

    // Extract OTP code
    code := ephemera.ExtractCode(msg)
    fmt.Printf("OTP: %s\n", code)
}
```

## Features

- Full API coverage (domains, inboxes, messages)
- Context support for cancellation and timeouts
- Webhook signature verification
- Rate limit handling
- Pagination support

## Webhook Verification

```go
result := ephemera.VerifyWebhookSignature(
    []byte(requestBody),
    req.Header.Get("X-Ephemera-Signature"),
    os.Getenv("WEBHOOK_SECRET"),
    timestamp,
    300, // 5 minutes tolerance
)
if !result.Valid {
    http.Error(w, result.Error, http.StatusBadRequest)
    return
}
```

## License

MIT
