namespace Ephemera.Sdk.Exceptions;

public class RateLimitException : EphemeraException
{
    public int RetryAfter { get; }

    public RateLimitException(string message, int retryAfter)
        : base(message, "RATE_LIMITED", 429)
    {
        RetryAfter = retryAfter;
    }
}
