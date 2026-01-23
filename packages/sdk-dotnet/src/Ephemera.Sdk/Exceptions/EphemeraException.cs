namespace Ephemera.Sdk.Exceptions;

public class EphemeraException : Exception
{
    public string Code { get; }
    public int Status { get; }

    public EphemeraException(string message, string code, int status)
        : base(message)
    {
        Code = code;
        Status = status;
    }

    public EphemeraException(string message, string code, int status, Exception innerException)
        : base(message, innerException)
    {
        Code = code;
        Status = status;
    }
}
