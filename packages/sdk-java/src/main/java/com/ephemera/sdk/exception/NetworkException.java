package com.ephemera.sdk.exception;

public class NetworkException extends EphemeraException {
    public NetworkException(String message) {
        super(message, "NETWORK_ERROR", 0);
    }

    public NetworkException(String message, Throwable cause) {
        super(message, "NETWORK_ERROR", 0, cause);
    }
}
