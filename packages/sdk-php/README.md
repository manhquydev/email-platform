# Ephemera PHP SDK

Official PHP SDK for the Ephemera temporary email platform.

## Installation

```bash
composer require ephemera/sdk
```

## Quick Start

```php
<?php
use Ephemera\EphemeraClient;

$client = new EphemeraClient('your-api-key');

// Create a temporary inbox
$inbox = $client->createInbox();
echo "Inbox: {$inbox->address}\n";

// Wait for an email
$message = $client->waitForEmail($inbox->id, 'Verification');
echo "Subject: {$message->subject}\n";

// Extract OTP code
$code = $client->extractCode($message);
echo "OTP: {$code}\n";
```

## Laravel Integration

The SDK includes a Laravel service provider that auto-registers.

### Publish Config

```bash
php artisan vendor:publish --tag=ephemera-config
```

### Usage in Laravel

```php
use Ephemera\EphemeraClient;

class VerificationController extends Controller
{
    public function __construct(private EphemeraClient $ephemera) {}

    public function test()
    {
        $inbox = $this->ephemera->createInbox();
        // ...
    }
}
```

## Webhook Verification

```php
use Ephemera\Webhook\SignatureVerifier;

$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_EPHEMERA_SIGNATURE'];
$timestamp = (int)$_SERVER['HTTP_X_EPHEMERA_TIMESTAMP'];

try {
    $isValid = SignatureVerifier::verify(
        $payload,
        $signature,
        env('EPHEMERA_WEBHOOK_SECRET'),
        $timestamp
    );

    if ($isValid) {
        $data = json_decode($payload, true);
        // Process webhook...
    }
} catch (\Ephemera\Exception\EphemeraException $e) {
    http_response_code(400);
    echo $e->getMessage();
}
```

## License

MIT
