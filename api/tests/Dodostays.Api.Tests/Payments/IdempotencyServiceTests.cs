using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Dodostays.Api.Modules.Payments.Idempotency;

namespace Dodostays.Api.Tests.Payments;

public class IdempotencyServiceTests
{
    [Fact]
    public async Task GetOrExecute_NullKey_InvokesFactory_NoCache()
    {
        // Arrange
        var store = new FakeIdempotencyStore();
        var service = new IdempotencyService(store, NullLogger<IdempotencyService>.Instance);
        var factoryInvoked = false;

        // Act
        var result = await service.GetOrExecuteAsync<string>(
            headerKey: null,
            scope: "confirm",
            bookingId: null,
            factory: async ct =>
            {
                factoryInvoked = true;
                await Task.Yield();
                return ("body1", 200);
            });

        // Assert
        result.Body.Should().Be("body1");
        result.HttpStatusCode.Should().Be(200);
        result.WasCached.Should().BeFalse();
        factoryInvoked.Should().BeTrue();
        store.SavedCount.Should().Be(0);
    }

    [Fact]
    public async Task GetOrExecute_FirstCall_InvokesFactory_PersistsAndReturns()
    {
        // Arrange
        var store = new FakeIdempotencyStore();
        var service = new IdempotencyService(store, NullLogger<IdempotencyService>.Instance);
        var factoryInvoked = false;
        var bookingId = Guid.NewGuid();
        var testPayload = new TestDto(1, "test");

        // Act
        var result = await service.GetOrExecuteAsync(
            headerKey: "abc",
            scope: "confirm",
            bookingId: bookingId,
            factory: async ct =>
            {
                factoryInvoked = true;
                await Task.Yield();
                return (testPayload, 201);
            });

        // Assert
        result.Body.Should().BeEquivalentTo(testPayload);
        result.HttpStatusCode.Should().Be(201);
        result.WasCached.Should().BeFalse();
        factoryInvoked.Should().BeTrue();
        store.SavedCount.Should().Be(1);

        // Verify saved entry has correct keyHash + scope + bookingId
        var savedEntry = store.GetSavedEntry("confirm:abc");
        savedEntry.Should().NotBeNull();
        savedEntry!.Value.Scope.Should().Be("confirm");
        savedEntry!.Value.BookingId.Should().Be(bookingId);
    }

    [Fact]
    public async Task GetOrExecute_SecondCall_SameKey_ReturnsCachedNoFactory()
    {
        // Arrange
        var store = new FakeIdempotencyStore();
        var service = new IdempotencyService(store, NullLogger<IdempotencyService>.Instance);
        var testPayload = new TestDto(2, "cached");

        // Pre-populate cache
        store.SeedEntry("confirm:abc", testPayload, 200);

        var factoryInvoked = false;

        // Act
        var result = await service.GetOrExecuteAsync(
            headerKey: "abc",
            scope: "confirm",
            bookingId: null,
            factory: async ct =>
            {
                factoryInvoked = true;
                await Task.Yield();
                return (new TestDto(999, "should-not-appear"), 500);
            });

        // Assert
        result.Body.Should().BeEquivalentTo(testPayload);
        result.HttpStatusCode.Should().Be(200);
        result.WasCached.Should().BeTrue();
        factoryInvoked.Should().BeFalse();
    }

    [Fact]
    public async Task GetOrExecute_DifferentScopes_SameHeaderKey_AreIndependent()
    {
        // Arrange
        var store = new FakeIdempotencyStore();
        var service = new IdempotencyService(store, NullLogger<IdempotencyService>.Instance);
        var invocationCount = 0;

        // Act
        var result1 = await service.GetOrExecuteAsync(
            headerKey: "abc",
            scope: "confirm",
            bookingId: null,
            factory: async ct =>
            {
                invocationCount++;
                await Task.Yield();
                return (new TestDto(1, "confirm-result"), 200);
            });

        var result2 = await service.GetOrExecuteAsync(
            headerKey: "abc",
            scope: "cancel",
            bookingId: null,
            factory: async ct =>
            {
                invocationCount++;
                await Task.Yield();
                return (new TestDto(2, "cancel-result"), 202);
            });

        // Assert
        invocationCount.Should().Be(2);
        store.SavedCount.Should().Be(2);
        result1.Body.Name.Should().Be("confirm-result");
        result2.Body.Name.Should().Be("cancel-result");
        result1.WasCached.Should().BeFalse();
        result2.WasCached.Should().BeFalse();
    }

    [Fact]
    public async Task GetOrExecute_ExpiredEntry_IsTreatedAsCacheMiss()
    {
        // Arrange
        var store = new FakeIdempotencyStore();
        var service = new IdempotencyService(store, NullLogger<IdempotencyService>.Instance);

        // Seed an expired entry
        store.SeedExpired("confirm:expired-key");

        var factoryInvoked = false;

        // Act
        var result = await service.GetOrExecuteAsync(
            headerKey: "expired-key",
            scope: "confirm",
            bookingId: null,
            factory: async ct =>
            {
                factoryInvoked = true;
                await Task.Yield();
                return (new TestDto(1, "fresh"), 200);
            });

        // Assert
        factoryInvoked.Should().BeTrue();
        result.WasCached.Should().BeFalse();
        result.Body.Name.Should().Be("fresh");
    }

    private sealed record TestDto(int Id, string Name);
}

internal sealed class FakeIdempotencyStore : IIdempotencyStore
{
    private readonly Dictionary<string, (string ResponseBodyJson, int HttpStatusCode, DateTimeOffset ExpiresAt, DateTimeOffset CreatedAt, string Scope, Guid? BookingId)> _entries = new();
    public int SavedCount { get; private set; }

    public Task<IdempotencyEntry?> GetAsync(string keyHash, CancellationToken ct)
    {
        if (_entries.TryGetValue(keyHash, out var e) && e.ExpiresAt > DateTimeOffset.UtcNow)
            return Task.FromResult<IdempotencyEntry?>(new IdempotencyEntry(e.ResponseBodyJson, e.HttpStatusCode, e.ExpiresAt, e.CreatedAt));
        return Task.FromResult<IdempotencyEntry?>(null);
    }

    public Task SaveAsync(string keyHash, string scope, Guid? bookingId, string responseBodyJson, int httpStatusCode, DateTimeOffset expiresAt, CancellationToken ct)
    {
        _entries[keyHash] = (responseBodyJson, httpStatusCode, expiresAt, DateTimeOffset.UtcNow, scope, bookingId);
        SavedCount++;
        return Task.CompletedTask;
    }

    // Test helpers:
    public void SeedExpired(string keyHash) =>
        _entries[keyHash] = ("{}", 200, DateTimeOffset.UtcNow.AddHours(-1), DateTimeOffset.UtcNow.AddHours(-25), "test", null);

    public void SeedEntry<T>(string scopeAndKey, T body, int httpStatusCode)
    {
        var keyHash = ComputeKeyHash(scopeAndKey);
        var json = System.Text.Json.JsonSerializer.Serialize(body, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)
        {
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        });
        _entries[keyHash] = (json, httpStatusCode, DateTimeOffset.UtcNow.AddHours(24), DateTimeOffset.UtcNow, scopeAndKey.Split(':')[0], null);
    }

    public (string Scope, Guid? BookingId)? GetSavedEntry(string scopeAndKey)
    {
        var keyHash = ComputeKeyHash(scopeAndKey);
        if (_entries.TryGetValue(keyHash, out var e))
            return (e.Scope, e.BookingId);
        return null;
    }

    private static string ComputeKeyHash(string scopeAndKey)
    {
        var hashBytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(scopeAndKey));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}
