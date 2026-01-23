<?php

declare(strict_types=1);

namespace Ephemera\Webhook;

use Ephemera\Exception\EphemeraException;

/**
 * Webhook signature verification for Ephemera webhooks
 *
 * @example
 * ```php
 * $isValid = SignatureVerifier::verify(
 *     $requestBody,
 *     $_SERVER['HTTP_X_EPHEMERA_SIGNATURE'],
 *     $webhookSecret,
 *     (int)$_SERVER['HTTP_X_EPHEMERA_TIMESTAMP']
 * );
 * ```
 */
class SignatureVerifier
{
    /**
     * Verify a webhook signature
     *
     * @param string $payload Raw request body
     * @param string $signature Value from X-Ephemera-Signature header
     * @param string $secret Webhook secret from dashboard
     * @param int $timestamp Value from X-Ephemera-Timestamp header
     * @param int $toleranceSeconds Max age of webhook (default: 300)
     * @return bool True if signature is valid
     * @throws EphemeraException If timestamp is too old
     */
    public static function verify(
        string $payload,
        string $signature,
        string $secret,
        int $timestamp,
        int $toleranceSeconds = 300
    ): bool {
        $now = time();
        if (abs($now - $timestamp) > $toleranceSeconds) {
            throw new EphemeraException(
                "Timestamp outside tolerance: " . abs($now - $timestamp) . "s > {$toleranceSeconds}s",
                'WEBHOOK_TIMESTAMP_INVALID',
                400
            );
        }

        $signaturePayload = "{$timestamp}.{$payload}";
        $expected = 'sha256=' . hash_hmac('sha256', $signaturePayload, $secret);

        return hash_equals($expected, $signature);
    }

    /**
     * Sign a payload (for testing purposes)
     *
     * @return array{signature: string, timestamp: int}
     */
    public static function sign(string $payload, string $secret, ?int $timestamp = null): array
    {
        $ts = $timestamp ?? time();
        $signaturePayload = "{$ts}.{$payload}";
        $signature = 'sha256=' . hash_hmac('sha256', $signaturePayload, $secret);

        return [
            'signature' => $signature,
            'timestamp' => $ts,
        ];
    }

    /**
     * Extract webhook headers from request
     *
     * @return array{signature: string, timestamp: int}|null
     */
    public static function extractHeaders(array $headers): ?array
    {
        $signature = $headers['X-Ephemera-Signature']
            ?? $headers['x-ephemera-signature']
            ?? $headers['HTTP_X_EPHEMERA_SIGNATURE']
            ?? null;

        $timestamp = $headers['X-Ephemera-Timestamp']
            ?? $headers['x-ephemera-timestamp']
            ?? $headers['HTTP_X_EPHEMERA_TIMESTAMP']
            ?? null;

        if ($signature === null || $timestamp === null) {
            return null;
        }

        return [
            'signature' => $signature,
            'timestamp' => (int)$timestamp,
        ];
    }
}
