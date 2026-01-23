---
sidebar_position: 5
---

# Java SDK

Official Java SDK for Ephemera.

## Installation

```xml
<dependency>
    <groupId>com.ephemera</groupId>
    <artifactId>sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

## Quick Start

```java
import com.ephemera.sdk.EphemeraClient;

var client = new EphemeraClient(System.getenv("EPHEMERA_API_KEY"));

var inbox = client.createInbox();
var message = client.waitForEmail(inbox.getId(), "Verify", null, Duration.ofSeconds(60));
var code = client.extractCode(message);
```

## API Reference

### Constructor

```java
new EphemeraClient(String apiKey)
new EphemeraClient(String apiKey, String baseUrl)
```

### Methods

| Method | Description |
|--------|-------------|
| `createInbox()` | Create inbox |
| `getInbox(String id)` | Get inbox |
| `deleteInbox(String id)` | Delete inbox |
| `getMessages(String inboxId)` | List messages |
| `waitForEmail(...)` | Poll for email |
| `extractCode(Message msg)` | Extract OTP |

### Webhook Verification

```java
import com.ephemera.sdk.webhook.SignatureVerifier;

boolean isValid = SignatureVerifier.verify(
    payload,
    signature,
    System.getenv("WEBHOOK_SECRET"),
    timestamp
);
```
