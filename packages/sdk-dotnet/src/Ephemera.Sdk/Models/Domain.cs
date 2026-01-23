namespace Ephemera.Sdk.Models;

public record Domain(
    string Id,
    string Name,
    bool Verified = false,
    bool IsPublic = false,
    string? OwnerId = null,
    DateTime? CreatedAt = null
);
