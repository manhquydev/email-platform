<?php

declare(strict_types=1);

namespace Ephemera;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Ephemera\Exception\EphemeraException;
use Ephemera\Exception\NetworkException;
use Ephemera\Exception\RateLimitException;
use Ephemera\Exception\TimeoutException;
use Ephemera\Model\Inbox;
use Ephemera\Model\Message;
use Ephemera\Model\Domain;

/**
 * Ephemera API Client
 *
 * Main client for interacting with the Ephemera temporary email API.
 *
 * @example
 * ```php
 * $client = new EphemeraClient('your-api-key');
 * $inbox = $client->createInbox();
 * $message = $client->waitForEmail($inbox->id, 'Verification');
 * ```
 */
class EphemeraClient
{
    private string $apiKey;
    private string $baseUrl;
    private Client $httpClient;
    private int $timeout;

    public function __construct(
        string $apiKey,
        string $baseUrl = 'https://api.manhquy.click',
        int $timeout = 30
    ) {
        if (empty($apiKey)) {
            throw new EphemeraException('API key is required', 'UNAUTHORIZED', 401);
        }

        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->timeout = $timeout;
        $this->httpClient = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => $timeout,
            'headers' => [
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type' => 'application/json',
                'User-Agent' => 'ephemera-php/1.0.0',
            ],
        ]);
    }

    // ==================== Domain Methods ====================

    /**
     * List available domains
     * @return Domain[]
     */
    public function listDomains(): array
    {
        $response = $this->request('GET', '/domains?limit=100');
        return array_map(
            fn($data) => Domain::fromArray($data),
            $response['data'] ?? []
        );
    }

    /**
     * Get a domain by ID
     */
    public function getDomain(string $id): Domain
    {
        $response = $this->request('GET', "/domains/{$id}");
        return Domain::fromArray($response);
    }

    // ==================== Inbox Methods ====================

    /**
     * Create a new inbox
     */
    public function createInbox(array $options = []): Inbox
    {
        $body = [];
        if (isset($options['localPart'])) {
            $body['localPart'] = $options['localPart'];
        }
        if (isset($options['domainId'])) {
            $body['domainId'] = $options['domainId'];
        }
        if (isset($options['expiresIn'])) {
            $expiresAt = new \DateTime();
            $expiresAt->modify("+{$options['expiresIn']} milliseconds");
            $body['expiresAt'] = $expiresAt->format('c');
        }

        $response = $this->request('POST', '/inboxes', $body);
        return Inbox::fromArray($response);
    }

    /**
     * Get an inbox by ID
     */
    public function getInbox(string $id): Inbox
    {
        $response = $this->request('GET', "/inboxes/{$id}");
        return Inbox::fromArray($response);
    }

    /**
     * List inboxes for the authenticated user
     * @return Inbox[]
     */
    public function listInboxes(int $limit = 100): array
    {
        $response = $this->request('GET', "/inboxes?limit={$limit}&personal=true");
        return array_map(
            fn($data) => Inbox::fromArray($data),
            $response['data'] ?? []
        );
    }

    /**
     * Delete an inbox
     */
    public function deleteInbox(string $id): void
    {
        $this->request('DELETE', "/inboxes/{$id}");
    }

    // ==================== Message Methods ====================

    /**
     * Get messages in an inbox
     * @return Message[]
     */
    public function getMessages(string $inboxId, int $limit = 50): array
    {
        $response = $this->request('GET', "/messages?inboxId={$inboxId}&limit={$limit}");
        return array_map(
            fn($data) => Message::fromArray($data),
            $response['data'] ?? []
        );
    }

    /**
     * Get a message by ID
     */
    public function getMessage(string $id): Message
    {
        $response = $this->request('GET', "/messages/{$id}");
        return Message::fromArray($response);
    }

    /**
     * Delete a message
     */
    public function deleteMessage(string $id): void
    {
        $this->request('DELETE', "/messages/{$id}");
    }

    // ==================== Convenience Methods ====================

    /**
     * Wait for an email to arrive in an inbox
     */
    public function waitForEmail(
        string $inboxId,
        ?string $subject = null,
        ?string $from = null,
        float $timeout = 60.0,
        float $interval = 2.0
    ): Message {
        $start = microtime(true);

        while (microtime(true) - $start < $timeout) {
            $messages = $this->getMessages($inboxId, 20);

            foreach ($messages as $message) {
                $matchesSubject = $subject === null ||
                    stripos($message->subject, $subject) !== false;
                $matchesFrom = $from === null ||
                    ($message->fromAddress && stripos($message->fromAddress, $from) !== false);

                if ($matchesSubject && $matchesFrom) {
                    return $message;
                }
            }

            usleep((int)($interval * 1000000));
        }

        throw new TimeoutException("No matching email found within {$timeout}s");
    }

    /**
     * Extract OTP/verification code from email body
     */
    public function extractCode(Message $message): ?string
    {
        $text = $message->textBody ?? $message->htmlBody ?? '';

        $patterns = [
            '/\b(\d{6})\b/',           // 6 digits
            '/\b(\d{4})\b/',           // 4 digits
            '/code[:\s]+(\d{4,8})/i',  // "code: 123456"
            '/otp[:\s]+(\d{4,8})/i',   // "otp: 123456"
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $matches)) {
                return $matches[1];
            }
        }

        return null;
    }

    /**
     * Create inbox and wait for email
     * @return array{inbox: Inbox, message: Message}
     */
    public function createInboxAndWait(
        array $inboxOptions = [],
        ?string $subject = null,
        float $timeout = 60.0
    ): array {
        $inbox = $this->createInbox($inboxOptions);
        $message = $this->waitForEmail($inbox->id, $subject, null, $timeout);
        return ['inbox' => $inbox, 'message' => $message];
    }

    // ==================== HTTP Request ====================

    /**
     * @throws EphemeraException
     */
    private function request(string $method, string $path, array $body = []): array
    {
        try {
            $options = [];
            if (!empty($body)) {
                $options['json'] = $body;
            }

            $response = $this->httpClient->request($method, $path, $options);
            $content = $response->getBody()->getContents();

            if (empty($content)) {
                return [];
            }

            return json_decode($content, true) ?? [];
        } catch (RequestException $e) {
            throw $this->handleException($e);
        }
    }

    private function handleException(RequestException $e): EphemeraException
    {
        $response = $e->getResponse();

        if ($response === null) {
            return new NetworkException($e->getMessage());
        }

        $status = $response->getStatusCode();
        $body = json_decode($response->getBody()->getContents(), true) ?? [];
        $message = $body['message'] ?? $body['error'] ?? 'Unknown error';
        $code = $body['code'] ?? 'UNKNOWN';

        if ($status === 429) {
            $retryAfter = $response->getHeaderLine('Retry-After');
            return new RateLimitException($message, (int)$retryAfter);
        }

        return new EphemeraException($message, $code, $status);
    }
}
