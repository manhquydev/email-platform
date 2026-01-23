package com.ephemera.sdk.exception;

public class RateLimitException extends EphemeraException {
    private final int retryAfter;

    public RateLimitException(String message, int retryAfter) {
        super(message, "RATE_LIMITED", 429);
        this.retryAfter = retryAfter;
    }

    public int getRetryAfter() { return retryAfter; }
}
