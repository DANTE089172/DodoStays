using System.Text.RegularExpressions;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.Modules.Listings.Domain;

public static partial class ListingVibeClassifier
{
    private static readonly HashSet<string> MountainRegions = new(StringComparer.OrdinalIgnoreCase)
    {
        "le-morne", "chamarel", "tamarin"
    };

    private static readonly HashSet<string> TownRegions = new(StringComparer.OrdinalIgnoreCase)
    {
        "grand-baie", "pereybere", "flic-en-flac"
    };

    [GeneratedRegex(@"\b(mountain|view|elevated|hill|panoram)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex MountainDescriptionRegex();

    public static ListingVibe Classify(string? region, string? description, IReadOnlyList<Amenity> amenities)
    {
        amenities ??= Array.Empty<Amenity>();
        var hasBeach = amenities.Contains(Amenity.BeachAccess);
        var hasGarden = amenities.Contains(Amenity.Garden);

        if (hasBeach) return ListingVibe.Wave;

        var regionLower = region?.ToLowerInvariant();
        if (regionLower is not null && MountainRegions.Contains(regionLower))
            return ListingVibe.Mountain;

        if (!string.IsNullOrEmpty(description) && MountainDescriptionRegex().IsMatch(description))
            return ListingVibe.Mountain;

        if (hasGarden && !hasBeach
            && (regionLower is null
                || !string.Equals(regionLower, "grand-baie", StringComparison.OrdinalIgnoreCase)))
            return ListingVibe.Leaf;

        if (regionLower is not null && TownRegions.Contains(regionLower))
            return ListingVibe.Town;

        return ListingVibe.Mixed;
    }

    public static PriceBand PriceBandFor(decimal nightlyMur)
    {
        if (nightlyMur <= 3000m) return PriceBand.Budget;
        if (nightlyMur <= 7000m) return PriceBand.Mid;
        return PriceBand.Premium;
    }
}
