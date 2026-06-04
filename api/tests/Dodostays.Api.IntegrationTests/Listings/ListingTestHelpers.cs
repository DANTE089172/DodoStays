using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.IntegrationTests.Listings;

internal static class ListingTestHelpers
{
    public static async Task<(HttpClient client, AuthResponse auth)> CreateAuthenticatedHostAsync(WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient();
        var email = $"host-{Guid.NewGuid():N}@test.dodostays.local";
        var signup = await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, "Aa1!aaaaaa", "Test Host", "en", UserRole.Host));
        signup.EnsureSuccessStatusCode();
        var auth = await signup.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        return (client, auth);
    }

    public static CreateListingRequest SampleListing(string region = "flic-en-flac") => new(
        Title: "Sunny villa with pool",
        Description: "Three-bedroom villa near the beach.",
        PropertyType: PropertyType.Villa,
        Region: region,
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
        Amenities: new[] { Amenity.Pool, Amenity.AirCon, Amenity.Wifi });
}
