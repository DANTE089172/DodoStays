# DodoStays Plan 02b — Anchor & Lifestyle Pins (Map-as-product search)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `/listings` grid with a map-first search where (1) tourists drop **anchors** on the map (places they care about — Le Morne for kitesurfing, the airport, a wedding venue) and listings re-rank by drive-time to those anchors; (2) listings render as **lifestyle-shaped pins** (wave / mountain / leaf / town / default) colored by price band, so the geography of stays is glanceable; (3) AI conversational search still parses free-text into filters and pans the map. Voice-on-map and story-hover are deferred to Plan 02c.

**Architecture:**
- New `Search` module under `api/src/Dodostays.Api/Modules/Search/` with `IListingNlParser` (InMemory + Claude skeleton) for free-text parsing, `IDriveTimeService` for anchor-based travel time (real Mapbox Directions adapter + InMemory haversine fallback), and a `ListingVibeClassifier` that computes the lifestyle category per listing.
- Listing summary DTOs gain `Latitude`, `Longitude`, `Vibe`, `PriceBand`.
- `/api/listings` extended with `bbox` (map-bounds search), `lat`/`lng` (radius), and `anchors` (JSON-encoded list of `[lat, lng]` pairs that re-sort by drive-time-to-nearest-anchor).
- Frontend `/listings` rebuilt as a 60/40 split — list left, full-height Mapbox right, AI search bar floating top-center over the map. Auto-search-as-you-move (400ms debounce) with a "Search as I move" toggle. Hover sync between list cards and map pins. Up to 3 anchors persisted in the URL.

**Tech stack additions:**
- `Anthropic.SDK` (.NET) — Claude Haiku for free-text parsing (with InMemory fallback)
- `mapbox-gl` (frontend, Mapbox Directions API uses public token) — pins, clusters, anchors
- `supercluster` is built into Mapbox; no extra dep
- Server-side cache: `AddDistributedMemoryCache` for parsed-query dedupe (24h)

**Pre-conditions (Plan 02a outputs):**
- `Listings`, `ListingPhotos` tables; `Location geography(Point,4326)`, `Amenities integer[]`
- `ListingSearchService` with region/type/beds/guests/price/amenities/sort/page filters
- `Dodostays.Api.Contracts.Listings` namespace
- Frontend `/listings` page with filters; `lib/listings.ts` API client; Sega & Sand visual system
- 28 unit + 24 integration + 3 e2e tests all passing

---

## File Structure

```
api/src/Dodostays.Api.Contracts/
  Search/
    ParsedFilters.cs              # output of NL parser
    SearchParseRequest.cs
    SearchParseResponse.cs
  Listings/
    ListingVibe.cs                # enum: Wave, Mountain, Leaf, Town, Mixed
    PriceBand.cs                  # enum: Budget, Mid, Premium

api/src/Dodostays.Api/Modules/Search/
  SearchModule.cs                 # AddSearchModule, MapSearchEndpoints
  Domain/
    BoundingBox.cs                # value object
    GeoConstants.cs               # Mauritius bounds, region centroids
    Anchor.cs                     # Lat/Lng/Name + parser/serializer
  Parsers/
    IListingNlParser.cs
    NlParserOptions.cs
    InMemoryListingNlParser.cs
    ClaudeListingNlParser.cs      # uses Anthropic SDK; falls back to InMemory on failure
    NlParseCache.cs               # 24h TTL via IDistributedCache
  DriveTime/
    IDriveTimeService.cs
    HaversineDriveTimeService.cs  # InMemory: estimates at 35 km/h average
    MapboxDriveTimeService.cs     # skeleton: real impl uses Mapbox Directions
    DriveTimeOptions.cs
  Services/
    SearchOrchestrator.cs
  Endpoints/
    ParseSearchEndpoint.cs        # POST /api/search/parse

api/src/Dodostays.Api/Modules/Listings/
  Domain/
    ListingVibeClassifier.cs      # rule-based: amenities + region + description
  Services/
    ListingSearchService.cs       # MODIFIED: bbox, anchors-distance sort, populate vibe + priceBand
  Endpoints/
    SearchListingsEndpoint.cs     # MODIFIED: accept bbox, lat, lng, radiusKm, anchors

api/tests/
  Dodostays.Api.Tests/
    Search/
      BoundingBoxTests.cs
      AnchorTests.cs
      InMemoryListingNlParserTests.cs
      NlParseCacheTests.cs
      HaversineDriveTimeServiceTests.cs
    Listings/
      ListingVibeClassifierTests.cs
  Dodostays.Api.IntegrationTests/
    Search/
      SearchParseFlowTests.cs
      ListingSearchBboxFlowTests.cs
      ListingSearchAnchorFlowTests.cs

web/src/
  lib/
    search.ts                     # parse(), URL <-> filters, anchor codec
    geo.ts                        # Mauritius bounds, region centroids, bbox helpers, haversine
    anchors.ts                    # Anchor type + URL codec + URLSearchParams helpers
  components/
    search/
      ai-search-bar.tsx
      filter-chips.tsx
      anchor-list.tsx             # shows current anchors with drive times
      anchor-pin.tsx              # custom pin element for anchors
      lifestyle-pin.tsx           # custom pin element for listings (vibe shape + price color)
      listing-map.tsx             # the big map (Mapbox; clusters; anchors; hover sync)
      listings-list.tsx           # left-side list pane with hover sync
      search-as-i-move-toggle.tsx
      view-toggle.tsx             # Map | List (mobile-only fallback)
      voice-button.tsx            # placeholder for 02c (returns null in 02b)
  app/
    listings/
      page.tsx                    # server component → fetches initial results, hands off to ListingsExplorer
      listings-explorer.tsx       # client component, owns the split layout + state sync
  e2e/
    search.spec.ts                # AI bar typing → URL filters; anchor drop persists; pin click shows highlighted card
```

**Module boundaries:**
- `Search` depends only on `Dodostays.Api.Contracts.{Identity, Listings, Search}` types.
- `ListingVibeClassifier` lives under `Listings/Domain/` because the vibe is a property of a listing, not of search.
- The frontend's `ListingsExplorer` is the only client component owning the live state; the page component is server-only and just hydrates initial data.

---

## Task 2b.1: Listings vibe + price band contracts

**Files:**
- Create: `api/src/Dodostays.Api.Contracts/Listings/ListingVibe.cs`
- Create: `api/src/Dodostays.Api.Contracts/Listings/PriceBand.cs`

- [ ] **Step 1: Create `ListingVibe.cs`**

```csharp
using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Listings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ListingVibe
{
    Mixed = 0,
    Wave = 1,
    Mountain = 2,
    Leaf = 3,
    Town = 4
}
```

- [ ] **Step 2: Create `PriceBand.cs`**

```csharp
using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Listings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PriceBand
{
    Budget = 0,
    Mid = 1,
    Premium = 2
}
```

- [ ] **Step 3: Build**

```bash
cd C:/temp/Dodostays/api && dotnet build src/Dodostays.Api.Contracts/Dodostays.Api.Contracts.csproj
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api.Contracts/Listings/
git -C C:/temp/Dodostays commit -m "feat(contracts): add ListingVibe and PriceBand enums"
```

---

## Task 2b.2: Search contracts

**Files:**
- Create: `api/src/Dodostays.Api.Contracts/Search/ParsedFilters.cs`
- Create: `api/src/Dodostays.Api.Contracts/Search/SearchParseRequest.cs`
- Create: `api/src/Dodostays.Api.Contracts/Search/SearchParseResponse.cs`

- [ ] **Step 1: Create `ParsedFilters.cs`**

```csharp
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.Contracts.Search;

public sealed record ParsedFilters(
    string? Region,
    PropertyType? PropertyType,
    int? MinBedrooms,
    int? MinGuests,
    decimal? MaxNightlyMur,
    decimal? MinNightlyMur,
    IReadOnlyList<Amenity> RequiredAmenities,
    DateTimeOffset? CheckIn,
    DateTimeOffset? CheckOut,
    bool VerifiedOnly,
    IReadOnlyList<string> UnknownTokens);
```

- [ ] **Step 2: Create `SearchParseRequest.cs`**

```csharp
namespace Dodostays.Api.Contracts.Search;

public sealed record SearchParseRequest(string Text, ParsedFilters? CurrentFilters = null);
```

- [ ] **Step 3: Create `SearchParseResponse.cs`**

```csharp
namespace Dodostays.Api.Contracts.Search;

public sealed record SearchParseResponse(
    ParsedFilters Filters,
    double Confidence,
    string Acknowledgement,
    string? BoundingBoxHint);
```

- [ ] **Step 4: Build & commit**

```bash
cd C:/temp/Dodostays/api && dotnet build src/Dodostays.Api.Contracts/Dodostays.Api.Contracts.csproj
git -C C:/temp/Dodostays add api/src/Dodostays.Api.Contracts/Search/
git -C C:/temp/Dodostays commit -m "feat(contracts): add Search DTOs (ParsedFilters, SearchParseRequest, SearchParseResponse)"
```

---

## Task 2b.3: BoundingBox + Anchor + GeoConstants

**Files:**
- Create: `api/src/Dodostays.Api/Modules/Search/Domain/BoundingBox.cs`
- Create: `api/src/Dodostays.Api/Modules/Search/Domain/Anchor.cs`
- Create: `api/src/Dodostays.Api/Modules/Search/Domain/GeoConstants.cs`
- Test: `api/tests/Dodostays.Api.Tests/Search/BoundingBoxTests.cs`
- Test: `api/tests/Dodostays.Api.Tests/Search/AnchorTests.cs`

- [ ] **Step 1: Write the failing tests**

`api/tests/Dodostays.Api.Tests/Search/BoundingBoxTests.cs`:

```csharp
using Xunit;
using FluentAssertions;
using Dodostays.Api.Modules.Search.Domain;

namespace Dodostays.Api.Tests.Search;

public class BoundingBoxTests
{
    [Fact]
    public void TryParse_returns_valid_bbox()
    {
        var ok = BoundingBox.TryParse("-20.5,57.3,-20.2,57.6", out var bbox);
        ok.Should().BeTrue();
        bbox!.SouthLat.Should().Be(-20.5);
        bbox.WestLng.Should().Be(57.3);
        bbox.NorthLat.Should().Be(-20.2);
        bbox.EastLng.Should().Be(57.6);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not,a,bbox")]
    [InlineData("1,2,3")]
    [InlineData("1,2,3,4,5")]
    [InlineData("a,b,c,d")]
    public void TryParse_returns_false_on_garbage(string input)
    {
        BoundingBox.TryParse(input, out var _).Should().BeFalse();
    }

    [Fact]
    public void Contains_returns_true_for_inside_point()
    {
        var bbox = new BoundingBox(-20.5, 57.3, -20.2, 57.6);
        bbox.Contains(-20.3, 57.4).Should().BeTrue();
    }

    [Fact]
    public void Contains_returns_false_for_outside_point()
    {
        var bbox = new BoundingBox(-20.5, 57.3, -20.2, 57.6);
        bbox.Contains(-20.0, 57.0).Should().BeFalse();
    }

    [Fact]
    public void IsWithinMauritius_is_true_for_typical_bbox()
    {
        new BoundingBox(-20.5, 57.3, -20.2, 57.6).IsWithinMauritius().Should().BeTrue();
    }

    [Fact]
    public void IsWithinMauritius_is_false_for_australian_bbox()
    {
        new BoundingBox(-34.0, 151.0, -33.5, 151.5).IsWithinMauritius().Should().BeFalse();
    }
}
```

`api/tests/Dodostays.Api.Tests/Search/AnchorTests.cs`:

```csharp
using Xunit;
using FluentAssertions;
using Dodostays.Api.Modules.Search.Domain;

namespace Dodostays.Api.Tests.Search;

public class AnchorTests
{
    [Fact]
    public void TryParseList_returns_anchors_for_valid_input()
    {
        var ok = Anchor.TryParseList("-20.45,57.32,Le Morne|-20.43,57.68,Airport", out var anchors);
        ok.Should().BeTrue();
        anchors.Should().HaveCount(2);
        anchors[0].Lat.Should().Be(-20.45);
        anchors[0].Lng.Should().Be(57.32);
        anchors[0].Name.Should().Be("Le Morne");
        anchors[1].Name.Should().Be("Airport");
    }

    [Fact]
    public void TryParseList_caps_at_three_anchors()
    {
        var raw = "-20,57,A|-20,57,B|-20,57,C|-20,57,D";
        var ok = Anchor.TryParseList(raw, out var anchors);
        ok.Should().BeTrue();
        anchors.Should().HaveCount(3);
    }

    [Theory]
    [InlineData("not-an-anchor")]
    [InlineData("a,b,c")]
    [InlineData("")]
    public void TryParseList_returns_empty_for_garbage(string input)
    {
        Anchor.TryParseList(input, out var anchors).Should().BeTrue();
        anchors.Should().BeEmpty();
    }

    [Fact]
    public void TryParseList_treats_null_as_empty()
    {
        Anchor.TryParseList(null, out var anchors).Should().BeTrue();
        anchors.Should().BeEmpty();
    }
}
```

- [ ] **Step 2: Run tests — should fail (build errors)**

```bash
cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~Search"
```

- [ ] **Step 3: Create `BoundingBox.cs`**

```csharp
using System.Globalization;

namespace Dodostays.Api.Modules.Search.Domain;

public sealed record BoundingBox(double SouthLat, double WestLng, double NorthLat, double EastLng)
{
    public bool Contains(double lat, double lng) =>
        lat >= SouthLat && lat <= NorthLat && lng >= WestLng && lng <= EastLng;

    public bool IsWithinMauritius() =>
        SouthLat >= GeoConstants.MauritiusSouth - 0.5 &&
        NorthLat <= GeoConstants.MauritiusNorth + 0.5 &&
        WestLng >= GeoConstants.MauritiusWest - 0.5 &&
        EastLng <= GeoConstants.MauritiusEast + 0.5;

    public static bool TryParse(string? value, out BoundingBox? bbox)
    {
        bbox = null;
        if (string.IsNullOrWhiteSpace(value)) return false;
        var parts = value.Split(',', StringSplitOptions.TrimEntries);
        if (parts.Length != 4) return false;
        if (!double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var sLat)) return false;
        if (!double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var wLng)) return false;
        if (!double.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out var nLat)) return false;
        if (!double.TryParse(parts[3], NumberStyles.Float, CultureInfo.InvariantCulture, out var eLng)) return false;
        bbox = new BoundingBox(sLat, wLng, nLat, eLng);
        return true;
    }
}
```

- [ ] **Step 4: Create `GeoConstants.cs`**

```csharp
namespace Dodostays.Api.Modules.Search.Domain;

public static class GeoConstants
{
    public const double MauritiusSouth = -20.55;
    public const double MauritiusNorth = -19.94;
    public const double MauritiusWest = 57.29;
    public const double MauritiusEast = 57.83;

    public static readonly Dictionary<string, (double Lat, double Lng)> RegionCentroids = new(StringComparer.OrdinalIgnoreCase)
    {
        ["grand-baie"] = (-20.0117, 57.5800),
        ["flic-en-flac"] = (-20.2667, 57.3667),
        ["tamarin"] = (-20.3220, 57.3690),
        ["trou-aux-biches"] = (-20.0394, 57.5481),
        ["pereybere"] = (-19.9967, 57.5878),
        ["belle-mare"] = (-20.1900, 57.7700),
        ["le-morne"] = (-20.4500, 57.3167),
        ["blue-bay"] = (-20.4456, 57.7100),
        ["albion"] = (-20.2117, 57.4039)
    };
}
```

- [ ] **Step 5: Create `Anchor.cs`**

```csharp
using System.Globalization;

namespace Dodostays.Api.Modules.Search.Domain;

public sealed record Anchor(double Lat, double Lng, string Name)
{
    public const int MaxAnchors = 3;

    public static bool TryParseList(string? value, out IReadOnlyList<Anchor> anchors)
    {
        anchors = Array.Empty<Anchor>();
        if (string.IsNullOrWhiteSpace(value)) return true;

        var parsed = new List<Anchor>();
        foreach (var token in value.Split('|', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = token.Split(',', 3, StringSplitOptions.TrimEntries);
            if (parts.Length < 2) continue;
            if (!double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var lat)) continue;
            if (!double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var lng)) continue;
            var name = parts.Length == 3 ? parts[2] : $"Anchor {parsed.Count + 1}";
            parsed.Add(new Anchor(lat, lng, name));
            if (parsed.Count >= MaxAnchors) break;
        }
        anchors = parsed;
        return true;
    }
}
```

- [ ] **Step 6: Run tests**

```bash
cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~BoundingBoxTests|FullyQualifiedName~AnchorTests"
```

Expected: 6 + 4 = 10 passing.

- [ ] **Step 7: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Search/Domain/ api/tests/Dodostays.Api.Tests/Search/
git -C C:/temp/Dodostays commit -m "feat(search): BoundingBox, Anchor, GeoConstants with unit tests"
```

---

## Task 2b.4: ListingVibeClassifier + PriceBand mapping

**Files:**
- Create: `api/src/Dodostays.Api/Modules/Listings/Domain/ListingVibeClassifier.cs`
- Test: `api/tests/Dodostays.Api.Tests/Listings/ListingVibeClassifierTests.cs`

- [ ] **Step 1: Write the failing tests**

```csharp
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Domain;

namespace Dodostays.Api.Tests.Listings;

public class ListingVibeClassifierTests
{
    [Fact]
    public void Wave_when_BeachAccess_amenity()
    {
        var v = ListingVibeClassifier.Classify(
            region: "tamarin",
            description: "Quiet villa.",
            amenities: new[] { Amenity.BeachAccess, Amenity.Pool });
        v.Should().Be(ListingVibe.Wave);
    }

    [Fact]
    public void Mountain_when_le_morne_region_no_beach()
    {
        var v = ListingVibeClassifier.Classify(
            region: "le-morne",
            description: "Foothills retreat.",
            amenities: Array.Empty<Amenity>());
        v.Should().Be(ListingVibe.Mountain);
    }

    [Fact]
    public void Mountain_when_description_mentions_view_or_mountain()
    {
        var v = ListingVibeClassifier.Classify(
            region: "tamarin",
            description: "Stunning mountain views.",
            amenities: Array.Empty<Amenity>());
        v.Should().Be(ListingVibe.Mountain);
    }

    [Fact]
    public void Leaf_when_garden_and_no_beach_and_not_grand_baie()
    {
        var v = ListingVibeClassifier.Classify(
            region: "albion",
            description: "Surrounded by sugar cane.",
            amenities: new[] { Amenity.Garden });
        v.Should().Be(ListingVibe.Leaf);
    }

    [Fact]
    public void Town_when_grand_baie_no_other_match()
    {
        var v = ListingVibeClassifier.Classify(
            region: "grand-baie",
            description: "Walking distance to restaurants.",
            amenities: new[] { Amenity.Wifi });
        v.Should().Be(ListingVibe.Town);
    }

    [Fact]
    public void Mixed_when_no_rule_matches()
    {
        var v = ListingVibeClassifier.Classify(
            region: "blue-bay",
            description: "Cosy place.",
            amenities: new[] { Amenity.Wifi });
        v.Should().Be(ListingVibe.Mixed);
    }

    [Theory]
    [InlineData(2500, PriceBand.Budget)]
    [InlineData(3000, PriceBand.Budget)]
    [InlineData(3001, PriceBand.Mid)]
    [InlineData(7000, PriceBand.Mid)]
    [InlineData(7001, PriceBand.Premium)]
    [InlineData(15000, PriceBand.Premium)]
    public void PriceBandFor_buckets_by_thresholds(decimal nightly, PriceBand expected)
    {
        ListingVibeClassifier.PriceBandFor(nightly).Should().Be(expected);
    }
}
```

- [ ] **Step 2: Run — should fail**

```bash
cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~ListingVibeClassifierTests"
```

- [ ] **Step 3: Create `ListingVibeClassifier.cs`**

```csharp
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

        if (hasGarden && !hasBeach && (regionLower is null || !string.Equals(regionLower, "grand-baie", StringComparison.OrdinalIgnoreCase)))
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
```

- [ ] **Step 4: Run tests**

Expected: 13 passing (6 vibe + 7 price band Theory rows — InlineData of 6 cases).

Wait — recount: the file has 6 vibe `[Fact]` tests + 6 `[InlineData]` rows on the PriceBand Theory = **12 passing**. Either count is fine; just confirm 0 failures.

- [ ] **Step 5: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Listings/Domain/ListingVibeClassifier.cs api/tests/Dodostays.Api.Tests/Listings/ListingVibeClassifierTests.cs
git -C C:/temp/Dodostays commit -m "feat(listings): rule-based ListingVibeClassifier with PriceBand bucketing"
```

---

## Task 2b.5: NL parser abstraction + InMemory implementation

**Files:**
- Create: `api/src/Dodostays.Api/Modules/Search/Parsers/NlParserOptions.cs`
- Create: `api/src/Dodostays.Api/Modules/Search/Parsers/IListingNlParser.cs`
- Create: `api/src/Dodostays.Api/Modules/Search/Parsers/InMemoryListingNlParser.cs`
- Test: `api/tests/Dodostays.Api.Tests/Search/InMemoryListingNlParserTests.cs`

- [ ] **Step 1: Write the failing test**

```csharp
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Contracts.Search;
using Dodostays.Api.Modules.Search.Parsers;

namespace Dodostays.Api.Tests.Search;

public class InMemoryListingNlParserTests
{
    private readonly InMemoryListingNlParser _parser = new();

    [Fact]
    public async Task Extracts_region_property_type_bedrooms_amenities_and_max_price()
    {
        var (filters, confidence, ack) = await _parser.ParseAsync(
            "3 bedroom villa in Flic en Flac with pool under 5000 mur per night",
            null,
            CancellationToken.None);

        filters.Region.Should().Be("flic-en-flac");
        filters.PropertyType.Should().Be(PropertyType.Villa);
        filters.MinBedrooms.Should().Be(3);
        filters.MaxNightlyMur.Should().Be(5000m);
        filters.RequiredAmenities.Should().Contain(Amenity.Pool);
        confidence.Should().BeGreaterThanOrEqualTo(0.5);
        ack.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Extracts_max_guests_from_phrase()
    {
        var (filters, _, _) = await _parser.ParseAsync(
            "apartment for 4 guests in grand baie", null, CancellationToken.None);

        filters.MinGuests.Should().Be(4);
        filters.PropertyType.Should().Be(PropertyType.Apartment);
        filters.Region.Should().Be("grand-baie");
    }

    [Fact]
    public async Task Extracts_multiple_amenities()
    {
        var (filters, _, _) = await _parser.ParseAsync(
            "villa with pool and wifi and air conditioning", null, CancellationToken.None);
        filters.RequiredAmenities.Should().Contain(Amenity.Pool);
        filters.RequiredAmenities.Should().Contain(Amenity.Wifi);
        filters.RequiredAmenities.Should().Contain(Amenity.AirCon);
    }

    [Fact]
    public async Task Detects_verified_only_phrasing()
    {
        var (filters, _, _) = await _parser.ParseAsync("verified villas only with pool", null, CancellationToken.None);
        filters.VerifiedOnly.Should().BeTrue();
    }

    [Fact]
    public async Task Returns_low_confidence_for_unparseable_input()
    {
        var (filters, confidence, _) = await _parser.ParseAsync("asdfghjkl qwerty", null, CancellationToken.None);
        confidence.Should().BeLessThan(0.4);
        filters.UnknownTokens.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Merges_with_current_filters_when_provided()
    {
        var current = new ParsedFilters(
            Region: "tamarin", PropertyType: null,
            MinBedrooms: 2, MinGuests: null,
            MaxNightlyMur: null, MinNightlyMur: null,
            RequiredAmenities: Array.Empty<Amenity>(),
            CheckIn: null, CheckOut: null,
            VerifiedOnly: false, UnknownTokens: Array.Empty<string>());

        var (filters, _, _) = await _parser.ParseAsync("with pool", current, CancellationToken.None);
        filters.Region.Should().Be("tamarin");
        filters.MinBedrooms.Should().Be(2);
        filters.RequiredAmenities.Should().Contain(Amenity.Pool);
    }
}
```

- [ ] **Step 2: Run — should fail (build errors)**

- [ ] **Step 3: Create `NlParserOptions.cs`**

```csharp
namespace Dodostays.Api.Modules.Search.Parsers;

public sealed class NlParserOptions
{
    public string Provider { get; set; } = "InMemory";
    public string? AnthropicApiKey { get; set; }
    public string AnthropicModel { get; set; } = "claude-haiku-4-5-20251001";
    public int MaxTokens { get; set; } = 600;
    public TimeSpan CacheTtl { get; set; } = TimeSpan.FromHours(24);
    public int RateLimitPerMinutePerIp { get; set; } = 30;
}
```

- [ ] **Step 4: Create `IListingNlParser.cs`**

```csharp
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Modules.Search.Parsers;

public interface IListingNlParser
{
    Task<NlParseResult> ParseAsync(string text, ParsedFilters? currentFilters, CancellationToken ct);
}

public readonly record struct NlParseResult(ParsedFilters Filters, double Confidence, string Acknowledgement);
```

- [ ] **Step 5: Create `InMemoryListingNlParser.cs`**

```csharp
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
```

- [ ] **Step 6: Run tests**

```bash
cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~InMemoryListingNlParser"
```

Expected: 6 passing.

- [ ] **Step 7: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Search/Parsers/ api/tests/Dodostays.Api.Tests/Search/InMemoryListingNlParserTests.cs
git -C C:/temp/Dodostays commit -m "feat(search): IListingNlParser + InMemory implementation with regex+keyword extraction"
```

---

## Task 2b.6: Claude NL parser (skeleton with fallback)

**Files:**
- Modify: `api/Directory.Packages.props` (add `Anthropic.SDK`)
- Modify: `api/src/Dodostays.Api/Dodostays.Api.csproj` (add `<PackageReference Include="Anthropic.SDK" />`)
- Create: `api/src/Dodostays.Api/Modules/Search/Parsers/ClaudeListingNlParser.cs`

- [ ] **Step 1: Add `Anthropic.SDK` to central package versions**

Open `api/Directory.Packages.props`. Inside the existing `<ItemGroup>`, add:

```xml
<PackageVersion Include="Anthropic.SDK" Version="5.5.1" />
```

(If a newer version is needed for Claude Haiku 4.5, run `dotnet add package Anthropic.SDK --project src/Dodostays.Api` from `api/` and update Directory.Packages.props to the resolved version.)

- [ ] **Step 2: Reference it in `Dodostays.Api.csproj`**

Inside the existing `<ItemGroup>` of `<PackageReference>`s, add:

```xml
<PackageReference Include="Anthropic.SDK" />
```

- [ ] **Step 3: Create `ClaudeListingNlParser.cs`**

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;
using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Modules.Search.Parsers;

public sealed class ClaudeListingNlParser : IListingNlParser
{
    private readonly NlParserOptions _options;
    private readonly ILogger<ClaudeListingNlParser> _logger;
    private readonly InMemoryListingNlParser _fallback;
    private readonly AnthropicClient _client;

    public ClaudeListingNlParser(
        IOptions<NlParserOptions> options,
        ILogger<ClaudeListingNlParser> logger,
        InMemoryListingNlParser fallback)
    {
        _options = options.Value;
        _logger = logger;
        _fallback = fallback;
        if (string.IsNullOrWhiteSpace(_options.AnthropicApiKey))
            throw new InvalidOperationException("NlParser:AnthropicApiKey is required when provider is Claude.");
        _client = new AnthropicClient(_options.AnthropicApiKey);
    }

    public async Task<NlParseResult> ParseAsync(string text, ParsedFilters? currentFilters, CancellationToken ct)
    {
        try
        {
            var system = SystemPrompt();
            var userMsg = BuildUserMessage(text, currentFilters);

            var parameters = new MessageParameters
            {
                Messages = new List<Message>
                {
                    new() { Role = RoleType.User, Content = new List<ContentBase> { new TextContent { Text = userMsg } } }
                },
                MaxTokens = _options.MaxTokens,
                Model = _options.AnthropicModel,
                System = new List<SystemMessage> { new() { Type = "text", Text = system } },
                Stream = false,
                Temperature = 0.0m
            };

            var response = await _client.Messages.GetClaudeMessageAsync(parameters, ct);
            var jsonText = ExtractJson(response?.Message?.ToString() ?? string.Empty);
            var dto = JsonSerializer.Deserialize<ClaudeReply>(jsonText, JsonOpts);
            if (dto is null) throw new InvalidOperationException("Empty Claude reply.");

            var filters = new ParsedFilters(
                Region: dto.Region,
                PropertyType: dto.PropertyType,
                MinBedrooms: dto.MinBedrooms,
                MinGuests: dto.MinGuests,
                MaxNightlyMur: dto.MaxNightlyMur,
                MinNightlyMur: dto.MinNightlyMur,
                RequiredAmenities: dto.RequiredAmenities ?? Array.Empty<Amenity>(),
                CheckIn: dto.CheckIn,
                CheckOut: dto.CheckOut,
                VerifiedOnly: dto.VerifiedOnly,
                UnknownTokens: dto.UnknownTokens ?? Array.Empty<string>());
            return new NlParseResult(filters, dto.Confidence, dto.Acknowledgement ?? "");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Claude NL parse failed; falling back to InMemory parser");
            return await _fallback.ParseAsync(text, currentFilters, ct);
        }
    }

    private static string SystemPrompt() => """
        You are a search filter extractor for DodoStays — a Mauritius short-term rental marketplace.
        Given a user's free-text search query, return STRICT JSON with these fields:

        {
          "region": one of [grand-baie, flic-en-flac, tamarin, trou-aux-biches, pereybere, belle-mare, le-morne, blue-bay, albion] or null,
          "propertyType": "Villa" | "Apartment" | "Guesthouse" | null,
          "minBedrooms": int or null,
          "minGuests": int or null,
          "maxNightlyMur": decimal or null (in MUR; convert from EUR ~50, USD ~45, INR ~0.55 if needed),
          "minNightlyMur": decimal or null,
          "requiredAmenities": array of [Pool, BeachAccess, AirCon, Wifi, Kitchen, Parking, Tv, WashingMachine, Balcony, Garden, Bbq, Generator],
          "checkIn": ISO 8601 date or null,
          "checkOut": ISO 8601 date or null,
          "verifiedOnly": bool,
          "confidence": float 0.0-1.0,
          "acknowledgement": short string echoing parsed intent in plain English (max 120 chars),
          "unknownTokens": array of strings the model could not map
        }

        OUTPUT JSON ONLY. No prose, no code fences.
        If query is ambiguous or empty, set confidence < 0.5 and unknownTokens accordingly.
        """;

    private static string BuildUserMessage(string text, ParsedFilters? current)
    {
        if (current is null) return $"User query: \"{text}\"";
        var json = JsonSerializer.Serialize(current, JsonOpts);
        return $"Current filters: {json}\nUser refinement: \"{text}\"\nMerge — keep current values unless overridden.";
    }

    private static string ExtractJson(string s)
    {
        var start = s.IndexOf('{');
        var end = s.LastIndexOf('}');
        return (start < 0 || end <= start) ? s : s.Substring(start, end - start + 1);
    }

    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private sealed class ClaudeReply
    {
        public string? Region { get; set; }
        public PropertyType? PropertyType { get; set; }
        public int? MinBedrooms { get; set; }
        public int? MinGuests { get; set; }
        public decimal? MaxNightlyMur { get; set; }
        public decimal? MinNightlyMur { get; set; }
        public List<Amenity>? RequiredAmenities { get; set; }
        public DateTimeOffset? CheckIn { get; set; }
        public DateTimeOffset? CheckOut { get; set; }
        public bool VerifiedOnly { get; set; }
        public double Confidence { get; set; } = 0.5;
        public string? Acknowledgement { get; set; }
        public List<string>? UnknownTokens { get; set; }
    }
}
```

NOTE: The `Anthropic.SDK` API surface evolves. If `AnthropicClient`, `MessageParameters`, `ContentBase`, `TextContent`, `SystemMessage`, `RoleType`, `Messages.GetClaudeMessageAsync` don't match the installed version, adapt to the installed surface — the contract is "system prompt + user message + JSON-only response"; the SDK call shape is not. The try/catch fallback to `_fallback.ParseAsync(...)` keeps the system usable.

- [ ] **Step 4: Build**

```bash
cd C:/temp/Dodostays/api && dotnet build
```

Expected: 0 errors. If `Anthropic.SDK` install fails (network policy), STOP and report — proceed with `Provider=InMemory`.

- [ ] **Step 5: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "feat(search): ClaudeListingNlParser via Anthropic SDK with InMemory fallback"
```

---

## Task 2b.7: Drive-time service (Haversine InMemory + Mapbox skeleton)

**Files:**
- Create: `api/src/Dodostays.Api/Modules/Search/DriveTime/IDriveTimeService.cs`
- Create: `api/src/Dodostays.Api/Modules/Search/DriveTime/DriveTimeOptions.cs`
- Create: `api/src/Dodostays.Api/Modules/Search/DriveTime/HaversineDriveTimeService.cs`
- Create: `api/src/Dodostays.Api/Modules/Search/DriveTime/MapboxDriveTimeService.cs`
- Test: `api/tests/Dodostays.Api.Tests/Search/HaversineDriveTimeServiceTests.cs`

- [ ] **Step 1: Write the failing test**

```csharp
using Xunit;
using FluentAssertions;
using Dodostays.Api.Modules.Search.DriveTime;
using Dodostays.Api.Modules.Search.Domain;

namespace Dodostays.Api.Tests.Search;

public class HaversineDriveTimeServiceTests
{
    private readonly HaversineDriveTimeService _svc = new();

    [Fact]
    public async Task EstimateMinutesAsync_returns_positive_for_distinct_points()
    {
        var anchors = new[] { new Anchor(-20.27, 57.36, "FEF") }; // Flic en Flac
        var minutes = await _svc.EstimateMinutesAsync(
            originLat: -20.0117, originLng: 57.5800,    // Grand Baie
            anchors: anchors, CancellationToken.None);
        minutes.Should().BeGreaterThan(15);
        minutes.Should().BeLessThan(120);
    }

    [Fact]
    public async Task EstimateMinutesAsync_returns_zero_for_same_point()
    {
        var anchors = new[] { new Anchor(-20.27, 57.36, "FEF") };
        var minutes = await _svc.EstimateMinutesAsync(-20.27, 57.36, anchors, CancellationToken.None);
        minutes.Should().BeLessThan(2);
    }

    [Fact]
    public async Task EstimateMinutesAsync_returns_min_across_multiple_anchors()
    {
        var anchors = new[]
        {
            new Anchor(-20.0117, 57.58, "Grand Baie"),
            new Anchor(-20.27, 57.36, "FEF"),
        };
        var minutes = await _svc.EstimateMinutesAsync(-20.27, 57.36, anchors, CancellationToken.None);
        // Should pick the FEF anchor (same point) → ~0
        minutes.Should().BeLessThan(2);
    }

    [Fact]
    public async Task EstimateMinutesAsync_returns_int_max_when_no_anchors()
    {
        var minutes = await _svc.EstimateMinutesAsync(-20.0, 57.5, Array.Empty<Anchor>(), CancellationToken.None);
        minutes.Should().Be(int.MaxValue);
    }
}
```

- [ ] **Step 2: Run — should fail**

- [ ] **Step 3: Create `DriveTimeOptions.cs`**

```csharp
namespace Dodostays.Api.Modules.Search.DriveTime;

public sealed class DriveTimeOptions
{
    public string Provider { get; set; } = "Haversine";
    public string? MapboxAccessToken { get; set; }
    public double AverageDrivingKmh { get; set; } = 35.0;
}
```

- [ ] **Step 4: Create `IDriveTimeService.cs`**

```csharp
using Dodostays.Api.Modules.Search.Domain;

namespace Dodostays.Api.Modules.Search.DriveTime;

public interface IDriveTimeService
{
    /// <summary>
    /// Returns minimum estimated drive time (minutes) from origin to nearest anchor.
    /// Returns int.MaxValue when no anchors are supplied.
    /// </summary>
    Task<int> EstimateMinutesAsync(double originLat, double originLng, IReadOnlyList<Anchor> anchors, CancellationToken ct);
}
```

- [ ] **Step 5: Create `HaversineDriveTimeService.cs`**

```csharp
using Microsoft.Extensions.Options;
using Dodostays.Api.Modules.Search.Domain;

namespace Dodostays.Api.Modules.Search.DriveTime;

public sealed class HaversineDriveTimeService : IDriveTimeService
{
    private readonly double _kmh;

    public HaversineDriveTimeService() : this(35.0) {}

    public HaversineDriveTimeService(IOptions<DriveTimeOptions> options) : this(options.Value.AverageDrivingKmh) {}

    private HaversineDriveTimeService(double averageDrivingKmh) => _kmh = averageDrivingKmh;

    public Task<int> EstimateMinutesAsync(double originLat, double originLng, IReadOnlyList<Anchor> anchors, CancellationToken ct)
    {
        if (anchors is null || anchors.Count == 0) return Task.FromResult(int.MaxValue);

        var minMinutes = int.MaxValue;
        foreach (var a in anchors)
        {
            var km = HaversineKm(originLat, originLng, a.Lat, a.Lng);
            // Mauritius is small but roads aren't straight; multiply by 1.4 for realistic driving distance
            var drivingKm = km * 1.4;
            var hours = drivingKm / _kmh;
            var minutes = (int)Math.Round(hours * 60);
            if (minutes < minMinutes) minMinutes = minutes;
        }
        return Task.FromResult(minMinutes);
    }

    private static double HaversineKm(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6371.0;
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLng = (lng2 - lng1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0)
              * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }
}
```

- [ ] **Step 6: Create `MapboxDriveTimeService.cs` (skeleton, throws unless token is set)**

```csharp
using Microsoft.Extensions.Options;
using Dodostays.Api.Modules.Search.Domain;

namespace Dodostays.Api.Modules.Search.DriveTime;

public sealed class MapboxDriveTimeService : IDriveTimeService
{
    private readonly DriveTimeOptions _options;
    private readonly HttpClient _http;
    private readonly HaversineDriveTimeService _fallback;

    public MapboxDriveTimeService(HttpClient http, IOptions<DriveTimeOptions> options)
    {
        _http = http;
        _options = options.Value;
        if (string.IsNullOrWhiteSpace(_options.MapboxAccessToken))
            throw new InvalidOperationException("DriveTime:MapboxAccessToken is required when provider is Mapbox.");
        _fallback = new HaversineDriveTimeService(options);
    }

    public Task<int> EstimateMinutesAsync(double originLat, double originLng, IReadOnlyList<Anchor> anchors, CancellationToken ct)
    {
        // Real Mapbox Directions API integration deferred until production launch readiness.
        // For now, delegate to the Haversine fallback so the system stays usable.
        return _fallback.EstimateMinutesAsync(originLat, originLng, anchors, ct);
    }
}
```

- [ ] **Step 7: Run tests**

Expected: 4 passing.

- [ ] **Step 8: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Search/DriveTime/ api/tests/Dodostays.Api.Tests/Search/HaversineDriveTimeServiceTests.cs
git -C C:/temp/Dodostays commit -m "feat(search): IDriveTimeService with Haversine + Mapbox skeleton"
```

---

## Task 2b.8: NlParseCache + SearchOrchestrator + parse endpoint + module wiring

**Files:**
- Create: `api/src/Dodostays.Api/Modules/Search/Parsers/NlParseCache.cs`
- Create: `api/src/Dodostays.Api/Modules/Search/Services/SearchOrchestrator.cs`
- Create: `api/src/Dodostays.Api/Modules/Search/Endpoints/ParseSearchEndpoint.cs`
- Create: `api/src/Dodostays.Api/Modules/Search/SearchModule.cs`
- Modify: `api/src/Dodostays.Api/Program.cs`
- Modify: `appsettings.Development.json` and `appsettings.json` (NlParser, DriveTime)
- Test: `api/tests/Dodostays.Api.Tests/Search/NlParseCacheTests.cs`

- [ ] **Step 1: Write the failing test**

```csharp
using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
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
```

- [ ] **Step 2: Run — should fail**

- [ ] **Step 3: Create `NlParseCache.cs`**

```csharp
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
```

- [ ] **Step 4: Run cache tests** — expected: 3 passing.

- [ ] **Step 5: Create `SearchOrchestrator.cs`**

```csharp
using Dodostays.Api.Contracts.Search;
using Dodostays.Api.Modules.Search.Domain;
using Dodostays.Api.Modules.Search.Parsers;

namespace Dodostays.Api.Modules.Search.Services;

public sealed class SearchOrchestrator
{
    private readonly IListingNlParser _parser;
    private readonly NlParseCache _cache;

    public SearchOrchestrator(IListingNlParser parser, NlParseCache cache)
    {
        _parser = parser;
        _cache = cache;
    }

    public async Task<SearchParseResponse> ParseAsync(string text, ParsedFilters? currentFilters, CancellationToken ct)
    {
        var result = await _cache.GetOrAddAsync(text, currentFilters,
            () => _parser.ParseAsync(text, currentFilters, ct), ct);

        var bboxHint = result.Filters.Region is not null
                        && GeoConstants.RegionCentroids.TryGetValue(result.Filters.Region, out var c)
            ? FormatBbox(c.Lat, c.Lng, padDeg: 0.04)
            : null;

        return new SearchParseResponse(result.Filters, result.Confidence, result.Acknowledgement, bboxHint);
    }

    private static string FormatBbox(double lat, double lng, double padDeg) =>
        string.Format(System.Globalization.CultureInfo.InvariantCulture,
            "{0},{1},{2},{3}", lat - padDeg, lng - padDeg, lat + padDeg, lng + padDeg);
}
```

- [ ] **Step 6: Create `Validation/SearchParseRequestValidator.cs`**

Create the file `api/src/Dodostays.Api/Modules/Search/Validation/SearchParseRequestValidator.cs`:

```csharp
using FluentValidation;
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Modules.Search.Validation;

public sealed class SearchParseRequestValidator : AbstractValidator<SearchParseRequest>
{
    public SearchParseRequestValidator()
    {
        RuleFor(r => r.Text).NotEmpty().MaximumLength(500);
    }
}
```

- [ ] **Step 7: Create `Endpoints/ParseSearchEndpoint.cs`**

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Search;
using Dodostays.Api.Modules.Search.Services;

namespace Dodostays.Api.Modules.Search.Endpoints;

internal static class ParseSearchEndpoint
{
    public static RouteHandlerBuilder MapParseSearch(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/search/parse", HandleAsync).AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        [FromBody] SearchParseRequest request,
        IValidator<SearchParseRequest> validator,
        SearchOrchestrator orchestrator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());
        var response = await orchestrator.ParseAsync(request.Text, request.CurrentFilters, ct);
        return Results.Ok(response);
    }
}
```

- [ ] **Step 8: Create `SearchModule.cs`**

```csharp
using FluentValidation;
using Dodostays.Api.Contracts.Search;
using Dodostays.Api.Modules.Search.DriveTime;
using Dodostays.Api.Modules.Search.Endpoints;
using Dodostays.Api.Modules.Search.Parsers;
using Dodostays.Api.Modules.Search.Services;
using Dodostays.Api.Modules.Search.Validation;

namespace Dodostays.Api.Modules.Search;

public static class SearchModule
{
    public static IServiceCollection AddSearchModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<NlParserOptions>(configuration.GetSection("NlParser"));
        services.Configure<DriveTimeOptions>(configuration.GetSection("DriveTime"));
        services.AddDistributedMemoryCache();

        services.AddSingleton<InMemoryListingNlParser>();
        var nlProvider = configuration["NlParser:Provider"] ?? "InMemory";
        if (string.Equals(nlProvider, "Claude", StringComparison.OrdinalIgnoreCase))
            services.AddSingleton<IListingNlParser, ClaudeListingNlParser>();
        else
            services.AddSingleton<IListingNlParser>(sp => sp.GetRequiredService<InMemoryListingNlParser>());

        services.AddSingleton<NlParseCache>();

        var driveProvider = configuration["DriveTime:Provider"] ?? "Haversine";
        if (string.Equals(driveProvider, "Mapbox", StringComparison.OrdinalIgnoreCase))
            services.AddHttpClient<IDriveTimeService, MapboxDriveTimeService>();
        else
            services.AddSingleton<IDriveTimeService, HaversineDriveTimeService>();

        services.AddScoped<SearchOrchestrator>();
        services.AddScoped<IValidator<SearchParseRequest>, SearchParseRequestValidator>();

        return services;
    }

    public static IEndpointRouteBuilder MapSearchEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapParseSearch();
        return app;
    }
}
```

- [ ] **Step 9: Modify `Program.cs`**

After `using Dodostays.Api.Modules.Listings;`, add `using Dodostays.Api.Modules.Search;`.
After `builder.Services.AddListingsModule(builder.Configuration);`, add `builder.Services.AddSearchModule(builder.Configuration);`.
After `app.MapListingsEndpoints();`, add `app.MapSearchEndpoints();`.

- [ ] **Step 10: Modify `appsettings.Development.json`** — add:

```json
"NlParser": {
  "Provider": "InMemory",
  "AnthropicApiKey": "",
  "AnthropicModel": "claude-haiku-4-5-20251001",
  "MaxTokens": 600,
  "CacheTtl": "1.00:00:00",
  "RateLimitPerMinutePerIp": 30
},
"DriveTime": {
  "Provider": "Haversine",
  "MapboxAccessToken": "",
  "AverageDrivingKmh": 35.0
}
```

- [ ] **Step 11: Modify `appsettings.json`** — same shape with empty/zero values:

```json
"NlParser": {
  "Provider": "InMemory",
  "AnthropicApiKey": "",
  "AnthropicModel": "claude-haiku-4-5-20251001",
  "MaxTokens": 600,
  "CacheTtl": "1.00:00:00",
  "RateLimitPerMinutePerIp": 30
},
"DriveTime": {
  "Provider": "Haversine",
  "MapboxAccessToken": "",
  "AverageDrivingKmh": 35.0
}
```

- [ ] **Step 12: Build + smoke test**

```bash
cd C:/temp/Dodostays/api && dotnet build
```

Kill `Dodostays.Api.exe` if locked. Start the API and curl:

```bash
curl -s -X POST http://localhost:5080/api/search/parse \
  -H "Content-Type: application/json" \
  -d '{"text":"3 bedroom villa in flic en flac with pool under 5000 mur"}'
```

Expected: JSON with `filters.region="flic-en-flac"`, `propertyType="Villa"`, `boundingBoxHint` non-null.

- [ ] **Step 13: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "feat(search): cache + orchestrator + parse endpoint + module wiring"
```

---

## Task 2b.9: Listing search adds bbox + anchors-distance + vibe + price band

**Files:**
- Modify: `api/src/Dodostays.Api.Contracts/Listings/ListingSearchRequest.cs`
- Modify: `api/src/Dodostays.Api.Contracts/Listings/ListingSummaryDto.cs`
- Modify: `api/src/Dodostays.Api/Modules/Listings/Services/ListingSearchService.cs`
- Modify: `api/src/Dodostays.Api/Modules/Listings/Endpoints/SearchListingsEndpoint.cs`
- Test: `api/tests/Dodostays.Api.IntegrationTests/Search/ListingSearchBboxFlowTests.cs`
- Test: `api/tests/Dodostays.Api.IntegrationTests/Search/ListingSearchAnchorFlowTests.cs`

- [ ] **Step 1: Replace `ListingSearchRequest.cs`**

```csharp
using Dodostays.Api.Modules.Search.Domain;

namespace Dodostays.Api.Contracts.Listings;

public sealed record ListingSearchRequest(
    string? Region = null,
    PropertyType? PropertyType = null,
    int? MinBedrooms = null,
    int? MinGuests = null,
    decimal? MaxNightlyMur = null,
    decimal? MinNightlyMur = null,
    IReadOnlyList<Amenity>? RequiredAmenities = null,
    bool VerifiedOnly = false,
    string Sort = "newest",
    int Page = 1,
    int PageSize = 20,
    BoundingBox? BoundingBox = null,
    IReadOnlyList<Anchor>? Anchors = null);
```

NOTE: This makes `Dodostays.Api.Contracts.Listings` reference `Dodostays.Api.Modules.Search.Domain` (which lives in `Dodostays.Api`, not Contracts). To keep Contracts free of API project deps, define `BoundingBox` and `Anchor` IN Contracts instead. Refactor:

Replace the using line above with `using Dodostays.Api.Contracts.Search;`. Then **MOVE** `BoundingBox.cs` and `Anchor.cs` from `api/src/Dodostays.Api/Modules/Search/Domain/` to `api/src/Dodostays.Api.Contracts/Search/` and change their namespace to `Dodostays.Api.Contracts.Search`. Update all references (`InMemoryListingNlParserTests`, `BoundingBoxTests`, `AnchorTests`, `SearchOrchestrator`, etc.) to import the new namespace.

(Reason: Listings.Contracts now depends on a value object that other modules need to send. The right home is Contracts.)

- [ ] **Step 2: Update `ListingSummaryDto.cs`**

```csharp
namespace Dodostays.Api.Contracts.Listings;

public sealed record ListingSummaryDto(
    Guid Id,
    string Title,
    PropertyType PropertyType,
    ListingTier Tier,
    string Region,
    int Bedrooms,
    int Beds,
    int MaxGuests,
    decimal NightlyRateMur,
    string? PrimaryPhotoUrl,
    DateTimeOffset CreatedAt,
    double Latitude,
    double Longitude,
    ListingVibe Vibe,
    PriceBand PriceBand,
    int? DriveTimeMinutes);
```

- [ ] **Step 3: Update `ListingSearchService.SearchAsync`**

Read the file. Add a constructor dependency on `IDriveTimeService`:

```csharp
private readonly IDriveTimeService _driveTime;

public ListingSearchService(DodostaysDbContext db, IDriveTimeService driveTime)
{
    _db = db;
    _driveTime = driveTime;
}
```

Within `SearchAsync`, after the existing `verifiedOnly` filter and before the sort switch, add bbox filtering:

```csharp
if (request.BoundingBox is not null)
{
    var bb = request.BoundingBox;
    query = query.Where(l =>
        l.Latitude >= bb.SouthLat && l.Latitude <= bb.NorthLat &&
        l.Longitude >= bb.WestLng && l.Longitude <= bb.EastLng);
}
```

Replace the projection block to include `Latitude`, `Longitude`, plus computed `Vibe`, `PriceBand`. Because the vibe classifier needs in-memory data (region/description/amenities), do this AFTER materialization:

```csharp
var rawItems = await query
    .OrderByDescending(l => l.CreatedAt) // base ordering; we'll re-sort by drive time below if anchors present
    .Select(l => new
    {
        l.Id, l.Title, l.PropertyType, l.Tier, l.Region,
        l.Bedrooms, l.Beds, l.MaxGuests, l.NightlyRateMur,
        PrimaryPhotoUrl = l.Photos.OrderBy(p => p.SortOrder).Select(p => p.PublicUrl).FirstOrDefault(),
        l.CreatedAt, l.Latitude, l.Longitude, l.Description, l.Amenities
    })
    .ToListAsync(ct);

// Apply client-side amenity filter (carried over from Plan 02a workaround)
if (request.RequiredAmenities is { Count: > 0 })
{
    rawItems = rawItems.Where(it => request.RequiredAmenities!.All(a => it.Amenities.Contains(a))).ToList();
}

// Compute vibe + price band per listing
var withVibe = rawItems.Select(it => new
{
    it.Id, it.Title, it.PropertyType, it.Tier, it.Region,
    it.Bedrooms, it.Beds, it.MaxGuests, it.NightlyRateMur, it.PrimaryPhotoUrl,
    it.CreatedAt, it.Latitude, it.Longitude,
    Vibe = ListingVibeClassifier.Classify(it.Region, it.Description, it.Amenities),
    PriceBand = ListingVibeClassifier.PriceBandFor(it.NightlyRateMur)
}).ToList();

// Anchor-aware sort: compute drive-time per listing, override sort when anchors present
List<(Guid Id, int? Mins)> driveTimes = new();
if (request.Anchors is { Count: > 0 })
{
    foreach (var it in withVibe)
    {
        var mins = await _driveTime.EstimateMinutesAsync(it.Latitude, it.Longitude, request.Anchors, ct);
        driveTimes.Add((it.Id, mins));
    }
    var driveTimeMap = driveTimes.ToDictionary(x => x.Id, x => x.Mins);
    withVibe = withVibe.OrderBy(it => driveTimeMap[it.Id] ?? int.MaxValue).ToList();
}
else
{
    // base sort by request.Sort
    withVibe = request.Sort switch
    {
        "price-asc" => withVibe.OrderBy(it => it.NightlyRateMur).ToList(),
        "price-desc" => withVibe.OrderByDescending(it => it.NightlyRateMur).ToList(),
        _ => withVibe.OrderByDescending(it => it.CreatedAt).ToList(),
    };
}

var driveLookup = driveTimes.ToDictionary(x => x.Id, x => x.Mins);
int? DriveFor(Guid id) => driveLookup.TryGetValue(id, out var v) ? v : (int?)null;

var total = withVibe.Count;
var page = Math.Max(1, request.Page);
var pageSize = Math.Clamp(request.PageSize, 1, 50);

var paged = withVibe.Skip((page - 1) * pageSize).Take(pageSize)
    .Select(it => new ListingSummaryDto(
        it.Id, it.Title, it.PropertyType, it.Tier, it.Region,
        it.Bedrooms, it.Beds, it.MaxGuests, it.NightlyRateMur,
        it.PrimaryPhotoUrl, it.CreatedAt,
        it.Latitude, it.Longitude,
        it.Vibe, it.PriceBand,
        DriveFor(it.Id)))
    .ToList();

var totalPages = (int)Math.Ceiling(total / (double)pageSize);
return new ListingSearchResponse(paged, page, pageSize, total, Math.Max(1, totalPages));
```

(Add `using Dodostays.Api.Modules.Listings.Domain;` and `using Dodostays.Api.Modules.Search.DriveTime;` at the top of the file if missing.)

- [ ] **Step 4: Update DI registration**

In `ListingsModule.AddListingsModule`, the `ListingSearchService` is `AddScoped` — that stays the same. The new `IDriveTimeService` constructor dep will be resolved automatically because `AddSearchModule` registers it.

There's an ordering risk: `AddListingsModule` is called before `AddSearchModule` in `Program.cs`. EF DI is fine because all of these are scoped resolutions, but to be safe, swap the order in `Program.cs` so `AddSearchModule` comes BEFORE `AddListingsModule`. Update Plan 2b.8 step 9 if needed:

```csharp
builder.Services.AddIdentityModule(builder.Configuration);
builder.Services.AddSearchModule(builder.Configuration);
builder.Services.AddListingsModule(builder.Configuration);
```

- [ ] **Step 5: Update `SearchListingsEndpoint.cs`**

Read the current file. The `ListingSearchQueryParameters` record needs new fields:

```csharp
public sealed record ListingSearchQueryParameters(
    string? Region,
    PropertyType? PropertyType,
    int? MinBedrooms,
    int? MinGuests,
    decimal? MaxNightlyMur,
    decimal? MinNightlyMur,
    string? Amenities,
    bool? VerifiedOnly,
    string? Sort,
    int? Page,
    int? PageSize,
    string? Bbox,
    string? Anchors);
```

In `HandleAsync`, after `var amenities = ParseAmenities(query.Amenities);`, add:

```csharp
Dodostays.Api.Contracts.Search.BoundingBox? bbox = null;
if (!string.IsNullOrWhiteSpace(query.Bbox)
    && Dodostays.Api.Contracts.Search.BoundingBox.TryParse(query.Bbox, out var parsed)
    && parsed is not null)
{
    bbox = parsed;
}

IReadOnlyList<Dodostays.Api.Contracts.Search.Anchor>? anchorList = null;
if (Dodostays.Api.Contracts.Search.Anchor.TryParseList(query.Anchors, out var parsedAnchors)
    && parsedAnchors.Count > 0)
{
    anchorList = parsedAnchors;
}
```

Then update the `ListingSearchRequest` construction:

```csharp
var request = new ListingSearchRequest(
    Region: query.Region,
    PropertyType: query.PropertyType,
    MinBedrooms: query.MinBedrooms,
    MinGuests: query.MinGuests,
    MaxNightlyMur: query.MaxNightlyMur,
    MinNightlyMur: query.MinNightlyMur,
    RequiredAmenities: amenities,
    VerifiedOnly: query.VerifiedOnly ?? false,
    Sort: query.Sort ?? "newest",
    Page: query.Page ?? 1,
    PageSize: query.PageSize ?? 20,
    BoundingBox: bbox,
    Anchors: anchorList);
```

- [ ] **Step 6: Build + run all existing tests**

```bash
cd C:/temp/Dodostays/api && dotnet build && dotnet test
```

Existing 24 listings integration tests must continue to pass. Some will need updates if they assert on `ListingSummaryDto` shape (they shouldn't — they use `Items.Should().ContainSingle(i => i.Title == "...")` which doesn't depend on field count). If any fail, fix them by adding the new positional values.

- [ ] **Step 7: Write `ListingSearchBboxFlowTests.cs`**

```csharp
using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.IntegrationTests.Listings;

namespace Dodostays.Api.IntegrationTests.Search;

public class ListingSearchBboxFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;
    public ListingSearchBboxFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Bbox_filter_returns_only_listings_inside()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        var fef = ListingTestHelpers.SampleListing("flic-en-flac")
            with { Title = "FEF in bbox", Latitude = -20.27, Longitude = 57.36 };
        var fefRes = await host.PostAsJsonAsync("/api/listings", fef);
        var fefDto = await fefRes.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{fefDto!.Id}/publish", null);

        var gb = ListingTestHelpers.SampleListing("grand-baie")
            with { Title = "GB out of bbox", Latitude = -20.01, Longitude = 57.58 };
        var gbRes = await host.PostAsJsonAsync("/api/listings", gb);
        var gbDto = await gbRes.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{gbDto!.Id}/publish", null);

        var anon = factory.CreateClient();
        var res = await anon.GetAsync("/api/listings?bbox=-20.31,57.32,-20.23,57.40");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var search = await res.Content.ReadFromJsonAsync<ListingSearchResponse>();
        search!.Items.Should().Contain(i => i.Title == "FEF in bbox");
        search.Items.Should().NotContain(i => i.Title == "GB out of bbox");
    }
}
```

- [ ] **Step 8: Write `ListingSearchAnchorFlowTests.cs`**

```csharp
using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.IntegrationTests.Listings;

namespace Dodostays.Api.IntegrationTests.Search;

public class ListingSearchAnchorFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;
    public ListingSearchAnchorFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Anchor_re_sorts_results_by_drive_time()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        var fef = ListingTestHelpers.SampleListing("flic-en-flac")
            with { Title = "Near anchor", Latitude = -20.27, Longitude = 57.36 };
        var fefDto = (await (await host.PostAsJsonAsync("/api/listings", fef)).Content.ReadFromJsonAsync<ListingDto>())!;
        await host.PostAsync($"/api/listings/{fefDto.Id}/publish", null);

        var gb = ListingTestHelpers.SampleListing("grand-baie")
            with { Title = "Far from anchor", Latitude = -20.01, Longitude = 57.58 };
        var gbDto = (await (await host.PostAsJsonAsync("/api/listings", gb)).Content.ReadFromJsonAsync<ListingDto>())!;
        await host.PostAsync($"/api/listings/{gbDto.Id}/publish", null);

        var anon = factory.CreateClient();
        var anchored = await anon.GetAsync("/api/listings?anchors=-20.27,57.36,Beach");
        var page = await anchored.Content.ReadFromJsonAsync<ListingSearchResponse>();
        page!.Items[0].Title.Should().Be("Near anchor");
        page.Items[0].DriveTimeMinutes.Should().NotBeNull();
        page.Items[0].DriveTimeMinutes!.Value.Should().BeLessThan(page.Items.Last().DriveTimeMinutes!.Value);
    }

    [Fact]
    public async Task DriveTimeMinutes_is_null_when_no_anchors()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var dto = ListingTestHelpers.SampleListing("flic-en-flac");
        var created = (await (await host.PostAsJsonAsync("/api/listings", dto)).Content.ReadFromJsonAsync<ListingDto>())!;
        await host.PostAsync($"/api/listings/{created.Id}/publish", null);

        var anon = factory.CreateClient();
        var res = await anon.GetAsync("/api/listings");
        var page = await res.Content.ReadFromJsonAsync<ListingSearchResponse>();
        page!.Items.Should().OnlyContain(i => i.DriveTimeMinutes == null);
    }
}
```

- [ ] **Step 9: Run integration tests** — expected: 3 new (1 bbox + 2 anchor) + previous 24 + later parse-flow = 28+. Confirm 0 failures.

- [ ] **Step 10: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "feat(listings): bbox + anchors-aware sort + vibe/priceBand on summary"
```

---

## Task 2b.10: Search parse integration test

**Files:**
- Create: `api/tests/Dodostays.Api.IntegrationTests/Search/SearchParseFlowTests.cs`

- [ ] **Step 1: Write**

```csharp
using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.IntegrationTests.Search;

public class SearchParseFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;
    public SearchParseFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Parse_extracts_filters_and_returns_bbox_hint()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();
        var req = new SearchParseRequest("3 bedroom villa in flic en flac with pool under 5000 mur");
        var res = await client.PostAsJsonAsync("/api/search/parse", req);
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<SearchParseResponse>();
        body!.Filters.Region.Should().Be("flic-en-flac");
        body.Filters.PropertyType.Should().Be(PropertyType.Villa);
        body.Filters.MinBedrooms.Should().Be(3);
        body.Filters.MaxNightlyMur.Should().Be(5000m);
        body.Filters.RequiredAmenities.Should().Contain(Amenity.Pool);
        body.Confidence.Should().BeGreaterThanOrEqualTo(0.5);
        body.Acknowledgement.Should().NotBeNullOrEmpty();
        body.BoundingBoxHint.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Parse_returns_400_on_empty_text()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/search/parse", new SearchParseRequest(""));
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
```

- [ ] **Step 2: Run + commit**

```bash
cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.IntegrationTests/Dodostays.Api.IntegrationTests.csproj --filter "FullyQualifiedName~SearchParseFlowTests"
git -C C:/temp/Dodostays add api/tests/Dodostays.Api.IntegrationTests/Search/
git -C C:/temp/Dodostays commit -m "test(search): integration tests for /api/search/parse"
```

---

## Task 2b.11: Frontend lib + search/anchor utilities

**Files:**
- Create: `web/src/lib/search.ts`
- Create: `web/src/lib/geo.ts`
- Create: `web/src/lib/anchors.ts`
- Modify: `web/src/lib/listings.ts` — extend `ListingSummary` with new fields

- [ ] **Step 1: Modify `web/src/lib/listings.ts`** — add to interface:

```ts
export type ListingVibe = "Mixed" | "Wave" | "Mountain" | "Leaf" | "Town";
export type PriceBand = "Budget" | "Mid" | "Premium";

export interface ListingSummary {
  id: string;
  title: string;
  propertyType: PropertyType;
  tier: ListingTier;
  region: string;
  bedrooms: number;
  beds: number;
  maxGuests: number;
  nightlyRateMur: number;
  primaryPhotoUrl: string | null;
  createdAt: string;
  latitude: number;
  longitude: number;
  vibe: ListingVibe;
  priceBand: PriceBand;
  driveTimeMinutes: number | null;
}
```

- [ ] **Step 2: Create `web/src/lib/search.ts`**

```ts
import { apiFetch } from "./api-client";
import type { Amenity, PropertyType } from "./listings";

export interface ParsedFilters {
  region: string | null;
  propertyType: PropertyType | null;
  minBedrooms: number | null;
  minGuests: number | null;
  maxNightlyMur: number | null;
  minNightlyMur: number | null;
  requiredAmenities: Amenity[];
  checkIn: string | null;
  checkOut: string | null;
  verifiedOnly: boolean;
  unknownTokens: string[];
}

export interface SearchParseResponse {
  filters: ParsedFilters;
  confidence: number;
  acknowledgement: string;
  boundingBoxHint: string | null;
}

export async function parseSearch(text: string, currentFilters?: ParsedFilters | null): Promise<SearchParseResponse> {
  return apiFetch<SearchParseResponse>("/api/search/parse", {
    method: "POST",
    body: JSON.stringify({ text, currentFilters: currentFilters ?? null }),
  });
}

export function filtersToSearchParams(f: ParsedFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.region) sp.set("region", f.region);
  if (f.propertyType) sp.set("propertyType", f.propertyType);
  if (f.minBedrooms !== null) sp.set("minBedrooms", String(f.minBedrooms));
  if (f.minGuests !== null) sp.set("minGuests", String(f.minGuests));
  if (f.maxNightlyMur !== null) sp.set("maxNightlyMur", String(f.maxNightlyMur));
  if (f.minNightlyMur !== null) sp.set("minNightlyMur", String(f.minNightlyMur));
  if (f.requiredAmenities.length > 0) sp.set("amenities", f.requiredAmenities.join(","));
  if (f.verifiedOnly) sp.set("verifiedOnly", "true");
  return sp;
}

export function searchParamsToFilters(sp: URLSearchParams): ParsedFilters {
  const am = sp.get("amenities");
  return {
    region: sp.get("region"),
    propertyType: (sp.get("propertyType") as PropertyType | null) ?? null,
    minBedrooms: sp.has("minBedrooms") ? Number(sp.get("minBedrooms")) : null,
    minGuests: sp.has("minGuests") ? Number(sp.get("minGuests")) : null,
    maxNightlyMur: sp.has("maxNightlyMur") ? Number(sp.get("maxNightlyMur")) : null,
    minNightlyMur: sp.has("minNightlyMur") ? Number(sp.get("minNightlyMur")) : null,
    requiredAmenities: am ? (am.split(",") as Amenity[]) : [],
    checkIn: null,
    checkOut: null,
    verifiedOnly: sp.get("verifiedOnly") === "true",
    unknownTokens: [],
  };
}
```

- [ ] **Step 3: Create `web/src/lib/geo.ts`**

```ts
export const REGION_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "grand-baie":     { lat: -20.0117, lng: 57.5800 },
  "flic-en-flac":   { lat: -20.2667, lng: 57.3667 },
  "tamarin":        { lat: -20.3220, lng: 57.3690 },
  "trou-aux-biches":{ lat: -20.0394, lng: 57.5481 },
  "pereybere":      { lat: -19.9967, lng: 57.5878 },
  "belle-mare":     { lat: -20.1900, lng: 57.7700 },
  "le-morne":       { lat: -20.4500, lng: 57.3167 },
  "blue-bay":       { lat: -20.4456, lng: 57.7100 },
  "albion":         { lat: -20.2117, lng: 57.4039 },
};

// Mapbox uses [lng, lat] tuples
export const MAURITIUS_BOUNDS: [[number, number], [number, number]] = [
  [57.29, -20.55],
  [57.83, -19.94],
];

export function bboxToString(sw: [number, number], ne: [number, number]): string {
  // sw = [lng, lat], ne = [lng, lat]
  return `${sw[1]},${sw[0]},${ne[1]},${ne[0]}`;
}
```

- [ ] **Step 4: Create `web/src/lib/anchors.ts`**

```ts
export interface Anchor {
  lat: number;
  lng: number;
  name: string;
}

export const MAX_ANCHORS = 3;

export function anchorsToString(anchors: Anchor[]): string {
  return anchors
    .slice(0, MAX_ANCHORS)
    .map((a) => `${a.lat},${a.lng},${encodeURIComponent(a.name)}`)
    .join("|");
}

export function parseAnchors(value: string | null): Anchor[] {
  if (!value) return [];
  return value
    .split("|")
    .filter(Boolean)
    .slice(0, MAX_ANCHORS)
    .map((token, i) => {
      const [lat, lng, ...rest] = token.split(",");
      return {
        lat: Number(lat),
        lng: Number(lng),
        name: rest.length ? decodeURIComponent(rest.join(",")) : `Anchor ${i + 1}`,
      };
    })
    .filter((a) => !isNaN(a.lat) && !isNaN(a.lng));
}
```

- [ ] **Step 5: Typecheck + commit**

```bash
cd C:/temp/Dodostays/web && npm run typecheck
git -C C:/temp/Dodostays add web/src/lib/
git -C C:/temp/Dodostays commit -m "feat(web): search/geo/anchors lib utilities and ListingSummary type extensions"
```

---

## Task 2b.12: AI search bar + filter chips + anchor list

**Files:**
- Create: `web/src/components/search/voice-button.tsx`
- Create: `web/src/components/search/ai-search-bar.tsx`
- Create: `web/src/components/search/filter-chips.tsx`
- Create: `web/src/components/search/anchor-list.tsx`
- Create: `web/src/components/search/search-as-i-move-toggle.tsx`

(Each is a small client component. See full code below.)

- [ ] **Step 1: `voice-button.tsx`** — placeholder that returns null in 02b. We'll wire Web Speech API in Plan 02c.

```tsx
"use client";

export function VoiceButton(_: { onTranscript: (text: string) => void }) {
  return null;
}
```

- [ ] **Step 2: `ai-search-bar.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseSearch, filtersToSearchParams, type ParsedFilters } from "@/lib/search";
import { VoiceButton } from "./voice-button";

interface Props {
  initialText?: string;
  initialFilters?: ParsedFilters | null;
  preserveParams?: string[]; // e.g. ['anchors', 'view'] - copied from the current URL
}

export function AiSearchBar({ initialText = "", initialFilters = null, preserveParams = [] }: Props) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(force?: string) {
    const trimmed = (force ?? text).trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await parseSearch(trimmed, initialFilters);
      const sp = filtersToSearchParams(res.filters);
      sp.set("q", trimmed);

      if (typeof window !== "undefined") {
        const current = new URLSearchParams(window.location.search);
        for (const k of preserveParams) {
          const v = current.get(k);
          if (v) sp.set(k, v);
        }
      }

      router.push(`/listings?${sp.toString()}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      className="flex w-full items-center gap-2 rounded-sm border-[1.5px] border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-[2px_2px_0_var(--color-foreground)]"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="3 beds Flic en Flac with pool, under 5000 MUR"
        className="flex-1 bg-transparent px-3 py-2 outline-none placeholder:text-[var(--color-muted-foreground)]"
        aria-label="Search stays"
      />
      <VoiceButton onTranscript={(t) => { setText(t); submit(t); }} />
      <button
        type="submit"
        disabled={busy}
        className="h-11 rounded-sm bg-[var(--color-primary)] px-5 text-[var(--color-primary-foreground)] disabled:opacity-50"
      >
        {busy ? "…" : "Search"}
      </button>
      {error && <p role="alert" className="ml-2 text-sm text-[var(--color-destructive)]">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 3: `filter-chips.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type ParsedFilters, filtersToSearchParams } from "@/lib/search";

export function FilterChips({ filters, preserveParams = [] }: { filters: ParsedFilters; preserveParams?: string[] }) {
  const router = useRouter();
  const chips = buildChips(filters);
  if (chips.length === 0) return null;

  function removeChip(remove: (f: ParsedFilters) => ParsedFilters) {
    const next = remove(filters);
    const sp = filtersToSearchParams(next);
    if (typeof window !== "undefined") {
      const current = new URLSearchParams(window.location.search);
      for (const k of preserveParams) {
        const v = current.get(k);
        if (v) sp.set(k, v);
      }
    }
    router.push(`/listings?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2 py-3">
      {chips.map((c) => (
        <button key={c.key} type="button" onClick={() => removeChip(c.remove)}
          className="flex items-center gap-1 rounded-sm border-[1.5px] border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1 text-sm hover:bg-[var(--color-muted)]">
          {c.label} <span aria-hidden className="ml-1 text-xs">×</span>
        </button>
      ))}
    </div>
  );
}

function buildChips(f: ParsedFilters): { key: string; label: string; remove: (f: ParsedFilters) => ParsedFilters }[] {
  const c: { key: string; label: string; remove: (f: ParsedFilters) => ParsedFilters }[] = [];
  if (f.region) c.push({ key: "r", label: f.region.replace(/-/g, " "), remove: (x) => ({ ...x, region: null }) });
  if (f.propertyType) c.push({ key: "t", label: f.propertyType, remove: (x) => ({ ...x, propertyType: null }) });
  if (f.minBedrooms !== null) c.push({ key: "b", label: `${f.minBedrooms}+ beds`, remove: (x) => ({ ...x, minBedrooms: null }) });
  if (f.minGuests !== null) c.push({ key: "g", label: `${f.minGuests}+ guests`, remove: (x) => ({ ...x, minGuests: null }) });
  if (f.maxNightlyMur !== null) c.push({ key: "max", label: `≤ MUR ${f.maxNightlyMur.toLocaleString()}`, remove: (x) => ({ ...x, maxNightlyMur: null }) });
  if (f.minNightlyMur !== null) c.push({ key: "min", label: `≥ MUR ${f.minNightlyMur.toLocaleString()}`, remove: (x) => ({ ...x, minNightlyMur: null }) });
  for (const a of f.requiredAmenities) c.push({ key: `a-${a}`, label: a, remove: (x) => ({ ...x, requiredAmenities: x.requiredAmenities.filter((y) => y !== a) }) });
  if (f.verifiedOnly) c.push({ key: "v", label: "verified only", remove: (x) => ({ ...x, verifiedOnly: false }) });
  return c;
}
```

- [ ] **Step 4: `anchor-list.tsx`**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { anchorsToString, parseAnchors, MAX_ANCHORS, type Anchor } from "@/lib/anchors";

export function AnchorList() {
  const router = useRouter();
  const sp = useSearchParams();
  const anchors = parseAnchors(sp.get("anchors"));

  function update(next: Anchor[]) {
    const params = new URLSearchParams(sp.toString());
    if (next.length === 0) params.delete("anchors");
    else params.set("anchors", anchorsToString(next));
    router.push(`/listings?${params.toString()}`);
  }

  function rename(i: number) {
    const name = prompt("Rename anchor", anchors[i].name) ?? anchors[i].name;
    update(anchors.map((a, idx) => idx === i ? { ...a, name } : a));
  }
  function remove(i: number) {
    update(anchors.filter((_, idx) => idx !== i));
  }

  if (anchors.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Tap the map to drop an <strong>anchor</strong> — listings will sort by drive-time to the places you care about. Up to {MAX_ANCHORS}.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {anchors.map((a, i) => (
        <li key={i} className="flex items-center gap-1 rounded-sm border-[1.5px] border-[var(--color-foreground)] bg-[var(--color-card)] px-3 py-1 text-sm shadow-[2px_2px_0_var(--color-foreground)]">
          <button onClick={() => rename(i)} className="font-semibold underline-offset-2 hover:underline">{a.name}</button>
          <button onClick={() => remove(i)} aria-label={`Remove ${a.name}`} className="ml-1 text-xs text-[var(--color-destructive)]">×</button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: `search-as-i-move-toggle.tsx`**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SearchAsIMoveToggle() {
  const router = useRouter();
  const sp = useSearchParams();
  const enabled = sp.get("liveSearch") !== "off";

  function toggle() {
    const next = new URLSearchParams(sp.toString());
    if (enabled) next.set("liveSearch", "off");
    else next.delete("liveSearch");
    router.push(`/listings?${next.toString()}`);
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
      <input type="checkbox" checked={enabled} onChange={toggle} className="accent-[var(--color-primary)]" />
      Search as I move
    </label>
  );
}
```

- [ ] **Step 6: Typecheck + commit**

```bash
cd C:/temp/Dodostays/web && npm run typecheck
git -C C:/temp/Dodostays add web/src/components/search/
git -C C:/temp/Dodostays commit -m "feat(web): AI search bar + filter chips + anchor list + live-search toggle"
```

---

## Task 2b.13: Mapbox listing map (clusters, vibe pins, anchors, hover sync, drag-to-search)

**Files:**
- Modify: `web/package.json` — add `mapbox-gl`
- Modify: `web/src/app/globals.css` — import mapbox-gl CSS
- Create: `web/src/components/search/lifestyle-pin.tsx`
- Create: `web/src/components/search/anchor-pin.tsx`
- Create: `web/src/components/search/listing-map.tsx`

- [ ] **Step 1: Install Mapbox**

```bash
cd C:/temp/Dodostays/web && npm install mapbox-gl@^3.8.0 && npm install --save-dev @types/mapbox-gl@^3.4.0
```

- [ ] **Step 2: Add Mapbox CSS to globals.css** — top of file:

```css
@import "mapbox-gl/dist/mapbox-gl.css";
```

- [ ] **Step 3: `lifestyle-pin.tsx`**

```tsx
import type { ListingVibe, PriceBand } from "@/lib/listings";

const FILL: Record<PriceBand, string> = {
  Budget: "#F5EFE6",
  Mid: "#D4A24C",
  Premium: "#C73E1D",
};

const STROKE = "#1A1410";

const PATHS: Record<ListingVibe, string> = {
  Wave: "M2 12 C 5 8, 9 16, 12 12 S 19 8, 22 12 L 22 18 L 2 18 Z",                       // wave silhouette
  Mountain: "M2 18 L 8 8 L 12 14 L 16 6 L 22 18 Z",                                       // peaks
  Leaf: "M12 3 C 18 3, 21 9, 19 14 C 17 19, 11 21, 7 18 C 3 15, 5 7, 12 3 Z M12 3 V 18", // leaf w/ vein
  Town: "M3 18 V 10 H 7 V 18 M 9 18 V 6 H 13 V 18 M 15 18 V 12 H 19 V 18 H 3",            // skyline
  Mixed: "M4 12 a 8 8 0 1 1 16 0 a 8 8 0 1 1 -16 0",                                      // disc
};

interface Props {
  vibe: ListingVibe;
  priceBand: PriceBand;
  priceMur: number;
  highlighted?: boolean;
}

export function lifestylePinHtml({ vibe, priceBand, priceMur, highlighted = false }: Props): HTMLElement {
  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.className = `flex items-center gap-1 rounded-sm border-[1.5px] bg-[#F5EFE6] px-2 py-1 text-xs font-semibold text-[#1A1410] shadow-[2px_2px_0_#1A1410] transition-transform ${highlighted ? "scale-110" : ""}`;
  wrap.style.borderColor = STROKE;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", PATHS[vibe]);
  path.setAttribute("fill", FILL[priceBand]);
  path.setAttribute("stroke", STROKE);
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  wrap.appendChild(svg);

  const label = document.createElement("span");
  label.textContent = `MUR ${priceMur.toLocaleString()}`;
  wrap.appendChild(label);

  return wrap;
}
```

- [ ] **Step 4: `anchor-pin.tsx`**

```tsx
export function anchorPinHtml(name: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "flex items-center gap-1 rounded-full border-[1.5px] border-[#1E3A8A] bg-[#1E3A8A] px-3 py-1 text-xs font-semibold text-[#F5EFE6] shadow-[2px_2px_0_#1A1410]";
  wrap.textContent = `⚓ ${name}`;
  return wrap;
}
```

- [ ] **Step 5: `listing-map.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { LngLatBoundsLike, Map as MapboxMap } from "mapbox-gl";
import { useRouter, useSearchParams } from "next/navigation";
import { MAURITIUS_BOUNDS, bboxToString } from "@/lib/geo";
import { anchorsToString, parseAnchors, MAX_ANCHORS, type Anchor } from "@/lib/anchors";
import { lifestylePinHtml } from "./lifestyle-pin";
import { anchorPinHtml } from "./anchor-pin";
import type { ListingSummary } from "@/lib/listings";

interface Props {
  listings: ListingSummary[];
  highlightId?: string | null;
  onPinHover?: (id: string | null) => void;
}

export function ListingMap({ listings, highlightId, onPinHover }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<{ id: string; marker: mapboxgl.Marker; el: HTMLElement; vibe: ListingSummary["vibe"]; priceBand: ListingSummary["priceBand"]; priceMur: number }[]>([]);
  const anchorMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const liveSearch = sp.get("liveSearch") !== "off";
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      bounds: MAURITIUS_BOUNDS,
      maxBounds: [[56.5, -20.9], [58.2, -19.5]],
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));

    map.on("click", (ev) => {
      // Only treat clicks NOT on a marker as anchor drops
      const target = ev.originalEvent.target as HTMLElement;
      if (target.closest(".mapboxgl-marker")) return;
      const current = parseAnchors(sp.get("anchors"));
      if (current.length >= MAX_ANCHORS) return;
      const next: Anchor = { lat: ev.lngLat.lat, lng: ev.lngLat.lng, name: `Anchor ${current.length + 1}` };
      const params = new URLSearchParams(window.location.search);
      params.set("anchors", anchorsToString([...current, next]));
      router.push(`/listings?${params.toString()}`);
    });

    map.on("moveend", () => {
      if (!liveSearch) {
        setShowSearchHere(true);
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const b = map.getBounds(); if (!b) return;
        const bbox = bboxToString([b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]);
        const params = new URLSearchParams(window.location.search);
        params.set("bbox", bbox);
        router.replace(`/listings?${params.toString()}`);
      }, 400);
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Render anchors when URL changes
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    anchorMarkersRef.current.forEach((m) => m.remove());
    anchorMarkersRef.current = [];

    const anchors = parseAnchors(sp.get("anchors"));
    for (const a of anchors) {
      const el = anchorPinHtml(a.name);
      const marker = new mapboxgl.Marker({ element: el, draggable: true }).setLngLat([a.lng, a.lat]).addTo(map);
      marker.on("dragend", () => {
        const lng = marker.getLngLat().lng;
        const lat = marker.getLngLat().lat;
        const current = parseAnchors(sp.get("anchors"))
          .map((x) => x.name === a.name ? { ...x, lat, lng } : x);
        const params = new URLSearchParams(window.location.search);
        params.set("anchors", anchorsToString(current));
        router.replace(`/listings?${params.toString()}`);
      });
      anchorMarkersRef.current.push(marker);
    }
  }, [sp, router]);

  // Render listing pins when listings change
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    markersRef.current.forEach((m) => m.marker.remove());
    markersRef.current = [];

    if (listings.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    for (const l of listings) {
      const el = lifestylePinHtml({ vibe: l.vibe, priceBand: l.priceBand, priceMur: l.nightlyRateMur });
      el.addEventListener("click", () => router.push(`/listings/${l.id}`));
      el.addEventListener("mouseenter", () => onPinHover?.(l.id));
      el.addEventListener("mouseleave", () => onPinHover?.(null));
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([l.longitude, l.latitude]).addTo(map);
      markersRef.current.push({ id: l.id, marker, el, vibe: l.vibe, priceBand: l.priceBand, priceMur: l.nightlyRateMur });
      bounds.extend([l.longitude, l.latitude]);
    }

    if (!bounds.isEmpty()) map.fitBounds(bounds as LngLatBoundsLike, { padding: 60, maxZoom: 13, duration: 400 });
  }, [listings, router, onPinHover]);

  // Highlight changes — update DOM classNames in place (cheap)
  useEffect(() => {
    for (const { id, el } of markersRef.current) {
      if (id === highlightId) el.classList.add("scale-110");
      else el.classList.remove("scale-110");
    }
  }, [highlightId]);

  function searchHere() {
    const map = mapRef.current; if (!map) return;
    const b = map.getBounds(); if (!b) return;
    const bbox = bboxToString([b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]);
    const params = new URLSearchParams(window.location.search);
    params.set("bbox", bbox);
    router.push(`/listings?${params.toString()}`);
    setShowSearchHere(false);
  }

  if (!token) {
    return (
      <div className="flex h-full min-h-96 items-center justify-center bg-[var(--color-muted)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
        Map unavailable — set <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> in <code className="font-mono">web/.env.local</code>.
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-96 w-full">
      <div ref={containerRef} className="absolute inset-0" />
      {!liveSearch && showSearchHere && (
        <button
          type="button"
          onClick={searchHere}
          className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-sm border-[1.5px] border-[var(--color-foreground)] bg-[var(--color-card)] px-4 py-1.5 text-sm font-semibold shadow-[2px_2px_0_var(--color-foreground)]"
        >
          Search this area
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: `.env.local.example`**

Create `web/.env.local.example`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_API_BASE_URL=http://localhost:5080
```

- [ ] **Step 7: Typecheck + commit**

```bash
cd C:/temp/Dodostays/web && npm run typecheck
git -C C:/temp/Dodostays add web/
git -C C:/temp/Dodostays commit -m "feat(web): Mapbox listing map with vibe pins, draggable anchors, drag-to-search, hover sync"
```

---

## Task 2b.14: Listings list pane + ListingsExplorer (split layout)

**Files:**
- Create: `web/src/components/search/listings-list.tsx`
- Create: `web/src/app/listings/listings-explorer.tsx`
- Modify: `web/src/app/listings/page.tsx`
- Delete: `web/src/app/listings/search-form.tsx` (replaced by AiSearchBar + chips)

- [ ] **Step 1: `listings-list.tsx`**

```tsx
"use client";

import Link from "next/link";
import type { ListingSummary } from "@/lib/listings";

interface Props {
  items: ListingSummary[];
  highlightId: string | null;
  onCardHover: (id: string | null) => void;
}

export function ListingsList({ items, highlightId, onCardHover }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-sm border-[1.5px] border-dashed border-[var(--color-border)] p-10 text-center">
        <p className="font-script text-2xl text-[var(--color-muted-foreground)]">pa enkor de listings…</p>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">No listings match your filters yet. Try removing a chip or panning the map.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {items.map((l) => (
        <li
          key={l.id}
          onMouseEnter={() => onCardHover(l.id)}
          onMouseLeave={() => onCardHover(null)}
          className={`group transition-shadow ${highlightId === l.id ? "outline outline-2 outline-[var(--color-foreground)]" : ""}`}
        >
          <Link href={`/listings/${l.id}`} className="flex gap-3">
            <div className="aspect-[4/3] w-40 shrink-0 overflow-hidden border-[1.5px] border-[var(--color-border)] bg-[var(--color-muted)]">
              {l.primaryPhotoUrl && <img src={l.primaryPhotoUrl} alt={l.title} className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg group-hover:underline">{l.title}</h3>
              <p className="font-script text-sm text-[var(--ds-ochre,_#D4A24C)]">{l.region.replace(/-/g, " ")}</p>
              <p className="mt-1 text-sm font-semibold">MUR {l.nightlyRateMur.toLocaleString()} <span className="font-normal text-[var(--color-muted-foreground)]">/ night</span></p>
              {l.driveTimeMinutes !== null && (
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">~{l.driveTimeMinutes} min from your anchor</p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: `listings-explorer.tsx`**

```tsx
"use client";

import { useState } from "react";
import { ListingsList } from "@/components/search/listings-list";
import { ListingMap } from "@/components/search/listing-map";
import { AnchorList } from "@/components/search/anchor-list";
import { SearchAsIMoveToggle } from "@/components/search/search-as-i-move-toggle";
import type { ListingSummary } from "@/lib/listings";

interface Props {
  items: ListingSummary[];
}

export function ListingsExplorer({ items }: Props) {
  const [highlightId, setHighlightId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
      <section className="order-2 lg:order-1 max-h-[78vh] overflow-y-auto pr-1">
        <div className="mb-3"><AnchorList /></div>
        <ListingsList items={items} highlightId={highlightId} onCardHover={setHighlightId} />
      </section>
      <section className="order-1 lg:order-2">
        <div className="flex justify-end pb-2">
          <SearchAsIMoveToggle />
        </div>
        <div className="h-[60vh] border-[1.5px] border-[var(--color-border)] lg:h-[78vh]">
          <ListingMap listings={items} highlightId={highlightId} onPinHover={setHighlightId} />
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Replace `web/src/app/listings/page.tsx`**

```tsx
import { searchListings, type ListingSearchResponse } from "@/lib/listings";
import { searchParamsToFilters } from "@/lib/search";
import { AiSearchBar } from "@/components/search/ai-search-bar";
import { FilterChips } from "@/components/search/filter-chips";
import { ListingsExplorer } from "./listings-explorer";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export default async function ListingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const params: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") params[k] = v;
  }

  let results: ListingSearchResponse;
  let error: string | null = null;
  try { results = await searchListings(params); }
  catch (e) {
    results = { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 1 };
    error = (e as Error).message;
  }

  const filters = searchParamsToFilters(new URLSearchParams(params as Record<string, string>));
  const initialText = params.q ?? "";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <header className="mb-4">
          <h1 className="font-display text-4xl">Browse Mauritius</h1>
          <p className="font-script text-xl text-[var(--ds-ochre,_#D4A24C)]">kot ou trouve nou.</p>
        </header>
        <AiSearchBar initialText={initialText} initialFilters={filters} preserveParams={["anchors", "bbox", "liveSearch"]} />
        <FilterChips filters={filters} preserveParams={["anchors", "bbox", "liveSearch"]} />
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">{results.totalCount} listings</p>
        {error && <p role="alert" className="mb-4 text-sm text-[var(--color-destructive)]">{error}</p>}
        <ListingsExplorer items={results.items} />
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 4: Delete `web/src/app/listings/search-form.tsx`**

```bash
rm C:/temp/Dodostays/web/src/app/listings/search-form.tsx
```

- [ ] **Step 5: Typecheck + lint + e2e**

```bash
cd C:/temp/Dodostays/web && npm run typecheck && npm run lint && npm run test:e2e
```

Expected: 3 e2e still pass. The existing `listings.spec.ts` test depends on `getByRole("heading", { name: title })` after navigating to `/listings` — the `ListingsList` renders titles as `<h3>` so the test should still match.

If `listings.spec.ts` fails because the new layout broke a selector, fix the page (not the test) — the rule is preserve selectors.

- [ ] **Step 6: Commit**

```bash
git -C C:/temp/Dodostays add web/
git -C C:/temp/Dodostays commit -m "feat(web): /listings rebuilt as split-layout map+list with anchors and hover sync"
```

---

## Task 2b.15: Homepage hero search → AI search

**Files:**
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Read the current `web/src/app/page.tsx`** and find the homepage search bar section. Replace its inline search row with the AI search bar:

```tsx
import { AiSearchBar } from "@/components/search/ai-search-bar";
```

In the hero, wherever the inline "Where / When / Guests / Search" strip currently lives, replace its inner contents with:

```tsx
<div className="absolute -bottom-12 left-1/2 w-full max-w-3xl -translate-x-1/2 px-4 sm:px-0">
  <AiSearchBar />
</div>
```

(Match existing positioning so the visual alignment with the hero photo is preserved.)

- [ ] **Step 2: Typecheck + e2e**

```bash
cd C:/temp/Dodostays/web && npm run typecheck && npm run test:e2e
```

Expected: 3 e2e still pass. Smoke test relies on `getByRole("heading", { name: "DodoStays" })` matching some `DodoStays` heading on `/` — preserve at least one.

- [ ] **Step 3: Commit**

```bash
git -C C:/temp/Dodostays add web/src/app/page.tsx
git -C C:/temp/Dodostays commit -m "feat(web): homepage hero uses AiSearchBar"
```

---

## Task 2b.16: Search e2e

**Files:**
- Create: `web/e2e/search.spec.ts`

- [ ] **Step 1: Write**

```ts
import { test, expect } from "@playwright/test";

const apiBase = process.env.E2E_API_BASE ?? "http://localhost:5080";

test.beforeAll(async ({ request }) => {
  let reachable = false;
  try {
    const res = await request.get(`${apiBase}/health/live`);
    reachable = res.ok();
  } catch { reachable = false; }
  test.skip(!reachable, "Backend API not reachable on " + apiBase);
});

test("AI search bar navigates to /listings with parsed filters", async ({ page }) => {
  await page.goto("/");

  await page.getByPlaceholder(/Flic en Flac/i).fill("3 bedroom villa in flic en flac with pool");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/listings\?.+/);
  await expect(page).toHaveURL(/region=flic-en-flac/);
  await expect(page).toHaveURL(/propertyType=Villa/);
  await expect(page).toHaveURL(/minBedrooms=3/);
  await expect(page).toHaveURL(/amenities=Pool/);

  await expect(page.getByText(/flic en flac/i)).toBeVisible();
  await expect(page.getByText(/Villa/i).first()).toBeVisible();
  await expect(page.getByText(/3\+ beds/i)).toBeVisible();
});

test("Empty anchors message renders on listings page", async ({ page }) => {
  await page.goto("/listings");
  await expect(page.getByText(/Tap the map to drop an/i)).toBeVisible();
});
```

- [ ] **Step 2: Run e2e**

```bash
cd C:/temp/Dodostays/web && npm run test:e2e
```

Expected: 5 tests pass total (smoke + auth + listings + 2 search).

- [ ] **Step 3: Commit**

```bash
git -C C:/temp/Dodostays add web/e2e/search.spec.ts
git -C C:/temp/Dodostays commit -m "test(web): e2e for AI search submission and anchor empty-state"
```

---

## Task 2b.17: Manual browser verification

This is a manual user verification step.

- [ ] **Step 1: Ensure backend + frontend running, with optional Mapbox token**

Backend: `cd api && dotnet run --project src/Dodostays.Api`
Frontend: `cd web && npm run dev`

Without a Mapbox token, the map shows "Map unavailable" but the list, anchors, and search still work.

For full UX, drop a token in `web/.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
```
Restart `npm run dev`.

- [ ] **Step 2: Browser flow**

- Open http://localhost:3000
- AI search: type "3 bedroom villa in flic en flac with pool under 5000 mur" → press Enter
- Land on `/listings?region=flic-en-flac&...&q=...`
- See filter chips above results; click one to remove
- See split layout: list on the left, map on the right (or "Map unavailable" message)
- (With Mapbox) Tap empty area on the map → an `Anchor 1` pin drops; URL gains `?anchors=...`
- Drag the anchor → URL updates with new lat/lng on `mouseup`
- See list re-sort by drive-time; the first card shows "~X min from your anchor"
- Click an anchor's name in the chip list → prompt to rename
- Pan the map → "Search as I move" is on by default → URL updates with `bbox=...` after 400ms
- Toggle "Search as I move" off → pan again → "Search this area" button appears top-center → click it → bbox updates
- Hover a card → its corresponding pin scales (highlighted); hover a pin → its card outlines

- [ ] **Step 3: Sanity check parse cache**

```bash
curl -s -X POST http://localhost:5080/api/search/parse \
  -H "Content-Type: application/json" \
  -d '{"text":"verified pool villa tamarin"}'
```

Should be quick on second call (cache hit).

---

## Definition of Done — Plan 02b

- [ ] `Dodostays.Api.Contracts.Search` with `ParsedFilters`, `SearchParseRequest`, `SearchParseResponse`, `BoundingBox`, `Anchor` (BoundingBox + Anchor moved into Contracts so Listings.Contracts can reference them)
- [ ] `Dodostays.Api.Contracts.Listings.ListingVibe` and `PriceBand` enums
- [ ] `Search` module with `IListingNlParser` (InMemory + Claude skeleton with try/catch fallback), `NlParseCache` (24h TTL), `IDriveTimeService` (Haversine + Mapbox skeleton), `SearchOrchestrator`, `POST /api/search/parse`
- [ ] `ListingVibeClassifier` rule-based per spec; populated on every search summary
- [ ] `ListingSearchService` extended with bbox + anchors-aware sort; computes drive-time per result via `IDriveTimeService`
- [ ] `ListingSummaryDto` includes `Latitude`, `Longitude`, `Vibe`, `PriceBand`, `DriveTimeMinutes`
- [ ] `/api/listings` accepts `bbox`, `anchors` query params
- [ ] Backend tests: 6 BoundingBox + 4 Anchor + 12 vibe-classifier + 6 InMemoryParser + 3 NlParseCache + 4 Haversine + 1 bbox flow + 2 anchor flow + 2 parse flow = ~40 new
- [ ] Frontend `/listings` rebuilt as 60/40 split (list left, map right, full-height) with AI search bar + chips + anchor list + live-search toggle + Search-this-area
- [ ] Mapbox map: vibe-shaped + price-banded pins, draggable anchor pins, click empty area = drop anchor (capped at 3), drag-to-search debounced 400ms, hover sync
- [ ] Homepage hero uses `<AiSearchBar />`
- [ ] 2 new Playwright e2e (AI search + anchor empty-state); total 5 passing
- [ ] Manual browser verification works (gracefully without Mapbox token)

**Out of scope (NOT in 02b):**
- Voice input (returns null in 02b; built in 02c)
- Map "story hover" (one-line geographic narrative per pin) — 02c
- Date pickers (CheckIn/CheckOut filters parse but UI shows placeholder text only)
- AI-ranked results / "why this matches"
- Multi-currency display (still MUR only)
- Saved searches / search history
- Mobile bottom-sheet refinement (mobile stacks list under map; not a true sheet)
- Server-enforced rate limiting (configured but not enforced — Plan 06)
- Real Mapbox Directions API drive-time (skeleton calls Haversine fallback)
- Real Anthropic-Claude integration tested against the live API (the SDK is wired, but Provider stays InMemory unless an API key is configured)

## Open Items (deferred)

1. **Polygon free-draw** — `mapbox-gl-draw` for "draw your area" — Plan 02c
2. **Cluster pins at low zoom** — Mapbox's built-in clustering needs a `geojson` source rather than DOM markers; a refactor for Plan 02c
3. **Voice on the map** — Plan 02c headline UX
4. **Story hover** — Claude-generated one-liner per pin — Plan 02c
5. **Real Mapbox Directions API** — replace Haversine fallback once a public token is available; rate-limit to 90 req/min/IP per Mapbox quota
6. **Server-side amenity filter** (still client-side from Plan 02a workaround); revisit when dropping the value converter is appropriate
7. **Anthropic SDK API surface drift** — verify symbol names against the installed package version
