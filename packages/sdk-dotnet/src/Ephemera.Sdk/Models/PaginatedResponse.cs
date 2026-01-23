namespace Ephemera.Sdk.Models;

public record PaginatedResponse<T>(
    IReadOnlyList<T> Data,
    string? NextCursor = null,
    PaginatedMeta? Meta = null
);

public record PaginatedMeta(
    int Total,
    int Offset,
    int Limit
);
