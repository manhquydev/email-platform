# Ephemera .NET SDK

Official .NET SDK for the Ephemera temporary email platform.

## Requirements

- .NET 8.0+

## Installation

```bash
dotnet add package Ephemera.Sdk
```

## Quick Start

```csharp
using Ephemera.Sdk;

using var client = new EphemeraClient("your-api-key");

// Create a temporary inbox
var inbox = await client.CreateInboxAsync();
Console.WriteLine($"Inbox: {inbox.Address}");

// Wait for an email
var message = await client.WaitForEmailAsync(
    inbox.Id,
    subject: "Verification",
    timeout: TimeSpan.FromSeconds(60)
);
Console.WriteLine($"Subject: {message.Subject}");

// Extract OTP code
var code = client.ExtractCode(message);
Console.WriteLine($"OTP: {code}");
```

## Webhook Verification

```csharp
using Ephemera.Sdk.Webhook;
using Ephemera.Sdk.Exceptions;

// In your webhook controller
[HttpPost("webhook")]
public IActionResult HandleWebhook()
{
    var payload = new StreamReader(Request.Body).ReadToEnd();
    var signature = Request.Headers["X-Ephemera-Signature"].ToString();
    var timestamp = long.Parse(Request.Headers["X-Ephemera-Timestamp"].ToString());

    try
    {
        var isValid = SignatureVerifier.Verify(
            payload,
            signature,
            Environment.GetEnvironmentVariable("EPHEMERA_WEBHOOK_SECRET")!,
            timestamp
        );

        if (isValid)
        {
            var data = JsonSerializer.Deserialize<WebhookPayload>(payload);
            // Process webhook...
            return Ok();
        }

        return BadRequest("Invalid signature");
    }
    catch (EphemeraException ex)
    {
        return BadRequest(ex.Message);
    }
}
```

## Dependency Injection (ASP.NET Core)

```csharp
// Program.cs
builder.Services.AddSingleton<EphemeraClient>(sp =>
    new EphemeraClient(builder.Configuration["Ephemera:ApiKey"]!));

// Controller
public class EmailController : ControllerBase
{
    private readonly EphemeraClient _ephemera;

    public EmailController(EphemeraClient ephemera)
    {
        _ephemera = ephemera;
    }
}
```

## License

MIT
