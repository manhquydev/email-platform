<?php

declare(strict_types=1);

namespace Ephemera\Exception;

class NetworkException extends EphemeraException
{
    public function __construct(string $message, ?\Throwable $previous = null)
    {
        parent::__construct($message, 'NETWORK_ERROR', 0, $previous);
    }
}
