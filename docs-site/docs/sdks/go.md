---
sidebar_position: 3
---

# Go SDK

Official Go SDK for Ephemera.

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
    "os"
    "time"
    "github.com/ephemera/sdk-go/ephemera"
)

func main() {
    client := ephemera.NewClient(os.Getenv("EPHEMERA_API_KEY"))
    ctx := context.Background()

    inbox, _ := client.CreateInbox(ctx, nil)
    message, _ := client.WaitForEmail(ctx, inbox.ID, &ephemera.WaitOptions{
        Subject: "Verify",
        Timeout: 60 * time.Second,
    })
    code := ephemera.ExtractCode(message)
    fmt.Println(code)
}
```

## API Reference

### Constructor

```go
client := ephemera.NewClient(apiKey string, opts ...ClientOption)
```

### Methods

| Method | Description |
|--------|-------------|
| `CreateInbox(ctx, opts)` | Create inbox |
| `GetInbox(ctx, id)` | Get inbox details |
| `DeleteInbox(ctx, id)` | Delete inbox |
| `GetMessages(ctx, inboxID, limit)` | List messages |
| `GetMessage(ctx, id)` | Get message details |
| `WaitForEmail(ctx, inboxID, opts)` | Poll for email |
| `ExtractCode(message)` | Extract OTP code |

### Webhook Verification

```go
import "github.com/ephemera/sdk-go/webhook"

isValid, err := webhook.Verify(
    payload,
    signature,
    secret,
    timestamp,
)
```
