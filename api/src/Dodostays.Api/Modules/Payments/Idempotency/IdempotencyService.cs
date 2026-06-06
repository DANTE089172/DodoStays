using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Dodostays.Api.Modules.Payments.Idempotency;

public sealed class IdempotencyService : IIdempotencyService
{
    private readonly IIdempotencyStore _store;
    private readonly ILogger<IdempotencyService> _logger;

    // Match API's JsonSerializerOptions (from Program.cs ConfigureHttpJsonOptions)
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public IdempotencyService(IIdempotencyStore store, ILogger<IdempotencyService> logger)
    {
        _store = store;
        _logger = logger;
    }

    public async Task<IdempotentResult<TResult>> GetOrExecuteAsync<TResult>(
        string? headerKey,
        string scope,
        Guid? bookingId,
        Func<CancellationToken, Task<(TResult body, int httpStatusCode)>> factory,
        TimeSpan? ttl = null,
        CancellationToken ct = default)
    {
        // If no headerKey provided, skip caching entirely
        if (string.IsNullOrWhiteSpace(headerKey))
        {
            var (body, httpStatusCode) = await factory(ct);
            return new IdempotentResult<TResult>(body, httpStatusCode, WasCached: false);
        }

        // Compute SHA-256 hash of "scope:headerKey"
        var keyHash = ComputeKeyHash(scope, headerKey);

        // Try to fetch cached entry
        var entry = await _store.GetAsync(keyHash, ct);
        if (entry != null)
        {
            _logger.LogDebug("Idempotency cache hit for scope={Scope}", scope);
            var cachedBody = JsonSerializer.Deserialize<TResult>(entry.ResponseBodyJson, JsonOptions)!;
            return new IdempotentResult<TResult>(cachedBody, entry.HttpStatusCode, WasCached: true);
        }

        // Cache miss — invoke factory
        var (freshBody, freshStatusCode) = await factory(ct);

        // Serialize and persist
        var responseBodyJson = JsonSerializer.Serialize(freshBody, JsonOptions);
        var expiresAt = DateTimeOffset.UtcNow + (ttl ?? TimeSpan.FromHours(24));
        await _store.SaveAsync(keyHash, scope, bookingId, responseBodyJson, freshStatusCode, expiresAt, ct);

        _logger.LogDebug("Idempotency cache miss for scope={Scope}, saved with TTL {Ttl}",
            scope, ttl ?? TimeSpan.FromHours(24));

        return new IdempotentResult<TResult>(freshBody, freshStatusCode, WasCached: false);
    }

    private static string ComputeKeyHash(string scope, string headerKey)
    {
        var input = $"{scope}:{headerKey}";
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}
