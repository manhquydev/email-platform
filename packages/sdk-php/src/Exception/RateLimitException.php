<?php

declare(strict_types=1);

namespace Ephemera\Exception;

class RateLimitException extends EphemeraException
{
    public function __construct(
        string $message,
        public readonly int $retryAfter = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, 'RATE_LIMITED', 429, $previous);
    }
}
