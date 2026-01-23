package com.ephemera.sdk.exception;

public class EphemeraException extends Exception {
    private final String code;
    private final int status;

    public EphemeraException(String message, String code, int status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public EphemeraException(String message, String code, int status, Throwable cause) {
        super(message, cause);
        this.code = code;
        this.status = status;
    }

    public String getCode() { return code; }
    public int getStatus() { return status; }
}
