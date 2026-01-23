# Ephemera Java SDK

Official Java SDK for the Ephemera temporary email platform.

## Requirements

- Java 17+
- Maven or Gradle

## Installation

### Maven

```xml
<dependency>
    <groupId>com.ephemera</groupId>
    <artifactId>ephemera-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'com.ephemera:ephemera-sdk:1.0.0'
```

## Quick Start

```java
import com.ephemera.sdk.EphemeraClient;
import com.ephemera.sdk.model.Inbox;
import com.ephemera.sdk.model.Message;

import java.time.Duration;

public class Example {
    public static void main(String[] args) throws Exception {
        EphemeraClient client = new EphemeraClient("your-api-key");

        // Create a temporary inbox
        Inbox inbox = client.createInbox();
        System.out.println("Inbox: " + inbox.getAddress());

        // Wait for an email
        Message message = client.waitForEmail(
            inbox.getId(),
            "Verification",
            Duration.ofSeconds(60)
        );
        System.out.println("Subject: " + message.getSubject());

        // Extract OTP code
        client.extractCode(message).ifPresent(code -> {
            System.out.println("OTP: " + code);
        });
    }
}
```

## Webhook Verification

```java
import com.ephemera.sdk.webhook.SignatureVerifier;

// In your webhook handler
String payload = request.getBody();
String signature = request.getHeader("X-Ephemera-Signature");
long timestamp = Long.parseLong(request.getHeader("X-Ephemera-Timestamp"));

try {
    boolean isValid = SignatureVerifier.verify(
        payload,
        signature,
        System.getenv("EPHEMERA_WEBHOOK_SECRET"),
        timestamp
    );

    if (isValid) {
        // Process webhook...
    }
} catch (EphemeraException e) {
    response.setStatus(400);
    response.getWriter().write(e.getMessage());
}
```

## License

MIT
