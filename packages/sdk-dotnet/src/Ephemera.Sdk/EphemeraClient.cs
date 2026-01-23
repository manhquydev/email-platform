using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Ephemera.Sdk.Exceptions;
using Ephemera.Sdk.Models;

namespace Ephemera.Sdk;

/// <summary>
/// Ephemera API Client
/// Main client for interacting with the Ephemera temporary email API.
/// </summary>
/// <example>
/// <code>
/// using var client = new EphemeraClient("your-api-key");
/// var inbox = await client.CreateInboxAsync();
/// var message = await client.WaitForEmailAsync(inbox.Id, "Verification");
/// </code>
/// </example>
public class EphemeraClient : IDisposable
{
    private const string DefaultBaseUrl = "https://api.manhquy.click";
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(30);

    private readonly string _apiKey;
    private readonly string _baseUrl;
    private readonly HttpClient _httpClient;
    private readonly JsonSerializerOptions _jsonOptions;

    public EphemeraClient(string apiKey, string? baseUrl = null)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new ArgumentException("API key is required", nameof(apiKey));

        _apiKey = apiKey;
        _baseUrl = (baseUrl ?? DefaultBaseUrl).TrimEnd('/');
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(_baseUrl),
            Timeout = DefaultTimeout
        };
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "ephemera-dotnet/1.0.0");

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    // ==================== Domain Methods ====================

    public async Task<IReadOnlyList<Domain>> ListDomainsAsync(CancellationToken ct = default)
    {
        var response = await GetAsync<PaginatedResponse<Domain>>("/domains?limit=100", ct);
        return response.Data;
    }

    public async Task<Domain> GetDomainAsync(string id, CancellationToken ct = default)
    {
        return await GetAsync<Domain>($"/domains/{id}", ct);
    }

    // ==================== Inbox Methods ====================

    public async Task<Inbox> CreateInboxAsync(CreateInboxRequest? request = null, CancellationToken ct = default)
    {
        return await PostAsync<Inbox>("/inboxes", request, ct);
    }

    public async Task<Inbox> GetInboxAsync(string id, CancellationToken ct = default)
    {
        return await GetAsync<Inbox>($"/inboxes/{id}", ct);
    }

    public async Task<IReadOnlyList<Inbox>> ListInboxesAsync(int limit = 100, CancellationToken ct = default)
    {
        var response = await GetAsync<PaginatedResponse<Inbox>>($"/inboxes?limit={limit}&personal=true", ct);
        return response.Data;
    }

    public async Task DeleteInboxAsync(string id, CancellationToken ct = default)
    {
        await DeleteAsync($"/inboxes/{id}", ct);
    }

    // ==================== Message Methods ====================

    public async Task<IReadOnlyList<Message>> GetMessagesAsync(string inboxId, int limit = 50, CancellationToken ct = default)
    {
        var response = await GetAsync<PaginatedResponse<Message>>($"/messages?inboxId={inboxId}&limit={limit}", ct);
        return response.Data;
    }

    public async Task<Message> GetMessageAsync(string id, CancellationToken ct = default)
    {
        return await GetAsync<Message>($"/messages/{id}", ct);
    }

    public async Task DeleteMessageAsync(string id, CancellationToken ct = default)
    {
        await DeleteAsync($"/messages/{id}", ct);
    }

    // ==================== Convenience Methods ====================

    public async Task<Message> WaitForEmailAsync(
        string inboxId,
        string? subject = null,
        string? from = null,
        TimeSpan? timeout = null,
        CancellationToken ct = default)
    {
        var timeoutValue = timeout ?? TimeSpan.FromSeconds(60);
        var start = DateTime.UtcNow;

        while (DateTime.UtcNow - start < timeoutValue)
        {
            ct.ThrowIfCancellationRequested();

            var messages = await GetMessagesAsync(inboxId, 20, ct);
            foreach (var msg in messages)
            {
                var matchesSubject = subject == null ||
                    msg.Subject.Contains(subject, StringComparison.OrdinalIgnoreCase);
                var matchesFrom = from == null ||
                    (msg.FromAddress?.Contains(from, StringComparison.OrdinalIgnoreCase) ?? false);

                if (matchesSubject && matchesFrom)
                {
                    return msg;
                }
            }

            await Task.Delay(2000, ct);
        }

        throw new TimeoutException($"No matching email found within {timeoutValue.TotalSeconds}s");
    }

    public string? ExtractCode(Message message)
    {
        var text = message.TextBody ?? message.HtmlBody ?? "";

        string[] patterns =
        [
            @"\b(\d{6})\b",           // 6 digits
            @"\b(\d{4})\b",           // 4 digits
            @"(?i)code[:\s]+(\d{4,8})", // "code: 123456"
            @"(?i)otp[:\s]+(\d{4,8})"   // "otp: 123456"
        ];

        foreach (var pattern in patterns)
        {
            var match = Regex.Match(text, pattern);
            if (match.Success)
            {
                return match.Groups[1].Value;
            }
        }

        return null;
    }

    // ==================== HTTP Methods ====================

    private async Task<T> GetAsync<T>(string path, CancellationToken ct)
    {
        var response = await _httpClient.GetAsync(path, ct);
        await EnsureSuccessAsync(response, ct);
        var content = await response.Content.ReadAsStringAsync(ct);
        return JsonSerializer.Deserialize<T>(content, _jsonOptions)!;
    }

    private async Task<T> PostAsync<T>(string path, object? body, CancellationToken ct)
    {
        var content = body != null
            ? new StringContent(JsonSerializer.Serialize(body, _jsonOptions), Encoding.UTF8, "application/json")
            : new StringContent("{}", Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync(path, content, ct);
        await EnsureSuccessAsync(response, ct);
        var responseContent = await response.Content.ReadAsStringAsync(ct);
        return JsonSerializer.Deserialize<T>(responseContent, _jsonOptions)!;
    }

    private async Task DeleteAsync(string path, CancellationToken ct)
    {
        var response = await _httpClient.DeleteAsync(path, ct);
        await EnsureSuccessAsync(response, ct);
    }

    private async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken ct)
    {
        if (response.IsSuccessStatusCode) return;

        var content = await response.Content.ReadAsStringAsync(ct);
        var status = (int)response.StatusCode;

        if (status == 429)
        {
            var retryAfter = response.Headers.RetryAfter?.Delta?.Seconds ?? 60;
            throw new RateLimitException("Rate limit exceeded", (int)retryAfter);
        }

        try
        {
            var error = JsonSerializer.Deserialize<ErrorResponse>(content, _jsonOptions);
            throw new EphemeraException(error?.Message ?? "Unknown error", error?.Code ?? "UNKNOWN", status);
        }
        catch (JsonException)
        {
            throw new EphemeraException($"HTTP {status}", "HTTP_ERROR", status);
        }
    }

    public void Dispose()
    {
        _httpClient.Dispose();
    }

    private record ErrorResponse(string? Message, string? Code);
}
