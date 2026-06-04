using Xunit;
using FluentAssertions;
using FluentValidation.TestHelper;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Validation;

namespace Dodostays.Api.Tests.Listings;

public class CreateListingValidatorTests
{
    private readonly CreateListingValidator _v = new();

    private static CreateListingRequest Valid() => new(
        Title: "Beach villa with pool",
        Description: "A lovely 3-bed villa near the beach.",
        PropertyType: PropertyType.Villa,
        Region: "flic-en-flac",
        AddressLine: "12 Coral Lane, Flic en Flac",
        Latitude: -20.27,
        Longitude: 57.36,
        Bedrooms: 3,
        Beds: 4,
        Bathrooms: 2,
        MaxGuests: 6,
        NightlyRateMur: 5000m,
        CleaningFeeMur: 800m,
        MinStayNights: 2,
        Amenities: new[] { Amenity.Pool, Amenity.AirCon });

    [Fact]
    public void Valid_request_passes()
    {
        _v.TestValidate(Valid()).IsValid.Should().BeTrue();
    }

    [Fact]
    public void Empty_title_fails()
    {
        var req = Valid() with { Title = "" };
        _v.TestValidate(req).ShouldHaveValidationErrorFor(r => r.Title);
    }

    [Fact]
    public void Latitude_outside_mauritius_bounds_fails()
    {
        var req = Valid() with { Latitude = -50, Longitude = 60 };
        _v.TestValidate(req).ShouldHaveValidationErrorFor(r => r.Latitude);
    }

    [Fact]
    public void Negative_nightly_rate_fails()
    {
        var req = Valid() with { NightlyRateMur = -100m };
        _v.TestValidate(req).ShouldHaveValidationErrorFor(r => r.NightlyRateMur);
    }

    [Fact]
    public void Zero_max_guests_fails()
    {
        var req = Valid() with { MaxGuests = 0 };
        _v.TestValidate(req).ShouldHaveValidationErrorFor(r => r.MaxGuests);
    }

    [Fact]
    public void MinStayNights_zero_fails()
    {
        var req = Valid() with { MinStayNights = 0 };
        _v.TestValidate(req).ShouldHaveValidationErrorFor(r => r.MinStayNights);
    }

    [Fact]
    public void Empty_region_fails()
    {
        var req = Valid() with { Region = "" };
        _v.TestValidate(req).ShouldHaveValidationErrorFor(r => r.Region);
    }
}
