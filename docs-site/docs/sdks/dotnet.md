---
sidebar_position: 6
---

# .NET SDK

Official .NET SDK for Ephemera.

## Installation

```bash
dotnet add package Ephemera.Sdk
```

## Quick Start

```csharp
using Ephemera.Sdk;

using var client = new EphemeraClient(Environment.GetEnvironmentVariable("EPHEMERA_API_KEY")!);

var inbox = await client.CreateInboxAsync();
var message = await client.WaitForEmailAsync(inbox.Id, subject: "Verify");
var code = client.ExtractCode(message);
```

## Dependency Injection

```csharp
// Program.cs
builder.Services.AddSingleton<EphemeraClient>(sp =>
    new EphemeraClient(builder.Configuration["Ephemera:ApiKey"]!));
```

## API Reference

### Constructor

```csharp
new EphemeraClient(string apiKey, string? baseUrl = null)
```

### Methods

| Method | Description |
|--------|-------------|
| `CreateInboxAsync()` | Create inbox |
| `GetInboxAsync(id)` | Get inbox |
| `DeleteInboxAsync(id)` | Delete inbox |
| `GetMessagesAsync(inboxId)` | List messages |
| `WaitForEmailAsync(...)` | Poll for email |
| `ExtractCode(message)` | Extract OTP |

### Webhook Verification

```csharp
using Ephemera.Sdk.Webhook;

var isValid = SignatureVerifier.Verify(
    payload,
    signature,
    Environment.GetEnvironmentVariable("WEBHOOK_SECRET")!,
    timestamp
);
```
