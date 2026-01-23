using System.Security.Cryptography;
using System.Text;
using Ephemera.Sdk.Exceptions;

namespace Ephemera.Sdk.Webhook;

/// <summary>
/// Webhook signature verification for Ephemera webhooks
/// </summary>
/// <example>
/// <code>
/// var isValid = SignatureVerifier.Verify(
///     requestBody,
///     Request.Headers["X-Ephemera-Signature"],
///     Environment.GetEnvironmentVariable("EPHEMERA_WEBHOOK_SECRET")!,
///     long.Parse(Request.Headers["X-Ephemera-Timestamp"])
/// );
/// </code>
/// </example>
public static class SignatureVerifier
{
    /// <summary>
    /// Verify a webhook signature
    /// </summary>
    /// <param name="payload">Raw request body</param>
    /// <param name="signature">Value from X-Ephemera-Signature header</param>
    /// <param name="secret">Webhook secret from dashboard</param>
    /// <param name="timestamp">Value from X-Ephemera-Timestamp header</param>
    /// <param name="toleranceSeconds">Max age of webhook (default: 300)</param>
    /// <returns>True if signature is valid</returns>
    /// <exception cref="EphemeraException">If timestamp is too old</exception>
    public static bool Verify(
        string payload,
        string signature,
        string secret,
        long timestamp,
        int toleranceSeconds = 300)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (Math.Abs(now - timestamp) > toleranceSeconds)
        {
            throw new EphemeraException(
                $"Timestamp outside tolerance: {Math.Abs(now - timestamp)}s > {toleranceSeconds}s",
                "WEBHOOK_TIMESTAMP_INVALID",
                400
            );
        }

        var signaturePayload = $"{timestamp}.{payload}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signaturePayload));
        var expected = $"sha256={Convert.ToHexString(hash).ToLower()}";

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature)
        );
    }

    /// <summary>
    /// Sign a payload (for testing purposes)
    /// </summary>
    public static (string Signature, long Timestamp) Sign(string payload, string secret, long? timestamp = null)
    {
        var ts = timestamp ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var signaturePayload = $"{ts}.{payload}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signaturePayload));
        var signature = $"sha256={Convert.ToHexString(hash).ToLower()}";

        return (signature, ts);
    }
}
