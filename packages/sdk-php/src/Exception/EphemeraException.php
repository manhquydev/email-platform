<?php

declare(strict_types=1);

namespace Ephemera\Exception;

class EphemeraException extends \Exception
{
    public function __construct(
        string $message,
        public readonly string $code = 'UNKNOWN',
        public readonly int $status = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $status, $previous);
    }
}
