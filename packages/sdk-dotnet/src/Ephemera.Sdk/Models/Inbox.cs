namespace Ephemera.Sdk.Models;

public record Inbox(
    string Id,
    string LocalPart,
    string DomainId,
    string Address,
    string? OwnerId = null,
    DateTime? ExpiresAt = null,
    DateTime? CreatedAt = null,
    Domain? Domain = null
);

public record CreateInboxRequest(
    string? LocalPart = null,
    string? DomainId = null,
    DateTime? ExpiresAt = null
);
