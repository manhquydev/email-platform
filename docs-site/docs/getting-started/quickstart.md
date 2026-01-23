---
sidebar_position: 3
---

# Quick Start

Get up and running with Ephemera in 5 minutes.

## Installation

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="js" label="JavaScript">

```bash
npm install @ephemera/sdk
```

</TabItem>
<TabItem value="python" label="Python">

```bash
pip install ephemera
```

</TabItem>
<TabItem value="go" label="Go">

```bash
go get github.com/ephemera/sdk-go
```

</TabItem>
<TabItem value="php" label="PHP">

```bash
composer require ephemera/sdk
```

</TabItem>
</Tabs>

## Basic Usage

<Tabs>
<TabItem value="js" label="JavaScript">

```javascript
import { EphemeraClient } from '@ephemera/sdk';

const client = new EphemeraClient(process.env.EPHEMERA_API_KEY);

// Create a temporary inbox
const inbox = await client.createInbox();
console.log(`Email: ${inbox.address}`);

// Wait for verification email
const message = await client.waitForEmail(inbox.id, {
  subject: 'Verification',
  timeout: 60000
});

// Extract OTP code
const code = client.extractCode(message);
console.log(`OTP: ${code}`);

// Cleanup
await client.deleteInbox(inbox.id);
```

</TabItem>
<TabItem value="python" label="Python">

```python
from ephemera import EphemeraClient
import os

client = EphemeraClient(os.environ["EPHEMERA_API_KEY"])

# Create a temporary inbox
inbox = client.create_inbox()
print(f"Email: {inbox.address}")

# Wait for verification email
message = client.wait_for_email(inbox.id, subject="Verification")

# Extract OTP code
code = client.extract_code(message)
print(f"OTP: {code}")

# Cleanup
client.delete_inbox(inbox.id)
```

</TabItem>
<TabItem value="go" label="Go">

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

    // Create a temporary inbox
    inbox, _ := client.CreateInbox(ctx, nil)
    fmt.Printf("Email: %s\n", inbox.Address)

    // Wait for verification email
    message, _ := client.WaitForEmail(ctx, inbox.ID, &ephemera.WaitOptions{
        Subject: "Verification",
        Timeout: 60 * time.Second,
    })

    // Extract OTP code
    code := ephemera.ExtractCode(message)
    fmt.Printf("OTP: %s\n", code)

    // Cleanup
    client.DeleteInbox(ctx, inbox.ID)
}
```

</TabItem>
</Tabs>

## Next Steps

- [API Reference](/docs/api-reference/overview) - Explore all endpoints
- [Webhooks](/docs/api-reference/webhooks) - Real-time notifications
- [Test Automation](/docs/guides/test-automation) - E2E testing guide
