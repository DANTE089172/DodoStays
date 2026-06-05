using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Dodostays.Api.Modules.Bookings.Ical;

namespace Dodostays.Api.Tests.Bookings;

public class SignedIcalUrlGeneratorTests
{
    private static SignedIcalUrlGenerator Create(string key = "test-signing-key-32-chars-or-longer-please") =>
        new(Options.Create(new IcalOptions { SigningKey = key, FeedBaseUrl = "http://localhost:5080" }));

    [Fact]
    public void Generate_and_verify_round_trip()
    {
        var gen = Create();
        var listingId = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var url = gen.GenerateUrl(listingId);
        url.Should().StartWith("http://localhost:5080/ical/listings/33333333-3333-3333-3333-333333333333.ics?token=");
        var token = url.Split("token=")[1];
        gen.Verify(listingId, token).Should().BeTrue();
    }

    [Fact]
    public void Verify_rejects_token_for_different_listing()
    {
        var gen = Create();
        var listingId1 = Guid.NewGuid();
        var listingId2 = Guid.NewGuid();
        var url = gen.GenerateUrl(listingId1);
        var token = url.Split("token=")[1];
        gen.Verify(listingId2, token).Should().BeFalse();
    }

    [Fact]
    public void Verify_rejects_garbage_token()
    {
        var gen = Create();
        gen.Verify(Guid.NewGuid(), "not-a-real-token").Should().BeFalse();
    }

    [Fact]
    public void Verify_rejects_token_signed_with_different_key()
    {
        var gen1 = Create("first-signing-key-32-chars-or-longer-please");
        var gen2 = Create("second-signing-key-32-chars-or-longer-please");
        var listingId = Guid.NewGuid();
        var url = gen1.GenerateUrl(listingId);
        var token = url.Split("token=")[1];
        gen2.Verify(listingId, token).Should().BeFalse();
    }
}
