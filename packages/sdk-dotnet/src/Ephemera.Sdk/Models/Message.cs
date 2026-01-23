namespace Ephemera.Sdk.Models;

public record Message(
    string Id,
    string InboxId,
    string MessageId,
    string ToAddress,
    string Subject,
    string? FromAddress = null,
    string? TextBody = null,
    string? HtmlBody = null,
    DateTime? ReceivedAt = null,
    bool IsRead = false,
    bool IsPinned = false,
    double? SpamScore = null,
    long Size = 0,
    IReadOnlyList<Attachment>? Attachments = null
);

public record Attachment(
    string Id,
    string Filename,
    string MimeType,
    long Size,
    string StorageKey
);
