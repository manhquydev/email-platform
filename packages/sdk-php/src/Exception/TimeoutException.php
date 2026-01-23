<?php

declare(strict_types=1);

namespace Ephemera\Exception;

class TimeoutException extends EphemeraException
{
    public function __construct(string $message, ?\Throwable $previous = null)
    {
        parent::__construct($message, 'TIMEOUT', 0, $previous);
    }
}
