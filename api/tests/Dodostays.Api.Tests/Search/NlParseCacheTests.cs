using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Contracts.Search;
using Dodostays.Api.Modules.Search.Parsers;

namespace Dodostays.Api.Tests.Search;

public class NlParseCacheTests
{
    private static NlParseCache CreateCache(IDistributedCache distributed)
    {
        var opts = Options.Create(new NlParserOptions { CacheTtl = TimeSpan.FromHours(1) });
        return new NlParseCache(distributed, opts);
    }

    [Fact]
    public async Task GetOrAddAsync_returns_factory_value_on_miss()
    {
        var distributed = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        var cache = CreateCache(distributed);

        var calls = 0;
        Task<NlParseResult> Factory() { calls++; return Task.FromResult(new NlParseResult(Empty(), 0.5, "ack")); }

        var first = await cache.GetOrAddAsync("3 bed villa", null, Factory, CancellationToken.None);
        first.Confidence.Should().Be(0.5);
        calls.Should().Be(1);
    }

    [Fact]
    public async Task GetOrAddAsync_returns_cached_value_on_hit()
    {
        var distributed = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        var cache = CreateCache(distributed);
        var calls = 0;
        Task<NlParseResult> Factory() { calls++; return Task.FromResult(new NlParseResult(Empty(), 0.7, "ack")); }

        await cache.GetOrAddAsync("3 bed villa", null, Factory, CancellationToken.None);
        var second = await cache.GetOrAddAsync("3 bed villa", null, Factory, CancellationToken.None);

        second.Confidence.Should().Be(0.7);
        calls.Should().Be(1);
    }

    [Fact]
    public async Task Different_text_gets_different_cache_entry()
    {
        var distributed = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        var cache = CreateCache(distributed);
        var calls = 0;
        Task<NlParseResult> Factory() { calls++; return Task.FromResult(new NlParseResult(Empty(), 0.5, "ack")); }

        await cache.GetOrAddAsync("3 bed villa", null, Factory, CancellationToken.None);
        await cache.GetOrAddAsync("4 bed apartment", null, Factory, CancellationToken.None);
        calls.Should().Be(2);
    }

    private static ParsedFilters Empty() => new(
        Region: null, PropertyType: null,
        MinBedrooms: null, MinGuests: null,
        MaxNightlyMur: null, MinNightlyMur: null,
        RequiredAmenities: Array.Empty<Amenity>(),
        CheckIn: null, CheckOut: null,
        VerifiedOnly: false, UnknownTokens: Array.Empty<string>());
}
