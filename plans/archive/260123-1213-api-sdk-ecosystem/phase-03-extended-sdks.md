# Phase 3: Extended SDKs

```yaml
status: completed
priority: MEDIUM
duration: 4-6 weeks
dependencies: [phase-01-foundation, phase-02-core-sdks]
```

## Overview

Phát triển SDKs cho PHP, Java, và .NET dựa trên OpenAPI spec. Sử dụng OpenAPI Generator để tạo base code, sau đó polish manually.

## Context Links

- [Main Plan](./plan.md)
- [Phase 2: Core SDKs](./phase-02-core-sdks.md)
- [OpenAPI Spec](../../services/api/openapi/openapi.yaml)

---

## 1. PHP SDK

### 1.1 Package Structure

```
packages/sdk-php/
├── src/
│   ├── EphemeraClient.php
│   ├── Api/
│   │   ├── InboxApi.php
│   │   ├── MessageApi.php
│   │   └── DomainApi.php
│   ├── Model/
│   │   ├── Inbox.php
│   │   ├── Message.php
│   │   └── Domain.php
│   ├── Exception/
│   │   ├── EphemeraException.php
│   │   ├── RateLimitException.php
│   │   └── ValidationException.php
│   └── Webhook/
│       └── SignatureVerifier.php
├── tests/
├── composer.json
├── phpunit.xml
└── README.md
```

### 1.2 Implementation

```php
<?php
// src/EphemeraClient.php
namespace Ephemera;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class EphemeraClient
{
    private string $apiKey;
    private string $baseUrl;
    private Client $httpClient;

    public function __construct(
        string $apiKey,
        string $baseUrl = 'https://api.manhquy.click/v1'
    ) {
        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->httpClient = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 30.0,
            'headers' => [
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type' => 'application/json',
                'User-Agent' => 'ephemera-php/1.0.0',
            ],
        ]);
    }

    public function createInbox(array $options = []): Inbox
    {
        $response = $this->request('POST', '/inboxes', $options);
        return Inbox::fromArray($response);
    }

    public function getInbox(string $id): Inbox
    {
        $response = $this->request('GET', "/inboxes/{$id}");
        return Inbox::fromArray($response);
    }

    public function waitForEmail(
        string $inboxId,
        ?string $subject = null,
        float $timeout = 60.0
    ): Message {
        $start = microtime(true);
        while (microtime(true) - $start < $timeout) {
            $messages = $this->getMessages($inboxId);
            foreach ($messages as $message) {
                if (!$subject || stripos($message->subject, $subject) !== false) {
                    return $message;
                }
            }
            usleep(2000000); // 2 seconds
        }
        throw new TimeoutException("No email found within {$timeout}s");
    }

    private function request(string $method, string $path, array $body = []): array
    {
        try {
            $options = [];
            if (!empty($body)) {
                $options['json'] = $body;
            }
            $response = $this->httpClient->request($method, $path, $options);
            return json_decode($response->getBody()->getContents(), true);
        } catch (RequestException $e) {
            throw $this->handleException($e);
        }
    }
}
```

```php
<?php
// src/Webhook/SignatureVerifier.php
namespace Ephemera\Webhook;

class SignatureVerifier
{
    public static function verify(
        string $payload,
        string $signature,
        string $secret,
        int $timestamp,
        int $toleranceSeconds = 300
    ): bool {
        $now = time();
        if (abs($now - $timestamp) > $toleranceSeconds) {
            throw new WebhookException('Timestamp outside tolerance');
        }

        $expected = 'sha256=' . hash_hmac('sha256', "{$timestamp}.{$payload}", $secret);
        return hash_equals($expected, $signature);
    }
}
```

### 1.3 Laravel Integration

```php
<?php
// src/Laravel/EphemeraServiceProvider.php
namespace Ephemera\Laravel;

use Illuminate\Support\ServiceProvider;
use Ephemera\EphemeraClient;

class EphemeraServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(EphemeraClient::class, function ($app) {
            return new EphemeraClient(
                config('ephemera.api_key'),
                config('ephemera.base_url', 'https://api.manhquy.click/v1')
            );
        });
    }

    public function boot(): void
    {
        $this->publishes([
            __DIR__ . '/config/ephemera.php' => config_path('ephemera.php'),
        ], 'config');
    }
}
```

### 1.4 Todo Checklist

- [x] Generate base from OpenAPI
- [x] Create EphemeraClient class
- [x] Implement all API methods
- [x] Add Guzzle HTTP client
- [x] Create webhook verifier
- [x] Add Laravel service provider
- [x] Write PHPUnit tests
- [x] Create composer.json
- [x] Publish to Packagist

---

## 2. Java SDK

### 2.1 Package Structure

```
packages/sdk-java/
├── src/main/java/com/ephemera/sdk/
│   ├── EphemeraClient.java
│   ├── api/
│   │   ├── InboxApi.java
│   │   ├── MessageApi.java
│   │   └── DomainApi.java
│   ├── model/
│   │   ├── Inbox.java
│   │   ├── Message.java
│   │   └── Domain.java
│   ├── exception/
│   │   ├── EphemeraException.java
│   │   └── RateLimitException.java
│   └── webhook/
│       └── SignatureVerifier.java
├── src/test/java/
├── pom.xml
├── build.gradle
└── README.md
```

### 2.2 Implementation

```java
// EphemeraClient.java
package com.ephemera.sdk;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import com.fasterxml.jackson.databind.ObjectMapper;

public class EphemeraClient {
    private final String apiKey;
    private final String baseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public EphemeraClient(String apiKey) {
        this(apiKey, "https://api.manhquy.click/v1");
    }

    public EphemeraClient(String apiKey, String baseUrl) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();
        this.objectMapper = new ObjectMapper();
    }

    public Inbox createInbox() throws EphemeraException {
        return createInbox(new CreateInboxRequest());
    }

    public Inbox createInbox(CreateInboxRequest request) throws EphemeraException {
        String body = toJson(request);
        String response = doRequest("POST", "/inboxes", body);
        return fromJson(response, Inbox.class);
    }

    public Inbox getInbox(String id) throws EphemeraException {
        String response = doRequest("GET", "/inboxes/" + id, null);
        return fromJson(response, Inbox.class);
    }

    public Message waitForEmail(String inboxId, String subject, Duration timeout)
            throws EphemeraException, InterruptedException {
        long start = System.currentTimeMillis();
        long timeoutMs = timeout.toMillis();

        while (System.currentTimeMillis() - start < timeoutMs) {
            List<Message> messages = getMessages(inboxId);
            for (Message msg : messages) {
                if (subject == null ||
                    msg.getSubject().toLowerCase().contains(subject.toLowerCase())) {
                    return msg;
                }
            }
            Thread.sleep(2000);
        }
        throw new TimeoutException("No email found within " + timeout.getSeconds() + "s");
    }

    private String doRequest(String method, String path, String body)
            throws EphemeraException {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .header("User-Agent", "ephemera-java/1.0.0");

            if (body != null) {
                builder.method(method, HttpRequest.BodyPublishers.ofString(body));
            } else {
                builder.method(method, HttpRequest.BodyPublishers.noBody());
            }

            HttpResponse<String> response = httpClient.send(
                builder.build(),
                HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() >= 400) {
                throw parseError(response);
            }
            return response.body();
        } catch (IOException | InterruptedException e) {
            throw new NetworkException(e);
        }
    }
}
```

```java
// webhook/SignatureVerifier.java
package com.ephemera.sdk.webhook;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;

public class SignatureVerifier {
    public static boolean verify(
            String payload,
            String signature,
            String secret,
            long timestamp,
            int toleranceSeconds
    ) throws WebhookException {
        long now = System.currentTimeMillis() / 1000;
        if (Math.abs(now - timestamp) > toleranceSeconds) {
            throw new WebhookException("Timestamp outside tolerance");
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
            String signaturePayload = timestamp + "." + payload;
            byte[] hash = mac.doFinal(signaturePayload.getBytes());
            String expected = "sha256=" + bytesToHex(hash);

            return MessageDigest.isEqual(expected.getBytes(), signature.getBytes());
        } catch (Exception e) {
            throw new WebhookException("Signature verification failed", e);
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
```

### 2.3 Todo Checklist

- [x] Generate base from OpenAPI
- [x] Create Maven/Gradle project
- [x] Implement EphemeraClient
- [x] Use Java 11+ HttpClient
- [x] Add Jackson for JSON
- [x] Create webhook verifier
- [x] Write JUnit 5 tests
- [x] Publish to Maven Central

---

## 3. .NET SDK

### 3.1 Package Structure

```
packages/sdk-dotnet/
├── src/Ephemera.Sdk/
│   ├── EphemeraClient.cs
│   ├── Api/
│   │   ├── IInboxApi.cs
│   │   ├── InboxApi.cs
│   │   └── ...
│   ├── Models/
│   │   ├── Inbox.cs
│   │   ├── Message.cs
│   │   └── ...
│   ├── Exceptions/
│   │   └── EphemeraException.cs
│   └── Webhook/
│       └── SignatureVerifier.cs
├── tests/Ephemera.Sdk.Tests/
├── Ephemera.Sdk.sln
├── Ephemera.Sdk.csproj
└── README.md
```

### 3.2 Implementation

```csharp
// EphemeraClient.cs
using System.Net.Http;
using System.Text.Json;

namespace Ephemera.Sdk;

public class EphemeraClient : IDisposable
{
    private readonly string _apiKey;
    private readonly string _baseUrl;
    private readonly HttpClient _httpClient;
    private readonly JsonSerializerOptions _jsonOptions;

    public EphemeraClient(string apiKey, string? baseUrl = null)
    {
        _apiKey = apiKey;
        _baseUrl = baseUrl ?? "https://api.manhquy.click/v1";
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(_baseUrl),
            Timeout = TimeSpan.FromSeconds(30)
        };
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "ephemera-dotnet/1.0.0");

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }

    public async Task<Inbox> CreateInboxAsync(
        CreateInboxRequest? request = null,
        CancellationToken ct = default)
    {
        var response = await PostAsync<Inbox>("/inboxes", request, ct);
        return response;
    }

    public async Task<Inbox> GetInboxAsync(string id, CancellationToken ct = default)
    {
        return await GetAsync<Inbox>($"/inboxes/{id}", ct);
    }

    public async Task<Message> WaitForEmailAsync(
        string inboxId,
        string? subject = null,
        TimeSpan? timeout = null,
        CancellationToken ct = default)
    {
        var timeoutValue = timeout ?? TimeSpan.FromSeconds(60);
        var start = DateTime.UtcNow;

        while (DateTime.UtcNow - start < timeoutValue)
        {
            ct.ThrowIfCancellationRequested();

            var messages = await GetMessagesAsync(inboxId, ct: ct);
            foreach (var msg in messages)
            {
                if (subject == null ||
                    msg.Subject.Contains(subject, StringComparison.OrdinalIgnoreCase))
                {
                    return msg;
                }
            }
            await Task.Delay(2000, ct);
        }
        throw new TimeoutException($"No email found within {timeoutValue.TotalSeconds}s");
    }

    private async Task<T> GetAsync<T>(string path, CancellationToken ct)
    {
        var response = await _httpClient.GetAsync(path, ct);
        await EnsureSuccessAsync(response);
        var content = await response.Content.ReadAsStringAsync(ct);
        return JsonSerializer.Deserialize<T>(content, _jsonOptions)!;
    }

    private async Task<T> PostAsync<T>(string path, object? body, CancellationToken ct)
    {
        var content = body != null
            ? new StringContent(JsonSerializer.Serialize(body, _jsonOptions),
                Encoding.UTF8, "application/json")
            : null;

        var response = await _httpClient.PostAsync(path, content, ct);
        await EnsureSuccessAsync(response);
        var responseContent = await response.Content.ReadAsStringAsync(ct);
        return JsonSerializer.Deserialize<T>(responseContent, _jsonOptions)!;
    }

    public void Dispose() => _httpClient.Dispose();
}
```

```csharp
// Webhook/SignatureVerifier.cs
using System.Security.Cryptography;
using System.Text;

namespace Ephemera.Sdk.Webhook;

public static class SignatureVerifier
{
    public static bool Verify(
        string payload,
        string signature,
        string secret,
        long timestamp,
        int toleranceSeconds = 300)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (Math.Abs(now - timestamp) > toleranceSeconds)
        {
            throw new WebhookException("Timestamp outside tolerance");
        }

        var signaturePayload = $"{timestamp}.{payload}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signaturePayload));
        var expected = $"sha256={Convert.ToHexString(hash).ToLower()}";

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature)
        );
    }
}
```

### 3.3 Todo Checklist

- [x] Generate base from OpenAPI
- [x] Create .NET 8 class library
- [x] Implement EphemeraClient
- [x] Use System.Net.Http
- [x] Add System.Text.Json
- [x] Create webhook verifier
- [x] Write xUnit tests
- [x] Publish to NuGet

---

## 4. SDK Generation Pipeline

### 4.1 OpenAPI Generator Config

```yaml
# openapi-generator-config.yaml
generatorName: csharp
outputDir: packages/sdk-dotnet
packageName: Ephemera.Sdk
additionalProperties:
  targetFramework: net8.0
  library: httpclient
  nullableReferenceTypes: true
```

### 4.2 Generation Script

```bash
#!/bin/bash
# scripts/generate-sdks.sh

OPENAPI_SPEC="services/api/openapi/openapi.yaml"

# Generate PHP
openapi-generator-cli generate \
  -i $OPENAPI_SPEC \
  -g php \
  -o packages/sdk-php \
  --additional-properties=packageName=ephemera/sdk

# Generate Java
openapi-generator-cli generate \
  -i $OPENAPI_SPEC \
  -g java \
  -o packages/sdk-java \
  --additional-properties=library=native,java8=false

# Generate C#
openapi-generator-cli generate \
  -i $OPENAPI_SPEC \
  -g csharp \
  -o packages/sdk-dotnet \
  --additional-properties=targetFramework=net8.0
```

---

## Success Criteria

- [x] PHP SDK: Packagist with Laravel support
- [x] Java SDK: Maven Central with Java 17+
- [x] .NET SDK: NuGet with .NET 8
- [x] All SDKs: Webhook verification
- [x] All SDKs: 80%+ test coverage
- [x] All SDKs: README with examples

---

## Next Phase

→ [Phase 4: Developer Portal](./phase-04-developer-portal.md)
