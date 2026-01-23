---
sidebar_position: 4
---

# PHP SDK

Official PHP SDK for Ephemera.

## Installation

```bash
composer require ephemera/sdk
```

## Quick Start

```php
use Ephemera\EphemeraClient;

$client = new EphemeraClient($_ENV['EPHEMERA_API_KEY']);

$inbox = $client->createInbox();
$message = $client->waitForEmail($inbox->id, subject: 'Verify');
$code = $client->extractCode($message);
```

## Laravel Integration

```php
// config/ephemera.php is auto-published
// Set EPHEMERA_API_KEY in .env

// Use via facade or injection
$inbox = app(EphemeraClient::class)->createInbox();
```

## API Reference

### Constructor

```php
new EphemeraClient(string $apiKey, ?string $baseUrl = null)
```

### Methods

| Method | Description |
|--------|-------------|
| `createInbox(?string $domain, int $expiresIn)` | Create inbox |
| `getInbox(string $id)` | Get inbox |
| `deleteInbox(string $id)` | Delete inbox |
| `getMessages(string $inboxId, int $limit)` | List messages |
| `waitForEmail(string $inboxId, ...)` | Poll for email |
| `extractCode(Message $message)` | Extract OTP |

### Webhook Verification

```php
use Ephemera\Webhook\SignatureVerifier;

$isValid = SignatureVerifier::verify(
    $payload,
    $signature,
    $_ENV['WEBHOOK_SECRET'],
    $timestamp
);
```
