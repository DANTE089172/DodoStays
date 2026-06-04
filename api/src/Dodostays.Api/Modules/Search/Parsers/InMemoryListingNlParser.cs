using System.Text.RegularExpressions;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Modules.Search.Parsers;

public sealed partial class InMemoryListingNlParser : IListingNlParser
{
    private static readonly Dictionary<string, string> RegionAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["grand baie"] = "grand-baie",
        ["grand bay"] = "grand-baie",
        ["flic en flac"] = "flic-en-flac",
        ["flic-en-flac"] = "flic-en-flac",
        ["tamarin"] = "tamarin",
        ["trou aux biches"] = "trou-aux-biches",
        ["trou-aux-biches"] = "trou-aux-biches",
        ["pereybere"] = "pereybere",
        ["belle mare"] = "belle-mare",
        ["belle-mare"] = "belle-mare",
        ["le morne"] = "le-morne",
        ["le-morne"] = "le-morne",
        ["blue bay"] = "blue-bay",
        ["blue-bay"] = "blue-bay",
        ["albion"] = "albion"
    };

    private static readonly Dictionary<string, Amenity> AmenityKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        ["pool"] = Amenity.Pool, ["swimming pool"] = Amenity.Pool,
        ["beach"] = Amenity.BeachAccess, ["beach access"] = Amenity.BeachAccess,
        ["wifi"] = Amenity.Wifi, ["wi-fi"] = Amenity.Wifi, ["internet"] = Amenity.Wifi,
        ["aircon"] = Amenity.AirCon, ["air con"] = Amenity.AirCon, ["air conditioning"] = Amenity.AirCon, ["a/c"] = Amenity.AirCon,
        ["kitchen"] = Amenity.Kitchen,
        ["parking"] = Amenity.Parking,
        ["tv"] = Amenity.Tv, ["television"] = Amenity.Tv,
        ["washing machine"] = Amenity.WashingMachine, ["washer"] = Amenity.WashingMachine,
        ["balcony"] = Amenity.Balcony,
        ["garden"] = Amenity.Garden,
        ["bbq"] = Amenity.Bbq, ["barbecue"] = Amenity.Bbq,
        ["generator"] = Amenity.Generator
    };

    public Task<NlParseResult> ParseAsync(string text, ParsedFilters? currentFilters, CancellationToken ct)
    {
        var lower = text.ToLowerInvariant();
        var matchedTokens = new HashSet<string>();

        string? region = currentFilters?.Region;
        foreach (var alias in RegionAliases.Keys.OrderByDescending(k => k.Length))
        {
            if (lower.Contains(alias)) { region = RegionAliases[alias]; matchedTokens.Add(alias); break; }
        }

        PropertyType? propertyType = currentFilters?.PropertyType;
        if (Regex.IsMatch(lower, @"\bvilla\b")) { propertyType = PropertyType.Villa; matchedTokens.Add("villa"); }
        else if (Regex.IsMatch(lower, @"\bapartment\b|\bappartement\b|\bapt\b|\bflat\b")) { propertyType = PropertyType.Apartment; matchedTokens.Add("apartment"); }
        else if (Regex.IsMatch(lower, @"\bguesthouse\b|\bguest house\b|\bb&b\b|\bbnb\b")) { propertyType = PropertyType.Guesthouse; matchedTokens.Add("guesthouse"); }

        int? minBedrooms = currentFilters?.MinBedrooms;
        var bedMatch = Regex.Match(lower, @"(\d+)\s*(?:bed(?:room)?s?|br\b)");
        if (bedMatch.Success) { minBedrooms = int.Parse(bedMatch.Groups[1].Value); matchedTokens.Add(bedMatch.Value); }

        int? minGuests = currentFilters?.MinGuests;
        var guestMatch = Regex.Match(lower, @"(?:for\s+)?(\d+)\s*(?:guests?|people|persons?|pax|adults?|sleeps?)");
        if (guestMatch.Success) { minGuests = int.Parse(guestMatch.Groups[1].Value); matchedTokens.Add(guestMatch.Value); }

        decimal? maxPrice = currentFilters?.MaxNightlyMur;
        var maxPriceMatch = Regex.Match(lower, @"(?:under|below|less than|max(?:imum)?|up to|<)\s*(?:mur\s*|rs\s*)?(\d{3,7})(?:\s*mur)?(?:\s*(?:per|/)\s*night)?");
        if (maxPriceMatch.Success) { maxPrice = decimal.Parse(maxPriceMatch.Groups[1].Value); matchedTokens.Add(maxPriceMatch.Value); }

        decimal? minPrice = currentFilters?.MinNightlyMur;
        var minPriceMatch = Regex.Match(lower, @"(?:over|above|more than|>)\s*(?:mur\s*|rs\s*)?(\d{3,7})");
        if (minPriceMatch.Success) { minPrice = decimal.Parse(minPriceMatch.Groups[1].Value); matchedTokens.Add(minPriceMatch.Value); }

        var amenities = new List<Amenity>(currentFilters?.RequiredAmenities ?? Array.Empty<Amenity>());
        foreach (var (kw, amenity) in AmenityKeywords.OrderByDescending(p => p.Key.Length))
        {
            if (lower.Contains(kw) && !amenities.Contains(amenity)) { amenities.Add(amenity); matchedTokens.Add(kw); }
        }

        bool verifiedOnly = currentFilters?.VerifiedOnly ?? false;
        if (Regex.IsMatch(lower, @"\bverified\b|\binspected\b")) { verifiedOnly = true; matchedTokens.Add("verified"); }

        var checkIn = currentFilters?.CheckIn;
        var checkOut = currentFilters?.CheckOut;

        var meaningfulTokens = Regex.Matches(lower, @"\b\w{3,}\b").Count;
        var capturedSignals =
            (region is not null ? 1 : 0) +
            (propertyType is not null ? 1 : 0) +
            (minBedrooms.HasValue ? 1 : 0) +
            (minGuests.HasValue ? 1 : 0) +
            (maxPrice.HasValue ? 1 : 0) +
            (minPrice.HasValue ? 1 : 0) +
            amenities.Count +
            (verifiedOnly ? 1 : 0);
        double confidence = meaningfulTokens == 0 ? 0.1 : Math.Clamp(0.4 + (0.1 * capturedSignals), 0.1, 0.95);
        if (capturedSignals == 0) confidence = 0.1;

        var unknownTokens = Regex.Matches(lower, @"\b\w{3,}\b")
            .Select(m => m.Value)
            .Where(t => !matchedTokens.Any(mt => mt.Contains(t, StringComparison.OrdinalIgnoreCase)))
            .Distinct()
            .Take(20)
            .ToList();

        var filters = new ParsedFilters(region, propertyType, minBedrooms, minGuests,
            maxPrice, minPrice, amenities, checkIn, checkOut, verifiedOnly, unknownTokens);
        var ack = BuildAcknowledgement(filters, capturedSignals);
        return Task.FromResult(new NlParseResult(filters, confidence, ack));
    }

    private static string BuildAcknowledgement(ParsedFilters f, int signals)
    {
        if (signals == 0) return "I couldn't extract specific filters — try mentioning a region, property type, beds, or budget.";
        var parts = new List<string>();
        if (f.PropertyType is not null) parts.Add(f.PropertyType.ToString()!.ToLowerInvariant() + "s");
        if (f.MinBedrooms.HasValue) parts.Add($"{f.MinBedrooms}+ bed");
        if (f.Region is not null) parts.Add($"in {f.Region.Replace('-', ' ')}");
        if (f.MinGuests.HasValue) parts.Add($"for {f.MinGuests}+ guests");
        if (f.MaxNightlyMur.HasValue) parts.Add($"under MUR {f.MaxNightlyMur:N0}/night");
        if (f.RequiredAmenities.Count > 0) parts.Add("with " + string.Join(", ", f.RequiredAmenities.Select(a => a.ToString().ToLowerInvariant())));
        if (f.VerifiedOnly) parts.Add("(verified only)");
        return "Searching: " + string.Join(", ", parts);
    }
}
