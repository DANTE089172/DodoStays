using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Modules.Search.Parsers;

public sealed class NlParseCache
{
    private readonly IDistributedCache _cache;
    private readonly NlParserOptions _options;

    public NlParseCache(IDistributedCache cache, IOptions<NlParserOptions> options)
    {
        _cache = cache;
        _options = options.Value;
    }

    public async Task<NlParseResult> GetOrAddAsync(
        string text,
        ParsedFilters? currentFilters,
        Func<Task<NlParseResult>> factory,
        CancellationToken ct)
    {
        var key = BuildKey(text, currentFilters);
        var cached = await _cache.GetAsync(key, ct);
        if (cached is not null && cached.Length > 0)
        {
            try
            {
                var hit = JsonSerializer.Deserialize<NlParseResult>(cached, CacheJsonOpts);
                if (hit.Filters is not null) return hit;
            }
            catch { /* fall through */ }
        }

        var fresh = await factory();
        var bytes = JsonSerializer.SerializeToUtf8Bytes(fresh, CacheJsonOpts);
        await _cache.SetAsync(key, bytes, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = _options.CacheTtl
        }, ct);
        return fresh;
    }

    private static string BuildKey(string text, ParsedFilters? currentFilters)
    {
        var normalised = text.Trim().ToLowerInvariant();
        var filterJson = currentFilters is null ? "" : JsonSerializer.Serialize(currentFilters, CacheJsonOpts);
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalised + "|" + filterJson));
        return "ds-nl:" + Convert.ToHexString(bytes);
    }

    private static readonly JsonSerializerOptions CacheJsonOpts = new(JsonSerializerDefaults.Web)
    {
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };
}
