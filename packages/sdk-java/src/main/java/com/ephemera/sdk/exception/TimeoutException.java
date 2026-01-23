package com.ephemera.sdk.exception;

public class TimeoutException extends EphemeraException {
    public TimeoutException(String message) {
        super(message, "TIMEOUT", 0);
    }
}
