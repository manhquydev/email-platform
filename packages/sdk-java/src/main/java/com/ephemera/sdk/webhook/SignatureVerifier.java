package com.ephemera.sdk.webhook;

import com.ephemera.sdk.exception.EphemeraException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;

/**
 * Webhook signature verification for Ephemera webhooks
 *
 * <pre>{@code
 * boolean isValid = SignatureVerifier.verify(
 *     requestBody,
 *     request.getHeader("X-Ephemera-Signature"),
 *     webhookSecret,
 *     Long.parseLong(request.getHeader("X-Ephemera-Timestamp"))
 * );
 * }</pre>
 */
public class SignatureVerifier {

    /**
     * Verify a webhook signature
     *
     * @param payload Raw request body
     * @param signature Value from X-Ephemera-Signature header
     * @param secret Webhook secret from dashboard
     * @param timestamp Value from X-Ephemera-Timestamp header
     * @param toleranceSeconds Max age of webhook (default: 300)
     * @return true if signature is valid
     * @throws EphemeraException if timestamp is too old
     */
    public static boolean verify(
            String payload,
            String signature,
            String secret,
            long timestamp,
            int toleranceSeconds
    ) throws EphemeraException {
        long now = System.currentTimeMillis() / 1000;
        if (Math.abs(now - timestamp) > toleranceSeconds) {
            throw new EphemeraException(
                    "Timestamp outside tolerance: " + Math.abs(now - timestamp) + "s > " + toleranceSeconds + "s",
                    "WEBHOOK_TIMESTAMP_INVALID",
                    400
            );
        }

        try {
            String signaturePayload = timestamp + "." + payload;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
            byte[] hash = mac.doFinal(signaturePayload.getBytes());
            String expected = "sha256=" + bytesToHex(hash);

            return MessageDigest.isEqual(expected.getBytes(), signature.getBytes());
        } catch (Exception e) {
            throw new EphemeraException("Signature verification failed", "WEBHOOK_ERROR", 400);
        }
    }

    public static boolean verify(String payload, String signature, String secret, long timestamp)
            throws EphemeraException {
        return verify(payload, signature, secret, timestamp, 300);
    }

    /**
     * Sign a payload (for testing purposes)
     */
    public static SignResult sign(String payload, String secret, long timestamp) {
        try {
            String signaturePayload = timestamp + "." + payload;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
            byte[] hash = mac.doFinal(signaturePayload.getBytes());
            String signature = "sha256=" + bytesToHex(hash);
            return new SignResult(signature, timestamp);
        } catch (Exception e) {
            throw new RuntimeException("Failed to sign payload", e);
        }
    }

    public static SignResult sign(String payload, String secret) {
        return sign(payload, secret, System.currentTimeMillis() / 1000);
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    public record SignResult(String signature, long timestamp) {}
}
