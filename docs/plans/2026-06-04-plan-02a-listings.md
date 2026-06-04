# DodoStays Plan 02a — Listings (CRUD, photos, basic search) + thin frontend slice

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hosts can create, edit, photograph, and publish a property listing. Tourists can browse and view listings via region/property-type/price/amenity filters. End-to-end browser flow verified: host signs up → creates a villa → uploads photos → publishes → another browser visitor finds it via search → opens detail page.

**Architecture:** New `Listings` module under `api/src/Dodostays.Api/Modules/Listings/` mirroring the Identity module shape — own entities, own DbContext partial, own endpoints, own DI registration. Listing photos are stored via an `IPhotoStorage` abstraction: `LocalFilesystemPhotoStorage` (default for dev — saves under `wwwroot/photos/`) and `R2PhotoStorage` (skeleton for prod, throws until launch readiness). Search is plain SQL/EF filtering against PostGIS-enabled tables for now; AI conversational search is Plan 02b.

**Tech Stack additions:**
- Postgres array column (`text[]`) for amenity tags via Npgsql
- `Microsoft.AspNetCore.StaticFiles` (built-in) for serving photos in dev
- Multipart upload via `IFormFile` (built-in)
- Frontend: native `<form>` + `FormData` for photo upload (no extra deps)

**Pre-conditions (Plan 01 outputs we depend on):**
- `IUserContext` from `Dodostays.Api.Contracts.Identity`
- `DodostaysUser` entity, `HostProfile` table
- `IdentityModule` registered in `Program.cs`
- Bearer JWT auth working
- Frontend `AuthProvider` + `apiFetch` + `useAuth()` hook

---

## File Structure

```
api/src/Dodostays.Api.Contracts/
  Listings/
    PropertyType.cs                       # enum Villa | Apartment | Guesthouse
    ListingTier.cs                        # enum Standard | Verified
    ListingStatus.cs                      # enum Draft | Published | Suspended | Archived
    Amenity.cs                            # enum Pool | BeachAccess | AirCon | Wifi | Kitchen | Parking | Tv | WashingMachine | Balcony | Garden
    ListingPhotoDto.cs
    ListingDto.cs                         # full record (detail page)
    ListingSummaryDto.cs                  # light record (search cards)
    CreateListingRequest.cs
    UpdateListingRequest.cs
    ListingSearchRequest.cs
    ListingSearchResponse.cs              # paged result

api/src/Dodostays.Api/Modules/Listings/
  ListingsModule.cs                       # AddListingsModule, MapListingsEndpoints
  Domain/
    Listing.cs
    ListingPhoto.cs
  Database/
    DodostaysDbContext.Listings.cs        # partial: DbSet<Listing>, DbSet<ListingPhoto>
    ListingEntityConfigurations.cs
    (migration goes to Common/Database/Migrations/)
  Storage/
    PhotoStorageOptions.cs                # config binding
    IPhotoStorage.cs                      # SaveAsync, DeleteAsync, BuildPublicUrl
    LocalFilesystemPhotoStorage.cs        # writes to wwwroot/photos/
    R2PhotoStorage.cs                     # skeleton, throws NotImplementedException
  Services/
    ListingService.cs                     # CRUD orchestration
    ListingSearchService.cs               # IQueryable filtering + paging
  Endpoints/
    CreateListingEndpoint.cs              # POST /api/listings (host)
    UpdateListingEndpoint.cs              # PUT /api/listings/{id} (host)
    DeleteListingEndpoint.cs              # DELETE /api/listings/{id} (host)
    PublishListingEndpoint.cs             # POST /api/listings/{id}/publish (host)
    UnpublishListingEndpoint.cs           # POST /api/listings/{id}/unpublish (host)
    GetMyListingsEndpoint.cs              # GET /api/listings/mine (host)
    GetListingEndpoint.cs                 # GET /api/listings/{id} (public)
    SearchListingsEndpoint.cs             # GET /api/listings (public)
    UploadPhotoEndpoint.cs                # POST /api/listings/{id}/photos (host, multipart)
    DeletePhotoEndpoint.cs                # DELETE /api/listings/{id}/photos/{photoId} (host)
  Validation/
    CreateListingValidator.cs
    UpdateListingValidator.cs
    ListingSearchValidator.cs

api/src/Dodostays.Api/wwwroot/
  photos/                                 # created at runtime; .gitkeep committed

api/tests/
  Dodostays.Api.Tests/
    Listings/
      LocalFilesystemPhotoStorageTests.cs
      CreateListingValidatorTests.cs
      ListingSearchServiceTests.cs        # uses InMemory provider where possible
  Dodostays.Api.IntegrationTests/
    Listings/
      ListingCrudFlowTests.cs
      ListingSearchFlowTests.cs
      ListingPhotoFlowTests.cs
      ListingPublishFlowTests.cs

web/src/
  lib/
    listings.ts                           # API client functions
  app/
    listings/
      page.tsx                            # public browse + filter form
      [id]/
        page.tsx                          # listing detail
    host/
      listings/
        page.tsx                          # host's listings dashboard
        new/
          page.tsx                        # create form
        [id]/
          edit/
            page.tsx                      # edit form
  e2e/
    listings.spec.ts                      # host creates listing → browses on public page
```

**Module boundary rule:** Listings depends on `IUserContext` (from Contracts) and `DodostaysDbContext` (from Common). It does NOT reference `DodostaysUser`, `HostProfile`, or other Identity internals.

**Listing ownership rule:** every listing has `HostUserId` (FK to `AspNetUsers.Id`). Mutations (create/update/delete/publish/photo) require `HostUserId == CurrentUserId`. Cross-host mutations return 403.

---

## Task 2a.1: Listings contracts

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Listings/PropertyType.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Listings/ListingTier.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Listings/ListingStatus.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Listings/Amenity.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Listings/ListingPhotoDto.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Listings/ListingDto.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Listings/ListingSummaryDto.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Listings/CreateListingRequest.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Listings/UpdateListingRequest.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Listings/ListingSearchRequest.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Listings/ListingSearchResponse.cs`

- [ ] **Step 1: Create `PropertyType.cs`**

```csharp
using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Listings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PropertyType
{
    Villa = 0,
    Apartment = 1,
    Guesthouse = 2
}
```

- [ ] **Step 2: Create `ListingTier.cs`**

```csharp
using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Listings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ListingTier
{
    Standard = 0,
    Verified = 1
}
```

- [ ] **Step 3: Create `ListingStatus.cs`**

```csharp
using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Listings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ListingStatus
{
    Draft = 0,
    Published = 1,
    Suspended = 2,
    Archived = 3
}
```

- [ ] **Step 4: Create `Amenity.cs`**

```csharp
using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Listings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum Amenity
{
    Pool = 0,
    BeachAccess = 1,
    AirCon = 2,
    Wifi = 3,
    Kitchen = 4,
    Parking = 5,
    Tv = 6,
    WashingMachine = 7,
    Balcony = 8,
    Garden = 9,
    Bbq = 10,
    Generator = 11
}
```

- [ ] **Step 5: Create `ListingPhotoDto.cs`**

```csharp
namespace Dodostays.Api.Contracts.Listings;

public sealed record ListingPhotoDto(
    Guid Id,
    string PublicUrl,
    string? Caption,
    int SortOrder);
```

- [ ] **Step 6: Create `ListingDto.cs`**

```csharp
namespace Dodostays.Api.Contracts.Listings;

public sealed record ListingDto(
    Guid Id,
    Guid HostUserId,
    string HostDisplayName,
    string Title,
    string Description,
    PropertyType PropertyType,
    ListingTier Tier,
    ListingStatus Status,
    string Region,
    string AddressLine,
    double Latitude,
    double Longitude,
    int Bedrooms,
    int Beds,
    int Bathrooms,
    int MaxGuests,
    decimal NightlyRateMur,
    decimal CleaningFeeMur,
    int MinStayNights,
    IReadOnlyList<Amenity> Amenities,
    IReadOnlyList<ListingPhotoDto> Photos,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PublishedAt);
```

- [ ] **Step 7: Create `ListingSummaryDto.cs`**

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
    DateTimeOffset CreatedAt);
```

- [ ] **Step 8: Create `CreateListingRequest.cs`**

```csharp
namespace Dodostays.Api.Contracts.Listings;

public sealed record CreateListingRequest(
    string Title,
    string Description,
    PropertyType PropertyType,
    string Region,
    string AddressLine,
    double Latitude,
    double Longitude,
    int Bedrooms,
    int Beds,
    int Bathrooms,
    int MaxGuests,
    decimal NightlyRateMur,
    decimal CleaningFeeMur,
    int MinStayNights,
    IReadOnlyList<Amenity> Amenities);
```

- [ ] **Step 9: Create `UpdateListingRequest.cs`**

```csharp
namespace Dodostays.Api.Contracts.Listings;

public sealed record UpdateListingRequest(
    string Title,
    string Description,
    PropertyType PropertyType,
    string Region,
    string AddressLine,
    double Latitude,
    double Longitude,
    int Bedrooms,
    int Beds,
    int Bathrooms,
    int MaxGuests,
    decimal NightlyRateMur,
    decimal CleaningFeeMur,
    int MinStayNights,
    IReadOnlyList<Amenity> Amenities);
```

- [ ] **Step 10: Create `ListingSearchRequest.cs`**

```csharp
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
    int PageSize = 20);
```

- [ ] **Step 11: Create `ListingSearchResponse.cs`**

```csharp
namespace Dodostays.Api.Contracts.Listings;

public sealed record ListingSearchResponse(
    IReadOnlyList<ListingSummaryDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
```

- [ ] **Step 12: Build**

```bash
cd C:/temp/Dodostays/api && dotnet build src/Dodostays.Api.Contracts/Dodostays.Api.Contracts.csproj
```

Expected: 0 errors.

- [ ] **Step 13: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api.Contracts/Listings/
git -C C:/temp/Dodostays commit -m "feat(contracts): add Listings DTOs and enums"
```

---

## Task 2a.2: Listing domain entities

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Domain/Listing.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Domain/ListingPhoto.cs`

- [ ] **Step 1: Create `Listing.cs`**

```csharp
using NetTopologySuite.Geometries;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.Modules.Listings.Domain;

public class Listing
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HostUserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public PropertyType PropertyType { get; set; }
    public ListingTier Tier { get; set; } = ListingTier.Standard;
    public ListingStatus Status { get; set; } = ListingStatus.Draft;
    public string Region { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public Point Location { get; set; } = default!;
    public int Bedrooms { get; set; }
    public int Beds { get; set; }
    public int Bathrooms { get; set; }
    public int MaxGuests { get; set; }
    public decimal NightlyRateMur { get; set; }
    public decimal CleaningFeeMur { get; set; }
    public int MinStayNights { get; set; } = 1;
    public List<Amenity> Amenities { get; set; } = new();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? PublishedAt { get; set; }
    public List<ListingPhoto> Photos { get; set; } = new();

    public void Touch() => UpdatedAt = DateTimeOffset.UtcNow;

    public void Publish()
    {
        Status = ListingStatus.Published;
        PublishedAt ??= DateTimeOffset.UtcNow;
        Touch();
    }

    public void Unpublish()
    {
        Status = ListingStatus.Draft;
        Touch();
    }
}
```

- [ ] **Step 2: Create `ListingPhoto.cs`**

```csharp
namespace Dodostays.Api.Modules.Listings.Domain;

public class ListingPhoto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public Listing Listing { get; set; } = null!;
    public string StoragePath { get; set; } = string.Empty;
    public string PublicUrl { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public int SortOrder { get; set; }
    public long SizeBytes { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
```

- [ ] **Step 3: Build**

```bash
cd C:/temp/Dodostays/api && dotnet build
```

Expected: 0 errors. (Kill `Dodostays.Api.exe` if file lock.)

- [ ] **Step 4: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Listings/Domain/
git -C C:/temp/Dodostays commit -m "feat(listings): add Listing and ListingPhoto domain entities"
```

---

## Task 2a.3: DbContext wiring + migration

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Database/ListingEntityConfigurations.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Database/DodostaysDbContext.Listings.cs`
- Modify: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Common/Database/DodostaysDbContext.cs` (call OnModelCreatingListings)

- [ ] **Step 1: Create `ListingEntityConfigurations.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Domain;

namespace Dodostays.Api.Modules.Listings.Database;

internal static class ListingEntityConfigurations
{
    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Listing>(b =>
        {
            b.HasKey(l => l.Id);
            b.Property(l => l.Title).IsRequired().HasMaxLength(200);
            b.Property(l => l.Description).IsRequired().HasMaxLength(5000);
            b.Property(l => l.PropertyType).HasConversion<int>();
            b.Property(l => l.Tier).HasConversion<int>();
            b.Property(l => l.Status).HasConversion<int>();
            b.Property(l => l.Region).IsRequired().HasMaxLength(64);
            b.Property(l => l.AddressLine).IsRequired().HasMaxLength(500);
            b.Property(l => l.NightlyRateMur).HasPrecision(12, 2);
            b.Property(l => l.CleaningFeeMur).HasPrecision(12, 2);
            b.Property(l => l.Location).HasColumnType("geography (Point, 4326)");
            b.Property(l => l.Amenities)
                .HasConversion(
                    v => v.Select(a => (int)a).ToArray(),
                    v => v.Select(i => (Amenity)i).ToList())
                .Metadata.SetValueComparer(new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<Amenity>>(
                    (a, b) => (a == null && b == null) || (a != null && b != null && a.SequenceEqual(b)),
                    a => a.Aggregate(0, (h, v) => HashCode.Combine(h, (int)v)),
                    a => a.ToList()));
            b.Property(l => l.Amenities).HasColumnType("integer[]");
            b.HasIndex(l => l.HostUserId);
            b.HasIndex(l => new { l.Status, l.Region });
            b.HasIndex(l => l.PropertyType);
            b.HasIndex(l => l.NightlyRateMur);
        });

        modelBuilder.Entity<ListingPhoto>(b =>
        {
            b.HasKey(p => p.Id);
            b.Property(p => p.StoragePath).IsRequired().HasMaxLength(1024);
            b.Property(p => p.PublicUrl).IsRequired().HasMaxLength(2048);
            b.Property(p => p.Caption).HasMaxLength(500);
            b.Property(p => p.ContentType).IsRequired().HasMaxLength(100);
            b.HasOne(p => p.Listing)
                .WithMany(l => l.Photos)
                .HasForeignKey(p => p.ListingId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(p => new { p.ListingId, p.SortOrder });
        });
    }
}
```

- [ ] **Step 2: Create `DodostaysDbContext.Listings.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Listings.Domain;

namespace Dodostays.Api.Modules.Common.Database;

public partial class DodostaysDbContext
{
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<ListingPhoto> ListingPhotos => Set<ListingPhoto>();

    private static void OnModelCreatingListings(ModelBuilder modelBuilder)
    {
        Modules.Listings.Database.ListingEntityConfigurations.Apply(modelBuilder);
    }
}
```

- [ ] **Step 3: Modify `DodostaysDbContext.cs`** to call the new partial

Read `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Common/Database/DodostaysDbContext.cs`. The `OnModelCreating` method currently calls `OnModelCreatingIdentity(modelBuilder)`. Add a call to `OnModelCreatingListings(modelBuilder)` AFTER the Identity call. Final method:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);
    modelBuilder.HasPostgresExtension("postgis");
    OnModelCreatingIdentity(modelBuilder);
    OnModelCreatingListings(modelBuilder);
}
```

- [ ] **Step 4: Build**

```bash
cd C:/temp/Dodostays/api && dotnet build
```

Expected: 0 errors. (Kill `Dodostays.Api.exe` if locked.)

- [ ] **Step 5: Generate migration**

```bash
cd C:/temp/Dodostays/api
dotnet ef migrations add AddListingsSchema --project src/Dodostays.Api --output-dir Modules/Common/Database/Migrations
```

Read the generated migration's `Up()` method. It should create:
- `Listings` table with all columns + `Location geography(Point,4326)` + `Amenities integer[]`
- `ListingPhotos` table with FK to Listings (cascade)
- 4 indexes on Listings (`HostUserId`, `(Status,Region)`, `PropertyType`, `NightlyRateMur`)
- 1 index on ListingPhotos `(ListingId, SortOrder)`

If anything is missing, STOP and report.

- [ ] **Step 6: Apply migration**

```bash
dotnet ef database update --project src/Dodostays.Api
```

- [ ] **Step 7: Verify in Postgres**

```bash
docker exec dodostays-postgres psql -U dodostays -d dodostays -c "\dt"
```

Expected: `Listings`, `ListingPhotos` tables present alongside the existing AspNet* and DodoStays Identity tables.

```bash
docker exec dodostays-postgres psql -U dodostays -d dodostays -c "\d \"Listings\""
```

Expected: see `Location` column with type `geography(Point,4326)` and `Amenities` with type `integer[]`.

- [ ] **Step 8: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "feat(listings): wire entities into DodostaysDbContext + EF migration"
```

---

## Task 2a.4: Photo storage abstraction

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Storage/PhotoStorageOptions.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Storage/IPhotoStorage.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Storage/LocalFilesystemPhotoStorage.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Storage/R2PhotoStorage.cs`
- Test: `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/Listings/LocalFilesystemPhotoStorageTests.cs`

- [ ] **Step 1: Write the failing test**

Create `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/Listings/LocalFilesystemPhotoStorageTests.cs`:

```csharp
using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Dodostays.Api.Modules.Listings.Storage;

namespace Dodostays.Api.Tests.Listings;

public class LocalFilesystemPhotoStorageTests : IDisposable
{
    private readonly string _root;
    private readonly LocalFilesystemPhotoStorage _storage;

    public LocalFilesystemPhotoStorageTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "ds-photo-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);
        var opts = Options.Create(new PhotoStorageOptions
        {
            Provider = "Local",
            LocalRoot = _root,
            PublicBaseUrl = "http://localhost:5080/photos"
        });
        _storage = new LocalFilesystemPhotoStorage(opts);
    }

    [Fact]
    public async Task SaveAsync_writes_file_and_returns_relative_path()
    {
        var listingId = Guid.NewGuid();
        var content = new byte[] { 1, 2, 3, 4, 5 };
        using var stream = new MemoryStream(content);

        var result = await _storage.SaveAsync(listingId, "test.jpg", "image/jpeg", stream, CancellationToken.None);

        result.RelativePath.Should().StartWith($"{listingId}/");
        result.RelativePath.Should().EndWith(".jpg");
        result.PublicUrl.Should().StartWith("http://localhost:5080/photos/");
        var fullPath = Path.Combine(_root, result.RelativePath);
        File.Exists(fullPath).Should().BeTrue();
        (await File.ReadAllBytesAsync(fullPath)).Should().Equal(content);
    }

    [Fact]
    public async Task DeleteAsync_removes_file()
    {
        var listingId = Guid.NewGuid();
        using var stream = new MemoryStream(new byte[] { 1, 2, 3 });
        var saved = await _storage.SaveAsync(listingId, "x.png", "image/png", stream, CancellationToken.None);
        var fullPath = Path.Combine(_root, saved.RelativePath);
        File.Exists(fullPath).Should().BeTrue();

        await _storage.DeleteAsync(saved.RelativePath, CancellationToken.None);

        File.Exists(fullPath).Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_is_idempotent_when_file_missing()
    {
        var act = async () => await _storage.DeleteAsync("nonexistent/file.jpg", CancellationToken.None);
        await act.Should().NotThrowAsync();
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }
}
```

- [ ] **Step 2: Run — should fail (build errors)**

```bash
cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~LocalFilesystemPhotoStorageTests"
```

Expected: build errors — types not found.

- [ ] **Step 3: Create `PhotoStorageOptions.cs`**

```csharp
namespace Dodostays.Api.Modules.Listings.Storage;

public sealed class PhotoStorageOptions
{
    public string Provider { get; set; } = "Local";
    public string LocalRoot { get; set; } = string.Empty;
    public string PublicBaseUrl { get; set; } = string.Empty;
    public string? R2AccountId { get; set; }
    public string? R2AccessKeyId { get; set; }
    public string? R2SecretAccessKey { get; set; }
    public string? R2Bucket { get; set; }
    public long MaxFileSizeBytes { get; set; } = 8 * 1024 * 1024;
}
```

- [ ] **Step 4: Create `IPhotoStorage.cs`**

```csharp
namespace Dodostays.Api.Modules.Listings.Storage;

public interface IPhotoStorage
{
    Task<PhotoStorageResult> SaveAsync(
        Guid listingId,
        string originalFileName,
        string contentType,
        Stream content,
        CancellationToken ct);

    Task DeleteAsync(string relativePath, CancellationToken ct);

    string BuildPublicUrl(string relativePath);
}

public sealed record PhotoStorageResult(string RelativePath, string PublicUrl, long SizeBytes);
```

- [ ] **Step 5: Create `LocalFilesystemPhotoStorage.cs`**

```csharp
using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Listings.Storage;

public sealed class LocalFilesystemPhotoStorage : IPhotoStorage
{
    private readonly PhotoStorageOptions _options;

    public LocalFilesystemPhotoStorage(IOptions<PhotoStorageOptions> options)
    {
        _options = options.Value;
        if (string.IsNullOrWhiteSpace(_options.LocalRoot))
            throw new InvalidOperationException("PhotoStorage:LocalRoot must be configured for Local provider.");
        if (string.IsNullOrWhiteSpace(_options.PublicBaseUrl))
            throw new InvalidOperationException("PhotoStorage:PublicBaseUrl must be configured.");
        Directory.CreateDirectory(_options.LocalRoot);
    }

    public async Task<PhotoStorageResult> SaveAsync(
        Guid listingId,
        string originalFileName,
        string contentType,
        Stream content,
        CancellationToken ct)
    {
        var ext = Path.GetExtension(originalFileName);
        if (string.IsNullOrEmpty(ext)) ext = ContentTypeToExtension(contentType);
        var fileName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
        var relative = $"{listingId}/{fileName}";
        var fullPath = Path.Combine(_options.LocalRoot, listingId.ToString(), fileName);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var fs = File.Create(fullPath);
        await content.CopyToAsync(fs, ct);
        var size = fs.Length;

        return new PhotoStorageResult(relative.Replace('\\', '/'), BuildPublicUrl(relative), size);
    }

    public Task DeleteAsync(string relativePath, CancellationToken ct)
    {
        var fullPath = Path.Combine(_options.LocalRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public string BuildPublicUrl(string relativePath)
    {
        var trimmed = _options.PublicBaseUrl.TrimEnd('/');
        return $"{trimmed}/{relativePath.TrimStart('/')}";
    }

    private static string ContentTypeToExtension(string contentType) => contentType.ToLowerInvariant() switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        "image/heic" => ".heic",
        _ => ".bin"
    };
}
```

- [ ] **Step 6: Create `R2PhotoStorage.cs`**

```csharp
using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Listings.Storage;

public sealed class R2PhotoStorage : IPhotoStorage
{
    private readonly PhotoStorageOptions _options;

    public R2PhotoStorage(IOptions<PhotoStorageOptions> options)
    {
        _options = options.Value;
        if (string.IsNullOrWhiteSpace(_options.R2AccountId)
            || string.IsNullOrWhiteSpace(_options.R2AccessKeyId)
            || string.IsNullOrWhiteSpace(_options.R2SecretAccessKey)
            || string.IsNullOrWhiteSpace(_options.R2Bucket))
            throw new InvalidOperationException("PhotoStorage R2 settings (AccountId/AccessKeyId/SecretAccessKey/Bucket) are required for R2 provider.");
    }

    public Task<PhotoStorageResult> SaveAsync(Guid listingId, string originalFileName, string contentType, Stream content, CancellationToken ct) =>
        throw new NotImplementedException("R2 photo storage integration is wired but not yet implemented. Use PhotoStorage:Provider=Local until launch readiness work completes.");

    public Task DeleteAsync(string relativePath, CancellationToken ct) =>
        throw new NotImplementedException("R2 photo storage integration is wired but not yet implemented.");

    public string BuildPublicUrl(string relativePath) =>
        throw new NotImplementedException("R2 photo storage integration is wired but not yet implemented.");
}
```

- [ ] **Step 7: Run tests — should pass**

```bash
cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~LocalFilesystemPhotoStorageTests"
```

Expected: 3 passing.

- [ ] **Step 8: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Listings/Storage/ api/tests/Dodostays.Api.Tests/Listings/
git -C C:/temp/Dodostays commit -m "feat(listings): IPhotoStorage abstraction with Local + R2 (skeleton) implementations"
```

---

## Task 2a.5: ListingService + validators

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Services/ListingService.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Validation/CreateListingValidator.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Validation/UpdateListingValidator.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Validation/ListingSearchValidator.cs`
- Test: `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/Listings/CreateListingValidatorTests.cs`

- [ ] **Step 1: Write the failing test**

Create `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/Listings/CreateListingValidatorTests.cs`:

```csharp
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
```

- [ ] **Step 2: Run — should fail (build errors)**

```bash
cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~CreateListingValidator"
```

Expected: build errors.

- [ ] **Step 3: Create `CreateListingValidator.cs`**

```csharp
using FluentValidation;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.Modules.Listings.Validation;

public sealed class CreateListingValidator : AbstractValidator<CreateListingRequest>
{
    public CreateListingValidator()
    {
        RuleFor(r => r.Title).NotEmpty().MaximumLength(200);
        RuleFor(r => r.Description).NotEmpty().MaximumLength(5000);
        RuleFor(r => r.PropertyType).IsInEnum();
        RuleFor(r => r.Region).NotEmpty().MaximumLength(64);
        RuleFor(r => r.AddressLine).NotEmpty().MaximumLength(500);
        RuleFor(r => r.Latitude).InclusiveBetween(-21.0, -19.5)
            .WithMessage("Latitude must be within Mauritius bounds.");
        RuleFor(r => r.Longitude).InclusiveBetween(56.5, 58.0)
            .WithMessage("Longitude must be within Mauritius bounds.");
        RuleFor(r => r.Bedrooms).InclusiveBetween(0, 50);
        RuleFor(r => r.Beds).InclusiveBetween(1, 100);
        RuleFor(r => r.Bathrooms).InclusiveBetween(0, 50);
        RuleFor(r => r.MaxGuests).GreaterThan(0).LessThanOrEqualTo(50);
        RuleFor(r => r.NightlyRateMur).GreaterThan(0m).LessThanOrEqualTo(1_000_000m);
        RuleFor(r => r.CleaningFeeMur).GreaterThanOrEqualTo(0m).LessThanOrEqualTo(1_000_000m);
        RuleFor(r => r.MinStayNights).GreaterThan(0).LessThanOrEqualTo(365);
        RuleFor(r => r.Amenities).NotNull();
        RuleForEach(r => r.Amenities).IsInEnum();
    }
}
```

- [ ] **Step 4: Create `UpdateListingValidator.cs`**

```csharp
using FluentValidation;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.Modules.Listings.Validation;

public sealed class UpdateListingValidator : AbstractValidator<UpdateListingRequest>
{
    public UpdateListingValidator()
    {
        RuleFor(r => r.Title).NotEmpty().MaximumLength(200);
        RuleFor(r => r.Description).NotEmpty().MaximumLength(5000);
        RuleFor(r => r.PropertyType).IsInEnum();
        RuleFor(r => r.Region).NotEmpty().MaximumLength(64);
        RuleFor(r => r.AddressLine).NotEmpty().MaximumLength(500);
        RuleFor(r => r.Latitude).InclusiveBetween(-21.0, -19.5);
        RuleFor(r => r.Longitude).InclusiveBetween(56.5, 58.0);
        RuleFor(r => r.Bedrooms).InclusiveBetween(0, 50);
        RuleFor(r => r.Beds).InclusiveBetween(1, 100);
        RuleFor(r => r.Bathrooms).InclusiveBetween(0, 50);
        RuleFor(r => r.MaxGuests).GreaterThan(0).LessThanOrEqualTo(50);
        RuleFor(r => r.NightlyRateMur).GreaterThan(0m).LessThanOrEqualTo(1_000_000m);
        RuleFor(r => r.CleaningFeeMur).GreaterThanOrEqualTo(0m).LessThanOrEqualTo(1_000_000m);
        RuleFor(r => r.MinStayNights).GreaterThan(0).LessThanOrEqualTo(365);
        RuleFor(r => r.Amenities).NotNull();
        RuleForEach(r => r.Amenities).IsInEnum();
    }
}
```

- [ ] **Step 5: Create `ListingSearchValidator.cs`**

```csharp
using FluentValidation;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.Modules.Listings.Validation;

public sealed class ListingSearchValidator : AbstractValidator<ListingSearchRequest>
{
    public ListingSearchValidator()
    {
        RuleFor(r => r.Page).GreaterThan(0);
        RuleFor(r => r.PageSize).InclusiveBetween(1, 50);
        RuleFor(r => r.MinBedrooms!.Value).GreaterThanOrEqualTo(0).When(r => r.MinBedrooms.HasValue);
        RuleFor(r => r.MinGuests!.Value).GreaterThan(0).When(r => r.MinGuests.HasValue);
        RuleFor(r => r.MaxNightlyMur!.Value).GreaterThan(0m).When(r => r.MaxNightlyMur.HasValue);
        RuleFor(r => r.MinNightlyMur!.Value).GreaterThanOrEqualTo(0m).When(r => r.MinNightlyMur.HasValue);
        RuleFor(r => r.Sort).Must(s => s is "newest" or "price-asc" or "price-desc").WithMessage("Sort must be one of: newest, price-asc, price-desc.");
        RuleFor(r => r.Region).MaximumLength(64);
    }
}
```

- [ ] **Step 6: Create `ListingService.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Listings.Domain;
using Dodostays.Api.Modules.Listings.Storage;

namespace Dodostays.Api.Modules.Listings.Services;

public sealed class ListingService
{
    private readonly DodostaysDbContext _db;
    private readonly IPhotoStorage _storage;
    private static readonly GeometryFactory GeoFactory = new(new PrecisionModel(), 4326);

    public ListingService(DodostaysDbContext db, IPhotoStorage storage)
    {
        _db = db;
        _storage = storage;
    }

    public async Task<ListingDto> CreateAsync(Guid hostUserId, CreateListingRequest req, CancellationToken ct)
    {
        var user = await _db.Users.SingleAsync(u => u.Id == hostUserId, ct);
        if (user.Role != UserRole.Host)
        {
            user.Role = UserRole.Host;
        }

        var listing = new Listing
        {
            HostUserId = hostUserId,
            Title = req.Title.Trim(),
            Description = req.Description.Trim(),
            PropertyType = req.PropertyType,
            Tier = ListingTier.Standard,
            Status = ListingStatus.Draft,
            Region = req.Region.Trim().ToLowerInvariant(),
            AddressLine = req.AddressLine.Trim(),
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            Location = GeoFactory.CreatePoint(new Coordinate(req.Longitude, req.Latitude)),
            Bedrooms = req.Bedrooms,
            Beds = req.Beds,
            Bathrooms = req.Bathrooms,
            MaxGuests = req.MaxGuests,
            NightlyRateMur = req.NightlyRateMur,
            CleaningFeeMur = req.CleaningFeeMur,
            MinStayNights = req.MinStayNights,
            Amenities = req.Amenities.Distinct().ToList()
        };

        _db.Listings.Add(listing);
        await _db.SaveChangesAsync(ct);

        return await ToDtoAsync(listing.Id, ct);
    }

    public async Task<ListingDto> UpdateAsync(Guid hostUserId, Guid listingId, UpdateListingRequest req, CancellationToken ct)
    {
        var listing = await _db.Listings.SingleOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");
        if (listing.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("You do not own this listing.");

        listing.Title = req.Title.Trim();
        listing.Description = req.Description.Trim();
        listing.PropertyType = req.PropertyType;
        listing.Region = req.Region.Trim().ToLowerInvariant();
        listing.AddressLine = req.AddressLine.Trim();
        listing.Latitude = req.Latitude;
        listing.Longitude = req.Longitude;
        listing.Location = GeoFactory.CreatePoint(new Coordinate(req.Longitude, req.Latitude));
        listing.Bedrooms = req.Bedrooms;
        listing.Beds = req.Beds;
        listing.Bathrooms = req.Bathrooms;
        listing.MaxGuests = req.MaxGuests;
        listing.NightlyRateMur = req.NightlyRateMur;
        listing.CleaningFeeMur = req.CleaningFeeMur;
        listing.MinStayNights = req.MinStayNights;
        listing.Amenities = req.Amenities.Distinct().ToList();
        listing.Touch();

        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(listingId, ct);
    }

    public async Task DeleteAsync(Guid hostUserId, Guid listingId, CancellationToken ct)
    {
        var listing = await _db.Listings.Include(l => l.Photos).SingleOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");
        if (listing.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("You do not own this listing.");

        foreach (var photo in listing.Photos)
        {
            await _storage.DeleteAsync(photo.StoragePath, ct);
        }
        _db.Listings.Remove(listing);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ListingDto> PublishAsync(Guid hostUserId, Guid listingId, CancellationToken ct)
    {
        var listing = await _db.Listings.SingleOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");
        if (listing.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("You do not own this listing.");
        listing.Publish();
        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(listingId, ct);
    }

    public async Task<ListingDto> UnpublishAsync(Guid hostUserId, Guid listingId, CancellationToken ct)
    {
        var listing = await _db.Listings.SingleOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");
        if (listing.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("You do not own this listing.");
        listing.Unpublish();
        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(listingId, ct);
    }

    public async Task<ListingDto?> GetAsync(Guid listingId, bool includeUnpublished, CancellationToken ct)
    {
        var listing = await _db.Listings
            .Include(l => l.Photos.OrderBy(p => p.SortOrder))
            .AsNoTracking()
            .SingleOrDefaultAsync(l => l.Id == listingId, ct);
        if (listing is null) return null;
        if (!includeUnpublished && listing.Status != ListingStatus.Published) return null;
        return await ToDtoFromEntityAsync(listing, ct);
    }

    public async Task<IReadOnlyList<ListingDto>> GetMineAsync(Guid hostUserId, CancellationToken ct)
    {
        var listings = await _db.Listings
            .Include(l => l.Photos.OrderBy(p => p.SortOrder))
            .Where(l => l.HostUserId == hostUserId)
            .OrderByDescending(l => l.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);
        var hostName = await _db.Users.Where(u => u.Id == hostUserId).Select(u => u.DisplayName).SingleAsync(ct);
        return listings.Select(l => MapToDto(l, hostName)).ToList();
    }

    private async Task<ListingDto> ToDtoAsync(Guid id, CancellationToken ct)
    {
        var listing = await _db.Listings
            .Include(l => l.Photos.OrderBy(p => p.SortOrder))
            .AsNoTracking()
            .SingleAsync(l => l.Id == id, ct);
        return await ToDtoFromEntityAsync(listing, ct);
    }

    private async Task<ListingDto> ToDtoFromEntityAsync(Listing listing, CancellationToken ct)
    {
        var hostName = await _db.Users.Where(u => u.Id == listing.HostUserId).Select(u => u.DisplayName).SingleAsync(ct);
        return MapToDto(listing, hostName);
    }

    public static ListingDto MapToDto(Listing listing, string hostName)
    {
        var photos = listing.Photos
            .OrderBy(p => p.SortOrder)
            .Select(p => new ListingPhotoDto(p.Id, p.PublicUrl, p.Caption, p.SortOrder))
            .ToList();
        return new ListingDto(
            listing.Id,
            listing.HostUserId,
            hostName,
            listing.Title,
            listing.Description,
            listing.PropertyType,
            listing.Tier,
            listing.Status,
            listing.Region,
            listing.AddressLine,
            listing.Latitude,
            listing.Longitude,
            listing.Bedrooms,
            listing.Beds,
            listing.Bathrooms,
            listing.MaxGuests,
            listing.NightlyRateMur,
            listing.CleaningFeeMur,
            listing.MinStayNights,
            listing.Amenities.AsReadOnly(),
            photos,
            listing.CreatedAt,
            listing.PublishedAt);
    }
}
```

- [ ] **Step 7: Run unit tests — should pass**

```bash
cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~CreateListingValidator"
```

Expected: 7 passing.

- [ ] **Step 8: Build full**

```bash
dotnet build
```

Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Listings/ api/tests/Dodostays.Api.Tests/Listings/
git -C C:/temp/Dodostays commit -m "feat(listings): ListingService + validators with unit tests"
```

---

## Task 2a.6: ListingSearchService

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Services/ListingSearchService.cs`
- Test: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Listings/ListingSearchFlowTests.cs`

(Skipping pure unit tests for the search service because it heavily depends on EF query translation; we go straight to integration tests against real Postgres.)

- [ ] **Step 1: Create `ListingSearchService.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Listings.Services;

public sealed class ListingSearchService
{
    private readonly DodostaysDbContext _db;

    public ListingSearchService(DodostaysDbContext db) => _db = db;

    public async Task<ListingSearchResponse> SearchAsync(ListingSearchRequest request, CancellationToken ct)
    {
        var pageSize = Math.Clamp(request.PageSize, 1, 50);
        var page = Math.Max(1, request.Page);

        var query = _db.Listings
            .Include(l => l.Photos)
            .AsNoTracking()
            .Where(l => l.Status == ListingStatus.Published);

        if (!string.IsNullOrWhiteSpace(request.Region))
        {
            var slug = request.Region.Trim().ToLowerInvariant();
            query = query.Where(l => l.Region == slug);
        }
        if (request.PropertyType.HasValue)
            query = query.Where(l => l.PropertyType == request.PropertyType.Value);
        if (request.MinBedrooms.HasValue)
            query = query.Where(l => l.Bedrooms >= request.MinBedrooms.Value);
        if (request.MinGuests.HasValue)
            query = query.Where(l => l.MaxGuests >= request.MinGuests.Value);
        if (request.MaxNightlyMur.HasValue)
            query = query.Where(l => l.NightlyRateMur <= request.MaxNightlyMur.Value);
        if (request.MinNightlyMur.HasValue)
            query = query.Where(l => l.NightlyRateMur >= request.MinNightlyMur.Value);
        if (request.VerifiedOnly)
            query = query.Where(l => l.Tier == ListingTier.Verified);
        if (request.RequiredAmenities is { Count: > 0 })
        {
            foreach (var amenity in request.RequiredAmenities)
            {
                var a = amenity;
                query = query.Where(l => l.Amenities.Contains(a));
            }
        }

        query = request.Sort switch
        {
            "price-asc" => query.OrderBy(l => l.NightlyRateMur),
            "price-desc" => query.OrderByDescending(l => l.NightlyRateMur),
            _ => query.OrderByDescending(l => l.CreatedAt)
        };

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new ListingSummaryDto(
                l.Id,
                l.Title,
                l.PropertyType,
                l.Tier,
                l.Region,
                l.Bedrooms,
                l.Beds,
                l.MaxGuests,
                l.NightlyRateMur,
                l.Photos.OrderBy(p => p.SortOrder).Select(p => p.PublicUrl).FirstOrDefault(),
                l.CreatedAt))
            .ToListAsync(ct);

        var totalPages = (int)Math.Ceiling(total / (double)pageSize);
        return new ListingSearchResponse(items, page, pageSize, total, Math.Max(1, totalPages));
    }
}
```

- [ ] **Step 2: Build**

```bash
cd C:/temp/Dodostays/api && dotnet build
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Listings/Services/
git -C C:/temp/Dodostays commit -m "feat(listings): ListingSearchService with EF-based filtering and paging"
```

---

## Task 2a.7: Listing CRUD endpoints + ListingsModule wiring

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Endpoints/CreateListingEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Endpoints/UpdateListingEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Endpoints/DeleteListingEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Endpoints/PublishListingEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Endpoints/UnpublishListingEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Endpoints/GetListingEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Endpoints/GetMyListingsEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Endpoints/SearchListingsEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/ListingsModule.cs`
- Modify: `C:/temp/Dodostays/api/src/Dodostays.Api/Program.cs` (call AddListingsModule + MapListingsEndpoints + UseStaticFiles + photo storage init)
- Modify: `appsettings.Development.json`, `appsettings.json` (add `PhotoStorage` section)

- [ ] **Step 1: Create `CreateListingEndpoint.cs`**

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class CreateListingEndpoint
{
    public static RouteHandlerBuilder MapCreateListing(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/listings", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        [FromBody] CreateListingRequest request,
        IValidator<CreateListingRequest> validator,
        IUserContext userContext,
        ListingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var dto = await service.CreateAsync(user.Id, request, ct);
        return Results.Created($"/api/listings/{dto.Id}", dto);
    }
}
```

- [ ] **Step 2: Create `UpdateListingEndpoint.cs`**

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class UpdateListingEndpoint
{
    public static RouteHandlerBuilder MapUpdateListing(this IEndpointRouteBuilder app)
    {
        return app.MapPut("/api/listings/{id:guid}", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        [FromBody] UpdateListingRequest request,
        IValidator<UpdateListingRequest> validator,
        IUserContext userContext,
        ListingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        try
        {
            var dto = await service.UpdateAsync(user.Id, id, request, ct);
            return Results.Ok(dto);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
    }
}
```

- [ ] **Step 3: Create `DeleteListingEndpoint.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class DeleteListingEndpoint
{
    public static RouteHandlerBuilder MapDeleteListing(this IEndpointRouteBuilder app)
    {
        return app.MapDelete("/api/listings/{id:guid}", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        ListingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            await service.DeleteAsync(user.Id, id, ct);
            return Results.NoContent();
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
    }
}
```

- [ ] **Step 4: Create `PublishListingEndpoint.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class PublishListingEndpoint
{
    public static RouteHandlerBuilder MapPublishListing(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/listings/{id:guid}/publish", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        ListingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            var dto = await service.PublishAsync(user.Id, id, ct);
            return Results.Ok(dto);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
    }
}
```

- [ ] **Step 5: Create `UnpublishListingEndpoint.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class UnpublishListingEndpoint
{
    public static RouteHandlerBuilder MapUnpublishListing(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/listings/{id:guid}/unpublish", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        ListingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            var dto = await service.UnpublishAsync(user.Id, id, ct);
            return Results.Ok(dto);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
    }
}
```

- [ ] **Step 6: Create `GetListingEndpoint.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class GetListingEndpoint
{
    public static RouteHandlerBuilder MapGetListing(this IEndpointRouteBuilder app)
    {
        return app.MapGet("/api/listings/{id:guid}", HandleAsync).AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        ListingService service,
        CancellationToken ct)
    {
        // Hosts can preview their own draft listings
        var currentUser = await userContext.GetCurrentUserAsync(ct);
        var includeUnpublished = currentUser is not null;
        var dto = await service.GetAsync(id, includeUnpublished: false, ct);
        if (dto is null && currentUser is not null)
        {
            // try again allowing unpublished, but only return if owner
            dto = await service.GetAsync(id, includeUnpublished: true, ct);
            if (dto is not null && dto.HostUserId != currentUser.Id) dto = null;
        }
        return dto is null ? Results.NotFound() : Results.Ok(dto);
    }
}
```

- [ ] **Step 7: Create `GetMyListingsEndpoint.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class GetMyListingsEndpoint
{
    public static RouteHandlerBuilder MapGetMyListings(this IEndpointRouteBuilder app)
    {
        return app.MapGet("/api/listings/mine", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        IUserContext userContext,
        ListingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var items = await service.GetMineAsync(user.Id, ct);
        return Results.Ok(items);
    }
}
```

- [ ] **Step 8: Create `SearchListingsEndpoint.cs`**

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class SearchListingsEndpoint
{
    public static RouteHandlerBuilder MapSearchListings(this IEndpointRouteBuilder app)
    {
        return app.MapGet("/api/listings", HandleAsync).AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        [AsParameters] ListingSearchQueryParameters query,
        IValidator<ListingSearchRequest> validator,
        ListingSearchService service,
        CancellationToken ct)
    {
        var amenities = ParseAmenities(query.Amenities);
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
            PageSize: query.PageSize ?? 20);

        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var result = await service.SearchAsync(request, ct);
        return Results.Ok(result);
    }

    private static IReadOnlyList<Amenity>? ParseAmenities(string? csv)
    {
        if (string.IsNullOrWhiteSpace(csv)) return null;
        var parsed = new List<Amenity>();
        foreach (var token in csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (Enum.TryParse<Amenity>(token, ignoreCase: true, out var a)) parsed.Add(a);
        }
        return parsed.Count == 0 ? null : parsed;
    }

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
        int? PageSize);
}
```

- [ ] **Step 9: Create `ListingsModule.cs`**

```csharp
using FluentValidation;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Endpoints;
using Dodostays.Api.Modules.Listings.Services;
using Dodostays.Api.Modules.Listings.Storage;
using Dodostays.Api.Modules.Listings.Validation;

namespace Dodostays.Api.Modules.Listings;

public static class ListingsModule
{
    public static IServiceCollection AddListingsModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<PhotoStorageOptions>(configuration.GetSection("PhotoStorage"));
        var provider = configuration["PhotoStorage:Provider"] ?? "Local";
        if (string.Equals(provider, "R2", StringComparison.OrdinalIgnoreCase))
            services.AddSingleton<IPhotoStorage, R2PhotoStorage>();
        else
            services.AddSingleton<IPhotoStorage, LocalFilesystemPhotoStorage>();

        services.AddScoped<ListingService>();
        services.AddScoped<ListingSearchService>();

        services.AddScoped<IValidator<CreateListingRequest>, CreateListingValidator>();
        services.AddScoped<IValidator<UpdateListingRequest>, UpdateListingValidator>();
        services.AddScoped<IValidator<ListingSearchRequest>, ListingSearchValidator>();

        return services;
    }

    public static IEndpointRouteBuilder MapListingsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapCreateListing();
        app.MapUpdateListing();
        app.MapDeleteListing();
        app.MapPublishListing();
        app.MapUnpublishListing();
        app.MapGetMyListings();      // must be BEFORE GetListing to avoid /mine clashing with /{id:guid}
        app.MapGetListing();
        app.MapSearchListings();
        return app;
    }
}
```

- [ ] **Step 10: Modify `Program.cs`**

Read the current `Program.cs`. Add (in this exact order):

**10a.** Add `using Dodostays.Api.Modules.Listings;` near the top alongside the other module usings.

**10b.** After `builder.Services.AddIdentityModule(builder.Configuration);`, add:

```csharp
builder.Services.AddListingsModule(builder.Configuration);
```

**10c.** Just BEFORE `app.UseSerilogRequestLogging();`, configure static files for photos. Add:

```csharp
var photosPath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "photos");
Directory.CreateDirectory(photosPath);
app.UseStaticFiles();
```

(Where `builder` is the `WebApplicationBuilder` and `app` is the `WebApplication` — the order in the file should be: build builder, register services, `var app = builder.Build();`, then ensure photosPath, then `app.UseStaticFiles();`, then the rest of the middleware. Static files must be registered BEFORE auth so `/photos/...` is served without auth.)

**10d.** After `app.MapIdentityEndpoints();`, add:

```csharp
app.MapListingsEndpoints();
```

The final structure:
```csharp
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

var photosPath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "photos");
Directory.CreateDirectory(photosPath);
app.UseStaticFiles();

app.UseSerilogRequestLogging();
app.UseDodostaysProblemDetails();
app.UseCors(CorsPolicyName);
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthCheckEndpoints();
app.MapIdentityEndpoints();
app.MapListingsEndpoints();

app.Run();
```

- [ ] **Step 11: Modify `appsettings.Development.json`**

Add a new top-level section alongside `Cors` etc.:

```json
"PhotoStorage": {
  "Provider": "Local",
  "LocalRoot": "wwwroot/photos",
  "PublicBaseUrl": "http://localhost:5080/photos",
  "MaxFileSizeBytes": 8388608
}
```

- [ ] **Step 12: Modify `appsettings.json`**

Add:

```json
"PhotoStorage": {
  "Provider": "Local",
  "LocalRoot": "wwwroot/photos",
  "PublicBaseUrl": "/photos",
  "MaxFileSizeBytes": 8388608
}
```

- [ ] **Step 13: Create `wwwroot/photos/.gitkeep`**

```bash
mkdir -p C:/temp/Dodostays/api/src/Dodostays.Api/wwwroot/photos
touch C:/temp/Dodostays/api/src/Dodostays.Api/wwwroot/photos/.gitkeep
```

Make sure `.gitignore` is NOT excluding `wwwroot/photos/.gitkeep`. Add to `api/src/Dodostays.Api/.gitignore` (create if missing):

```
wwwroot/photos/*
!wwwroot/photos/.gitkeep
```

- [ ] **Step 14: Build**

```bash
cd C:/temp/Dodostays/api && dotnet build
```

Expected: 0 errors. Kill `Dodostays.Api.exe` if locked.

- [ ] **Step 15: Smoke check**

Start API:
```bash
cd C:/temp/Dodostays/api && dotnet run --project src/Dodostays.Api > /tmp/api.log 2>&1 &
sleep 8
curl -s http://localhost:5080/health/ready
curl -s "http://localhost:5080/api/listings"
```

Expected:
- `/health/ready` → `{"status":"ready","database":"ok"}`
- `/api/listings` → `{"items":[],"page":1,"pageSize":20,"totalCount":0,"totalPages":1}` (empty result, but valid response shape)

Stop API: `taskkill //F //IM Dodostays.Api.exe` (or pkill).

- [ ] **Step 16: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "feat(listings): CRUD/publish/search endpoints + ListingsModule wiring + static file serving"
```

---

## Task 2a.8: Photo upload + delete endpoints

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Endpoints/UploadPhotoEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Listings/Endpoints/DeletePhotoEndpoint.cs`
- Modify: `ListingsModule.cs` (register the two new endpoint extension methods)

- [ ] **Step 1: Create `UploadPhotoEndpoint.cs`**

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Listings.Domain;
using Dodostays.Api.Modules.Listings.Storage;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class UploadPhotoEndpoint
{
    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/heic"
    };

    public static RouteHandlerBuilder MapUploadPhoto(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/listings/{id:guid}/photos", HandleAsync)
                  .RequireAuthorization()
                  .DisableAntiforgery();
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        IFormFile file,
        [FromForm] string? caption,
        IUserContext userContext,
        DodostaysDbContext db,
        IPhotoStorage storage,
        IOptions<PhotoStorageOptions> opts,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var listing = await db.Listings.SingleOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null) return Results.NotFound();
        if (listing.HostUserId != user.Id) return Results.Forbid();

        if (file.Length == 0) return Results.Problem(statusCode: StatusCodes.Status400BadRequest, title: "Empty file.");
        if (file.Length > opts.Value.MaxFileSizeBytes)
            return Results.Problem(statusCode: StatusCodes.Status413PayloadTooLarge, title: "File too large.");
        if (!AllowedTypes.Contains(file.ContentType ?? string.Empty))
            return Results.Problem(statusCode: StatusCodes.Status415UnsupportedMediaType, title: "Unsupported image type.");

        await using var stream = file.OpenReadStream();
        var stored = await storage.SaveAsync(id, file.FileName, file.ContentType, stream, ct);

        var maxOrder = await db.ListingPhotos.Where(p => p.ListingId == id).MaxAsync(p => (int?)p.SortOrder, ct) ?? -1;
        var photo = new ListingPhoto
        {
            ListingId = id,
            StoragePath = stored.RelativePath,
            PublicUrl = stored.PublicUrl,
            Caption = caption,
            SortOrder = maxOrder + 1,
            SizeBytes = stored.SizeBytes,
            ContentType = file.ContentType
        };
        db.ListingPhotos.Add(photo);
        listing.Touch();
        await db.SaveChangesAsync(ct);

        var dto = new ListingPhotoDto(photo.Id, photo.PublicUrl, photo.Caption, photo.SortOrder);
        return Results.Created($"/api/listings/{id}/photos/{photo.Id}", dto);
    }
}
```

- [ ] **Step 2: Create `DeletePhotoEndpoint.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Listings.Storage;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class DeletePhotoEndpoint
{
    public static RouteHandlerBuilder MapDeletePhoto(this IEndpointRouteBuilder app)
    {
        return app.MapDelete("/api/listings/{id:guid}/photos/{photoId:guid}", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        Guid photoId,
        IUserContext userContext,
        DodostaysDbContext db,
        IPhotoStorage storage,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var listing = await db.Listings.SingleOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null) return Results.NotFound();
        if (listing.HostUserId != user.Id) return Results.Forbid();

        var photo = await db.ListingPhotos.SingleOrDefaultAsync(p => p.Id == photoId && p.ListingId == id, ct);
        if (photo is null) return Results.NotFound();

        await storage.DeleteAsync(photo.StoragePath, ct);
        db.ListingPhotos.Remove(photo);
        listing.Touch();
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }
}
```

- [ ] **Step 3: Modify `ListingsModule.cs`**

In `MapListingsEndpoints`, BEFORE `app.MapGetListing();` (so `/photos/...` is matched as a sub-path of `/{id:guid}` after the more-specific routes), add:

```csharp
app.MapUploadPhoto();
app.MapDeletePhoto();
```

The final order of MapListingsEndpoints should be:

```csharp
public static IEndpointRouteBuilder MapListingsEndpoints(this IEndpointRouteBuilder app)
{
    app.MapCreateListing();
    app.MapUpdateListing();
    app.MapDeleteListing();
    app.MapPublishListing();
    app.MapUnpublishListing();
    app.MapUploadPhoto();
    app.MapDeletePhoto();
    app.MapGetMyListings();
    app.MapGetListing();
    app.MapSearchListings();
    return app;
}
```

- [ ] **Step 4: Build**

```bash
cd C:/temp/Dodostays/api && dotnet build
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "feat(listings): photo upload and delete endpoints (multipart)"
```

---

## Task 2a.9: Integration tests for listings + photos

**Files:**
- Create: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Listings/ListingCrudFlowTests.cs`
- Create: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Listings/ListingSearchFlowTests.cs`
- Create: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Listings/ListingPhotoFlowTests.cs`
- Create: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Listings/ListingPublishFlowTests.cs`
- Create: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Listings/ListingTestHelpers.cs`

- [ ] **Step 1: Create `ListingTestHelpers.cs`**

```csharp
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
```

- [ ] **Step 2: Create `ListingCrudFlowTests.cs`**

```csharp
using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.IntegrationTests.Listings;

public class ListingCrudFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public ListingCrudFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Host_can_create_update_delete_listing()
    {
        using var factory = _fx.CreateFactory();
        var (client, auth) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        var create = await client.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();
        dto!.HostUserId.Should().Be(auth.User.Id);
        dto.Status.Should().Be(ListingStatus.Draft);
        dto.Region.Should().Be("flic-en-flac");

        var update = await client.PutAsJsonAsync($"/api/listings/{dto.Id}",
            ListingTestHelpers.SampleListing() with { Title = "Updated villa" });
        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await update.Content.ReadFromJsonAsync<ListingDto>();
        updated!.Title.Should().Be("Updated villa");

        var del = await client.DeleteAsync($"/api/listings/{dto.Id}");
        del.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var get = await client.GetAsync($"/api/listings/{dto.Id}");
        get.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Host_cannot_update_someone_elses_listing()
    {
        using var factory = _fx.CreateFactory();
        var (host1Client, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host1Client.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();

        var (host2Client, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var attempt = await host2Client.PutAsJsonAsync($"/api/listings/{dto!.Id}", ListingTestHelpers.SampleListing());

        attempt.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Anonymous_user_cannot_create_listing()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var res = await client.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMine_returns_only_host_listings()
    {
        using var factory = _fx.CreateFactory();
        var (host1Client, host1Auth) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        await host1Client.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing() with { Title = "Host1 villa" });

        var (host2Client, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        await host2Client.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing() with { Title = "Host2 villa" });

        var mine1 = await host1Client.GetAsync("/api/listings/mine");
        var items1 = await mine1.Content.ReadFromJsonAsync<List<ListingDto>>();
        items1.Should().HaveCount(1);
        items1![0].Title.Should().Be("Host1 villa");
        items1[0].HostUserId.Should().Be(host1Auth.User.Id);
    }
}
```

- [ ] **Step 3: Create `ListingPublishFlowTests.cs`**

```csharp
using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.IntegrationTests.Listings;

public class ListingPublishFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public ListingPublishFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Draft_listing_is_invisible_to_anonymous_get()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();

        var anon = factory.CreateClient();
        var res = await anon.GetAsync($"/api/listings/{dto!.Id}");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Published_listing_is_visible_to_anonymous_get()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();
        var pub = await host.PostAsync($"/api/listings/{dto!.Id}/publish", null);
        pub.StatusCode.Should().Be(HttpStatusCode.OK);

        var anon = factory.CreateClient();
        var res = await anon.GetAsync($"/api/listings/{dto.Id}");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await res.Content.ReadFromJsonAsync<ListingDto>();
        fetched!.Status.Should().Be(ListingStatus.Published);
    }

    [Fact]
    public async Task Host_can_unpublish()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{dto!.Id}/publish", null);

        var unpub = await host.PostAsync($"/api/listings/{dto.Id}/unpublish", null);

        unpub.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await unpub.Content.ReadFromJsonAsync<ListingDto>();
        fetched!.Status.Should().Be(ListingStatus.Draft);
    }
}
```

- [ ] **Step 4: Create `ListingSearchFlowTests.cs`**

```csharp
using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.IntegrationTests.Listings;

public class ListingSearchFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public ListingSearchFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Search_returns_only_published_listings_filtered_by_region()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        // Three listings: 2 in flic-en-flac (1 published, 1 draft), 1 in grand-baie (published)
        var fefDraft = await host.PostAsJsonAsync("/api/listings",
            ListingTestHelpers.SampleListing("flic-en-flac") with { Title = "FEF Draft" });
        var fefPub = await host.PostAsJsonAsync("/api/listings",
            ListingTestHelpers.SampleListing("flic-en-flac") with { Title = "FEF Published" });
        var fefPubDto = await fefPub.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{fefPubDto!.Id}/publish", null);

        var gb = await host.PostAsJsonAsync("/api/listings",
            ListingTestHelpers.SampleListing("grand-baie") with { Title = "GB Published" });
        var gbDto = await gb.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{gbDto!.Id}/publish", null);

        var anon = factory.CreateClient();
        var res = await anon.GetAsync("/api/listings?region=flic-en-flac");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var search = await res.Content.ReadFromJsonAsync<ListingSearchResponse>();
        search!.Items.Should().ContainSingle(i => i.Title == "FEF Published");
        search.Items.Should().NotContain(i => i.Title == "FEF Draft");
        search.Items.Should().NotContain(i => i.Title == "GB Published");
    }

    [Fact]
    public async Task Search_filters_by_amenity_and_max_price()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        var pool = await host.PostAsJsonAsync("/api/listings",
            ListingTestHelpers.SampleListing() with
            {
                Title = "PoolVilla",
                Amenities = new[] { Amenity.Pool, Amenity.Wifi },
                NightlyRateMur = 4000m
            });
        var poolDto = await pool.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{poolDto!.Id}/publish", null);

        var noPool = await host.PostAsJsonAsync("/api/listings",
            ListingTestHelpers.SampleListing() with
            {
                Title = "NoPool",
                Amenities = new[] { Amenity.Wifi },
                NightlyRateMur = 3000m
            });
        var npDto = await noPool.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{npDto!.Id}/publish", null);

        var anon = factory.CreateClient();
        var res = await anon.GetAsync("/api/listings?amenities=Pool&maxNightlyMur=5000");
        var search = await res.Content.ReadFromJsonAsync<ListingSearchResponse>();
        search!.Items.Should().ContainSingle(i => i.Title == "PoolVilla");
        search.Items.Should().NotContain(i => i.Title == "NoPool");
    }

    [Fact]
    public async Task Search_pagination_returns_correct_metadata()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        for (var i = 0; i < 3; i++)
        {
            var c = await host.PostAsJsonAsync("/api/listings",
                ListingTestHelpers.SampleListing() with { Title = $"Listing {i}" });
            var d = await c.Content.ReadFromJsonAsync<ListingDto>();
            await host.PostAsync($"/api/listings/{d!.Id}/publish", null);
        }

        var anon = factory.CreateClient();
        var res = await anon.GetAsync("/api/listings?pageSize=2&page=1");
        var search = await res.Content.ReadFromJsonAsync<ListingSearchResponse>();
        search!.Items.Count.Should().Be(2);
        search.TotalCount.Should().BeGreaterThanOrEqualTo(3);
        search.TotalPages.Should().BeGreaterThanOrEqualTo(2);
    }
}
```

- [ ] **Step 5: Create `ListingPhotoFlowTests.cs`**

```csharp
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.IntegrationTests.Listings;

public class ListingPhotoFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public ListingPhotoFlowTests(PostgresFixture fx) => _fx = fx;

    private static byte[] FakeJpegBytes()
    {
        // Minimal JPEG header bytes — not a valid image, but sufficient for upload acceptance.
        return new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, (byte)'J', (byte)'F', (byte)'I', (byte)'F', 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9 };
    }

    [Fact]
    public async Task Host_can_upload_and_delete_photo()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();

        using var content = new MultipartFormDataContent();
        var bytes = FakeJpegBytes();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "test.jpg");
        content.Add(new StringContent("Front view"), "caption");

        var upload = await host.PostAsync($"/api/listings/{dto!.Id}/photos", content);
        upload.StatusCode.Should().Be(HttpStatusCode.Created);
        var photo = await upload.Content.ReadFromJsonAsync<ListingPhotoDto>();
        photo!.PublicUrl.Should().StartWith("http://");
        photo.Caption.Should().Be("Front view");

        var get = await host.GetAsync($"/api/listings/{dto.Id}");
        var fetched = await get.Content.ReadFromJsonAsync<ListingDto>();
        fetched!.Photos.Should().ContainSingle(p => p.Id == photo.Id);

        var del = await host.DeleteAsync($"/api/listings/{dto.Id}/photos/{photo.Id}");
        del.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var get2 = await host.GetAsync($"/api/listings/{dto.Id}");
        var fetched2 = await get2.Content.ReadFromJsonAsync<ListingDto>();
        fetched2!.Photos.Should().BeEmpty();
    }

    [Fact]
    public async Task Upload_rejects_unsupported_content_type()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 1, 2, 3 });
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
        content.Add(fileContent, "file", "test.txt");

        var upload = await host.PostAsync($"/api/listings/{dto!.Id}/photos", content);
        upload.StatusCode.Should().Be(HttpStatusCode.UnsupportedMediaType);
    }
}
```

- [ ] **Step 6: Run integration tests**

```bash
cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.IntegrationTests/Dodostays.Api.IntegrationTests.csproj --filter "FullyQualifiedName~Listings"
```

Expected: 11 passing (4 CRUD + 3 Publish + 3 Search + 2 Photo).

If integration tests fail because `IPhotoStorage` requires `LocalRoot`/`PublicBaseUrl` not set in PostgresFixture — modify `PostgresFixture.cs` to add:

```csharp
builder.UseSetting("PhotoStorage:Provider", "Local");
builder.UseSetting("PhotoStorage:LocalRoot", Path.Combine(Path.GetTempPath(), $"ds-photos-{Guid.NewGuid():N}"));
builder.UseSetting("PhotoStorage:PublicBaseUrl", "http://localhost:0/photos");
builder.UseSetting("PhotoStorage:MaxFileSizeBytes", "8388608");
```

(Place inside `CreateFactory().WithWebHostBuilder(builder => { ... })`. The temp folder will be created on first save and isn't cleaned up — acceptable for test isolation.)

- [ ] **Step 7: Run ALL tests for sanity**

```bash
dotnet test
```

Expected: ~50+ passing total (Plan 01's 30 + new Listings tests).

- [ ] **Step 8: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "test(listings): integration tests for CRUD, publish, search, and photo upload"
```

---

## Task 2a.10: Frontend listings client + host dashboard pages

**Files:**
- Create: `C:/temp/Dodostays/web/src/lib/listings.ts`
- Create: `C:/temp/Dodostays/web/src/app/host/listings/page.tsx`
- Create: `C:/temp/Dodostays/web/src/app/host/listings/new/page.tsx`
- Create: `C:/temp/Dodostays/web/src/app/host/listings/[id]/edit/page.tsx`
- Create: `C:/temp/Dodostays/web/src/app/host/listings/listing-form.tsx` (shared form component)
- Modify: `C:/temp/Dodostays/web/src/app/account/page.tsx` (add link to /host/listings if user is Host)

- [ ] **Step 1: Create `web/src/lib/listings.ts`**

```ts
import { apiFetch, buildApiUrl } from "./api-client";

export type PropertyType = "Villa" | "Apartment" | "Guesthouse";
export type ListingTier = "Standard" | "Verified";
export type ListingStatus = "Draft" | "Published" | "Suspended" | "Archived";
export type Amenity =
  | "Pool" | "BeachAccess" | "AirCon" | "Wifi" | "Kitchen" | "Parking"
  | "Tv" | "WashingMachine" | "Balcony" | "Garden" | "Bbq" | "Generator";

export interface ListingPhoto {
  id: string;
  publicUrl: string;
  caption: string | null;
  sortOrder: number;
}

export interface Listing {
  id: string;
  hostUserId: string;
  hostDisplayName: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  tier: ListingTier;
  status: ListingStatus;
  region: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maxGuests: number;
  nightlyRateMur: number;
  cleaningFeeMur: number;
  minStayNights: number;
  amenities: Amenity[];
  photos: ListingPhoto[];
  createdAt: string;
  publishedAt: string | null;
}

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
}

export interface ListingSearchResponse {
  items: ListingSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface CreateOrUpdateListingInput {
  title: string;
  description: string;
  propertyType: PropertyType;
  region: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maxGuests: number;
  nightlyRateMur: number;
  cleaningFeeMur: number;
  minStayNights: number;
  amenities: Amenity[];
}

export async function searchListings(params: URLSearchParams | Record<string, string | undefined>): Promise<ListingSearchResponse> {
  const search = params instanceof URLSearchParams ? params : toSearchParams(params);
  return apiFetch<ListingSearchResponse>(`/api/listings?${search.toString()}`);
}

export async function getListing(id: string): Promise<Listing> {
  return apiFetch<Listing>(`/api/listings/${id}`);
}

export async function getMyListings(accessToken: string): Promise<Listing[]> {
  const res = await fetch(buildApiUrl("/api/listings/mine"), {
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Listing[]>;
}

export async function createListing(accessToken: string, input: CreateOrUpdateListingInput): Promise<Listing> {
  const res = await fetch(buildApiUrl("/api/listings"), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Listing>;
}

export async function updateListing(accessToken: string, id: string, input: CreateOrUpdateListingInput): Promise<Listing> {
  const res = await fetch(buildApiUrl(`/api/listings/${id}`), {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Listing>;
}

export async function deleteListing(accessToken: string, id: string): Promise<void> {
  const res = await fetch(buildApiUrl(`/api/listings/${id}`), {
    method: "DELETE",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
}

export async function publishListing(accessToken: string, id: string): Promise<Listing> {
  const res = await fetch(buildApiUrl(`/api/listings/${id}/publish`), {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Listing>;
}

export async function unpublishListing(accessToken: string, id: string): Promise<Listing> {
  const res = await fetch(buildApiUrl(`/api/listings/${id}/unpublish`), {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Listing>;
}

export async function uploadPhoto(accessToken: string, listingId: string, file: File, caption?: string): Promise<ListingPhoto> {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);
  const res = await fetch(buildApiUrl(`/api/listings/${listingId}/photos`), {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<ListingPhoto>;
}

export async function deletePhoto(accessToken: string, listingId: string, photoId: string): Promise<void> {
  const res = await fetch(buildApiUrl(`/api/listings/${listingId}/photos/${photoId}`), {
    method: "DELETE",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
}

export const REGIONS = [
  { slug: "grand-baie", label: "Grand Baie" },
  { slug: "flic-en-flac", label: "Flic en Flac" },
  { slug: "tamarin", label: "Tamarin" },
  { slug: "trou-aux-biches", label: "Trou aux Biches" },
  { slug: "pereybere", label: "Pereybere" },
  { slug: "belle-mare", label: "Belle Mare" },
  { slug: "le-morne", label: "Le Morne" },
  { slug: "blue-bay", label: "Blue Bay" },
  { slug: "albion", label: "Albion" },
];

export const AMENITY_OPTIONS: { value: Amenity; label: string }[] = [
  { value: "Pool", label: "Pool" },
  { value: "BeachAccess", label: "Beach access" },
  { value: "AirCon", label: "Air conditioning" },
  { value: "Wifi", label: "Wi-Fi" },
  { value: "Kitchen", label: "Kitchen" },
  { value: "Parking", label: "Parking" },
  { value: "Tv", label: "TV" },
  { value: "WashingMachine", label: "Washing machine" },
  { value: "Balcony", label: "Balcony" },
  { value: "Garden", label: "Garden" },
  { value: "Bbq", label: "BBQ" },
  { value: "Generator", label: "Generator" },
];

function toSearchParams(input: Record<string, string | undefined>): URLSearchParams {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== "") out.set(k, v);
  }
  return out;
}
```

- [ ] **Step 2: Create `web/src/app/host/listings/listing-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { AMENITY_OPTIONS, REGIONS, type Amenity, type CreateOrUpdateListingInput, type PropertyType } from "@/lib/listings";

interface Props {
  initial?: Partial<CreateOrUpdateListingInput>;
  submitLabel: string;
  onSubmit: (input: CreateOrUpdateListingInput) => Promise<void>;
}

export function ListingForm({ initial, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [propertyType, setPropertyType] = useState<PropertyType>(initial?.propertyType ?? "Villa");
  const [region, setRegion] = useState(initial?.region ?? "flic-en-flac");
  const [addressLine, setAddressLine] = useState(initial?.addressLine ?? "");
  const [latitude, setLatitude] = useState(initial?.latitude ?? -20.27);
  const [longitude, setLongitude] = useState(initial?.longitude ?? 57.36);
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms ?? 1);
  const [beds, setBeds] = useState(initial?.beds ?? 1);
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms ?? 1);
  const [maxGuests, setMaxGuests] = useState(initial?.maxGuests ?? 2);
  const [nightlyRateMur, setNightlyRateMur] = useState(initial?.nightlyRateMur ?? 3000);
  const [cleaningFeeMur, setCleaningFeeMur] = useState(initial?.cleaningFeeMur ?? 500);
  const [minStayNights, setMinStayNights] = useState(initial?.minStayNights ?? 1);
  const [amenities, setAmenities] = useState<Amenity[]>(initial?.amenities ?? []);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleAmenity(a: Amenity) {
    setAmenities((current) => current.includes(a) ? current.filter((x) => x !== a) : [...current, a]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        title, description, propertyType, region, addressLine,
        latitude, longitude, bedrooms, beds, bathrooms, maxGuests,
        nightlyRateMur, cleaningFeeMur, minStayNights, amenities,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold">Title</label>
        <input className="w-full rounded border border-gray-300 p-2" required maxLength={200}
               value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-semibold">Description</label>
        <textarea className="w-full rounded border border-gray-300 p-2" required rows={5} maxLength={5000}
                  value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold">Property type</label>
          <select className="w-full rounded border border-gray-300 p-2"
                  value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType)}>
            <option value="Villa">Villa</option>
            <option value="Apartment">Apartment</option>
            <option value="Guesthouse">Guesthouse</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold">Region</label>
          <select className="w-full rounded border border-gray-300 p-2"
                  value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold">Address</label>
        <input className="w-full rounded border border-gray-300 p-2" required maxLength={500}
               value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold">Latitude</label>
          <input type="number" step="0.0001" className="w-full rounded border border-gray-300 p-2"
                 value={latitude} onChange={(e) => setLatitude(parseFloat(e.target.value))} />
        </div>
        <div>
          <label className="block text-sm font-semibold">Longitude</label>
          <input type="number" step="0.0001" className="w-full rounded border border-gray-300 p-2"
                 value={longitude} onChange={(e) => setLongitude(parseFloat(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <NumField label="Bedrooms" value={bedrooms} onChange={setBedrooms} min={0} />
        <NumField label="Beds" value={beds} onChange={setBeds} min={1} />
        <NumField label="Bathrooms" value={bathrooms} onChange={setBathrooms} min={0} />
        <NumField label="Max guests" value={maxGuests} onChange={setMaxGuests} min={1} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <NumField label="Nightly rate (MUR)" value={nightlyRateMur} onChange={setNightlyRateMur} min={1} step={1} />
        <NumField label="Cleaning fee (MUR)" value={cleaningFeeMur} onChange={setCleaningFeeMur} min={0} step={1} />
        <NumField label="Min stay (nights)" value={minStayNights} onChange={setMinStayNights} min={1} />
      </div>
      <div>
        <label className="block text-sm font-semibold">Amenities</label>
        <div className="grid grid-cols-3 gap-2">
          {AMENITY_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={amenities.includes(opt.value)} onChange={() => toggleAmenity(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function NumField({ label, value, onChange, min, step = 1 }: { label: string; value: number; onChange: (n: number) => void; min: number; step?: number }) {
  return (
    <div>
      <label className="block text-sm font-semibold">{label}</label>
      <input type="number" step={step} min={min}
             className="w-full rounded border border-gray-300 p-2"
             value={value}
             onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}
```

- [ ] **Step 3: Create `web/src/app/host/listings/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { deleteListing, getMyListings, publishListing, unpublishListing, type Listing } from "@/lib/listings";

export default function HostListingsPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    getMyListings(accessToken).then(setListings).catch((e) => setError((e as Error).message));
  }, [accessToken]);

  async function togglePublish(id: string, status: string) {
    if (!accessToken) return;
    setWorking(true);
    try {
      const updated = status === "Published"
        ? await unpublishListing(accessToken, id)
        : await publishListing(accessToken, id);
      setListings((curr) => curr.map((l) => l.id === id ? updated : l));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function remove(id: string) {
    if (!accessToken || !confirm("Delete this listing? This cannot be undone.")) return;
    setWorking(true);
    try {
      await deleteListing(accessToken, id);
      setListings((curr) => curr.filter((l) => l.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  if (loading || !user) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">My listings</h1>
        <Link href="/host/listings/new" className="rounded bg-black px-4 py-2 text-white">+ Add listing</Link>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {listings.length === 0 ? (
        <p className="text-gray-600">You haven&apos;t created any listings yet.</p>
      ) : (
        <ul className="space-y-4">
          {listings.map((l) => (
            <li key={l.id} className="flex items-start gap-4 rounded border border-gray-200 p-4">
              <div className="h-24 w-32 shrink-0 overflow-hidden rounded bg-gray-100">
                {l.photos[0] && <img src={l.photos[0].publicUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{l.title}</h2>
                    <p className="text-sm text-gray-600">{l.region} · {l.propertyType} · MUR {l.nightlyRateMur.toLocaleString()}/night</p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs ${l.status === "Published" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                    {l.status}
                  </span>
                </div>
                <div className="mt-3 flex gap-2 text-sm">
                  <Link href={`/host/listings/${l.id}/edit`} className="underline">Edit</Link>
                  <button disabled={working} onClick={() => togglePublish(l.id, l.status)} className="underline disabled:opacity-50">
                    {l.status === "Published" ? "Unpublish" : "Publish"}
                  </button>
                  <Link href={`/listings/${l.id}`} className="underline">View public</Link>
                  <button disabled={working} onClick={() => remove(l.id)} className="text-red-600 underline disabled:opacity-50">Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Create `web/src/app/host/listings/new/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createListing } from "@/lib/listings";
import { ListingForm } from "../listing-form";

export default function NewListingPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  if (loading || !user) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-4">
        <Link href="/host/listings" className="text-sm underline">← Back to my listings</Link>
      </div>
      <h1 className="mb-6 text-3xl font-bold">New listing</h1>
      <ListingForm
        submitLabel="Save as draft"
        onSubmit={async (input) => {
          if (!accessToken) throw new Error("Not authenticated");
          const created = await createListing(accessToken, input);
          router.push(`/host/listings/${created.id}/edit`);
        }}
      />
    </main>
  );
}
```

- [ ] **Step 5: Create `web/src/app/host/listings/[id]/edit/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { deletePhoto, getMyListings, publishListing, unpublishListing, updateListing, uploadPhoto, type Listing } from "@/lib/listings";
import { ListingForm } from "../../listing-form";

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, accessToken, loading } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    getMyListings(accessToken)
      .then((all) => setListing(all.find((l) => l.id === id) ?? null))
      .catch((e) => setError((e as Error).message));
  }, [accessToken, id]);

  if (loading || !user) return <main className="p-8">Loading…</main>;
  if (!listing) return <main className="p-8">Listing not found.</main>;

  async function onPhoto(file: File) {
    if (!accessToken) return;
    try {
      const photo = await uploadPhoto(accessToken, id, file, photoCaption || undefined);
      setListing((l) => l ? { ...l, photos: [...l.photos, photo] } : l);
      setPhotoCaption("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removePhoto(photoId: string) {
    if (!accessToken) return;
    try {
      await deletePhoto(accessToken, id, photoId);
      setListing((l) => l ? { ...l, photos: l.photos.filter((p) => p.id !== photoId) } : l);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function togglePublish() {
    if (!accessToken || !listing) return;
    const updated = listing.status === "Published"
      ? await unpublishListing(accessToken, listing.id)
      : await publishListing(accessToken, listing.id);
    setListing(updated);
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/host/listings" className="text-sm underline">← Back</Link>
        <span className={`rounded px-2 py-0.5 text-xs ${listing.status === "Published" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
          {listing.status}
        </span>
      </div>
      <h1 className="mb-6 text-3xl font-bold">Edit listing</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Photos</h2>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {listing.photos.map((p) => (
            <div key={p.id} className="relative h-32 overflow-hidden rounded bg-gray-100">
              <img src={p.publicUrl} alt={p.caption ?? ""} className="h-full w-full object-cover" />
              <button onClick={() => removePhoto(p.id)} className="absolute right-1 top-1 rounded bg-white/90 px-2 text-xs">Remove</button>
            </div>
          ))}
        </div>
        <input type="text" placeholder="Caption (optional)" className="mb-2 w-full rounded border border-gray-300 p-2 text-sm"
               value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} />
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic"
               onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); }} />
      </section>

      <section className="mb-8">
        <button onClick={togglePublish} className="rounded border border-black px-4 py-2">
          {listing.status === "Published" ? "Unpublish" : "Publish"}
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Details</h2>
        <ListingForm
          submitLabel="Save changes"
          initial={{
            title: listing.title,
            description: listing.description,
            propertyType: listing.propertyType,
            region: listing.region,
            addressLine: listing.addressLine,
            latitude: listing.latitude,
            longitude: listing.longitude,
            bedrooms: listing.bedrooms,
            beds: listing.beds,
            bathrooms: listing.bathrooms,
            maxGuests: listing.maxGuests,
            nightlyRateMur: listing.nightlyRateMur,
            cleaningFeeMur: listing.cleaningFeeMur,
            minStayNights: listing.minStayNights,
            amenities: listing.amenities,
          }}
          onSubmit={async (input) => {
            if (!accessToken) throw new Error("Not authenticated");
            const updated = await updateListing(accessToken, listing.id, input);
            setListing(updated);
          }}
        />
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Modify `web/src/app/account/page.tsx`** — add link to /host/listings

Read the current file. Inside the `<main>` and AFTER the `<dl>` but BEFORE the sign-out button, add:

```tsx
{user.role === "Host" && (
  <p className="mt-4">
    <Link href="/host/listings" className="underline">Manage my listings →</Link>
  </p>
)}
```

Add `import Link from "next/link";` at the top if missing.

- [ ] **Step 7: Run typecheck + lint**

```bash
cd C:/temp/Dodostays/web
npm run typecheck
npm run lint
```

Expected: typecheck clean, lint clean. If lint errors on apostrophes or missing alt text, fix minimally.

- [ ] **Step 8: Commit**

```bash
git -C C:/temp/Dodostays add web/
git -C C:/temp/Dodostays commit -m "feat(web): host listings dashboard, create/edit forms, photo upload UI"
```

---

## Task 2a.11: Public browse page + listing detail page + e2e test

**Files:**
- Create: `C:/temp/Dodostays/web/src/app/listings/page.tsx`
- Create: `C:/temp/Dodostays/web/src/app/listings/[id]/page.tsx`
- Create: `C:/temp/Dodostays/web/src/app/listings/search-form.tsx`
- Modify: `C:/temp/Dodostays/web/src/app/page.tsx` (add prominent "Browse" CTA)
- Create: `C:/temp/Dodostays/web/e2e/listings.spec.ts`

- [ ] **Step 1: Create `web/src/app/listings/search-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REGIONS, type PropertyType } from "@/lib/listings";

export function SearchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [region, setRegion] = useState(params.get("region") ?? "");
  const [propertyType, setPropertyType] = useState<PropertyType | "">((params.get("propertyType") as PropertyType) ?? "");
  const [maxNightly, setMaxNightly] = useState(params.get("maxNightlyMur") ?? "");
  const [minBedrooms, setMinBedrooms] = useState(params.get("minBedrooms") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (region) sp.set("region", region);
    if (propertyType) sp.set("propertyType", propertyType);
    if (maxNightly) sp.set("maxNightlyMur", maxNightly);
    if (minBedrooms) sp.set("minBedrooms", minBedrooms);
    router.push(`/listings?${sp.toString()}`);
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded border border-gray-200 p-4 sm:grid-cols-5">
      <select className="rounded border border-gray-300 p-2" value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="">Any region</option>
        {REGIONS.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
      </select>
      <select className="rounded border border-gray-300 p-2"
              value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType | "")}>
        <option value="">Any type</option>
        <option value="Villa">Villa</option>
        <option value="Apartment">Apartment</option>
        <option value="Guesthouse">Guesthouse</option>
      </select>
      <input type="number" min={0} placeholder="Min bedrooms" className="rounded border border-gray-300 p-2"
             value={minBedrooms} onChange={(e) => setMinBedrooms(e.target.value)} />
      <input type="number" min={1} placeholder="Max MUR/night" className="rounded border border-gray-300 p-2"
             value={maxNightly} onChange={(e) => setMaxNightly(e.target.value)} />
      <button type="submit" className="rounded bg-black p-2 text-white">Search</button>
    </form>
  );
}
```

- [ ] **Step 2: Create `web/src/app/listings/page.tsx`**

```tsx
import Link from "next/link";
import { searchListings, type ListingSearchResponse } from "@/lib/listings";
import { SearchForm } from "./search-form";

export const dynamic = "force-dynamic";

export default async function ListingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const params: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") params[k] = v;
  }

  let results: ListingSearchResponse;
  let error: string | null = null;
  try {
    results = await searchListings(params);
  } catch (e) {
    results = { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 1 };
    error = (e as Error).message;
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-4">
        <Link href="/" className="text-sm underline">← Home</Link>
      </div>
      <h1 className="mb-4 text-3xl font-bold">Browse stays in Mauritius</h1>
      <SearchForm />
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <p className="mt-4 text-sm text-gray-600">{results.totalCount} listings</p>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.items.map((l) => (
          <li key={l.id} className="overflow-hidden rounded border border-gray-200">
            <Link href={`/listings/${l.id}`}>
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                {l.primaryPhotoUrl && <img src={l.primaryPhotoUrl} alt={l.title} className="h-full w-full object-cover" />}
              </div>
              <div className="p-3">
                <h2 className="font-semibold">{l.title}</h2>
                <p className="text-sm text-gray-600">{l.region} · {l.propertyType} · {l.maxGuests} guests</p>
                <p className="mt-1 font-semibold">MUR {l.nightlyRateMur.toLocaleString()}<span className="text-xs font-normal text-gray-500"> / night</span></p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {results.items.length === 0 && !error && (
        <p className="mt-8 text-center text-gray-500">No listings match these filters yet.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Create `web/src/app/listings/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListing } from "@/lib/listings";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing;
  try {
    listing = await getListing(id);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-4">
        <Link href="/listings" className="text-sm underline">← All listings</Link>
      </div>
      <h1 className="text-3xl font-bold">{listing.title}</h1>
      <p className="mt-1 text-sm text-gray-600">{listing.region} · {listing.propertyType} · Hosted by {listing.hostDisplayName}</p>

      {listing.photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {listing.photos.map((p) => (
            <img key={p.id} src={p.publicUrl} alt={p.caption ?? listing.title} className="aspect-[4/3] w-full rounded object-cover" />
          ))}
        </div>
      )}

      <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold">{listing.bedrooms}</p>
          <p className="text-xs text-gray-600">Bedrooms</p>
        </div>
        <div className="rounded border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold">{listing.beds}</p>
          <p className="text-xs text-gray-600">Beds</p>
        </div>
        <div className="rounded border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold">{listing.maxGuests}</p>
          <p className="text-xs text-gray-600">Max guests</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xl font-semibold">About this place</h2>
        <p className="whitespace-pre-line text-gray-800">{listing.description}</p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xl font-semibold">Amenities</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {listing.amenities.map((a) => <li key={a} className="text-sm">· {a}</li>)}
        </ul>
      </section>

      <aside className="mt-8 rounded border border-gray-200 p-4">
        <p className="text-2xl font-bold">MUR {listing.nightlyRateMur.toLocaleString()}<span className="text-xs font-normal text-gray-500"> / night</span></p>
        <p className="text-xs text-gray-500">+ MUR {listing.cleaningFeeMur.toLocaleString()} cleaning · min {listing.minStayNights} night(s)</p>
        <p className="mt-3 text-sm text-gray-600">Booking will be available soon.</p>
      </aside>
    </main>
  );
}
```

- [ ] **Step 4: Modify `web/src/app/page.tsx`**

Replace the file with:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <nav className="flex justify-between p-4">
        <Link href="/" className="font-bold">DodoStays</Link>
        <div className="flex gap-4">
          <Link href="/listings" className="text-sm hover:underline">Browse</Link>
          <Link href="/signin" className="text-sm hover:underline">Sign in</Link>
          <Link href="/signup" className="rounded bg-black px-3 py-1 text-sm text-white">Sign up</Link>
        </div>
      </nav>
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <h1 className="text-5xl font-bold">DodoStays</h1>
        <p className="mt-2 text-gray-600">Mauritius. Real prices. Instant book.</p>
        <Link href="/listings" className="mt-6 rounded bg-black px-6 py-3 text-white">Browse stays</Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Create `web/e2e/listings.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

const apiBase = process.env.E2E_API_BASE ?? "http://localhost:5080";

test.beforeAll(async ({ request }) => {
  let reachable = false;
  try {
    const res = await request.get(`${apiBase}/health/live`);
    reachable = res.ok();
  } catch {
    reachable = false;
  }
  test.skip(!reachable, "Backend API not reachable on " + apiBase);
});

test("host can create + publish a listing and a guest finds it on browse", async ({ page }) => {
  const email = `host-e2e-${Date.now()}@test.dodostays.local`;
  const password = "Aa1!aaaaaa";

  // Sign up as host
  await page.goto("/signup");
  await page.getByText("I'm a host").click();
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Display name").fill("E2E Host");
  await page.getByPlaceholder("Password (10+ chars, mixed case, digit)").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/account$/);

  // Go to host listings, create a new one
  await page.getByRole("link", { name: /manage my listings/i }).click();
  await expect(page).toHaveURL(/\/host\/listings$/);
  await page.getByRole("link", { name: /add listing/i }).click();
  await expect(page).toHaveURL(/\/host\/listings\/new$/);

  const title = `E2E Test Villa ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill("A lovely 3-bed test villa.");
  await page.getByRole("button", { name: /save as draft/i }).click();

  // We land on the edit page
  await expect(page).toHaveURL(/\/host\/listings\/.+\/edit$/);

  // Publish
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText(/^Published$/)).toBeVisible();

  // Open public browse
  await page.goto("/listings");
  await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 10000 });

  // Open detail
  await page.getByRole("heading", { name: title }).click();
  await expect(page).toHaveURL(/\/listings\/.+$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});
```

- [ ] **Step 6: Run e2e tests**

The backend MUST be running on http://localhost:5080. The frontend dev server starts via Playwright config.

```bash
cd C:/temp/Dodostays/web && npm run typecheck && npm run lint && npm run test:e2e
```

Expected: 3 e2e tests passing (smoke + auth + listings).

If listings test fails on form fields not matching label selectors, the form labels in `listing-form.tsx` use `<label>` siblings — Playwright's `getByLabel` may need explicit `for/id` association. Adjust selectors in the test as needed (e.g. use `getByPlaceholder` or a CSS selector).

- [ ] **Step 7: Commit**

```bash
git -C C:/temp/Dodostays add web/
git -C C:/temp/Dodostays commit -m "feat(web): public browse + listing detail pages + listings e2e test"
```

---

## Task 2a.12: Manual browser verification

This is a manual step — user verifies in the browser themselves.

- [ ] **Step 1: Ensure backend + frontend running**

```bash
# Terminal 1
cd C:/temp/Dodostays/api && dotnet run --project src/Dodostays.Api

# Terminal 2
cd C:/temp/Dodostays/web && npm run dev
```

- [ ] **Step 2: Browser flow — host creates a listing**

- Open http://localhost:3000
- Sign up as a Host (or sign in if you already have a host account)
- On `/account`, click "Manage my listings"
- Click "+ Add listing"
- Fill in the form (any plausible numbers — pick `flic-en-flac` region, e.g. 3 beds, 4 beds, 6 guests, 4500 MUR/night, 600 cleaning, 2 min nights, tick Pool + Wifi)
- Click "Save as draft" → lands on edit page
- Upload 1-2 photos (any small jpeg/png)
- Click "Publish"

- [ ] **Step 3: Browser flow — guest browses**

- Open `http://localhost:3000` in an incognito window (or sign out)
- Click "Browse stays"
- See your listing in the grid
- Filter by region "Flic en Flac" → still visible
- Click the card → see detail page with photos, amenities, price

- [ ] **Step 4: Sanity-check the database**

```bash
docker exec dodostays-postgres psql -U dodostays -d dodostays -c "SELECT \"Title\", \"Region\", \"Status\", \"NightlyRateMur\", array_length(\"Amenities\", 1) AS amenity_count FROM \"Listings\" ORDER BY \"CreatedAt\" DESC LIMIT 5;"
```

Expected: see the listing with `Status = 1` (Published) and the right amenity count.

- [ ] **Step 5: Stop the API + frontend**

If everything works, you're done with Plan 02a.

---

## Definition of Done — Plan 02a

- [ ] `Dodostays.Api.Contracts.Listings` namespace with all DTOs and enums
- [ ] `Listings` and `ListingPhotos` tables migrated, with PostGIS `geography(Point,4326)` and `integer[]` amenities
- [ ] `IPhotoStorage` abstraction with `LocalFilesystemPhotoStorage` (default) + `R2PhotoStorage` (skeleton)
- [ ] 10 endpoints live: create / update / delete / publish / unpublish / mine / get / search / upload-photo / delete-photo
- [ ] Listing ownership enforced (host-only mutations, 403 on cross-host)
- [ ] Public search filters: region, propertyType, minBedrooms, minGuests, min/max nightly, amenities, verifiedOnly, sort, page, pageSize
- [ ] Static files middleware serving `/photos/...`
- [ ] Unit tests: `LocalFilesystemPhotoStorageTests` (3), `CreateListingValidatorTests` (7) — total 10 unit
- [ ] Integration tests: `ListingCrudFlowTests` (4), `ListingPublishFlowTests` (3), `ListingSearchFlowTests` (3), `ListingPhotoFlowTests` (2) — total 12 integration
- [ ] Frontend: `/host/listings`, `/host/listings/new`, `/host/listings/[id]/edit`, `/listings`, `/listings/[id]` all working
- [ ] Playwright `listings.spec.ts` passes
- [ ] Manual browser verification (Task 2a.12) passes

**Out of scope (NOT in 02a):**
- AI conversational search (Plan 02b)
- Voice input (Plan 02b)
- Photo resize / CDN — local fs is fine for dev
- Region taxonomy admin CRUD (regions are free strings; frontend has a curated list)
- Verified-tier inspection workflow (just a flag for now)
- Multi-currency display (MUR only on the UI)
- Booking integration (Plan 03)
- Map-based search (deferred — basic filter UI is enough)
- Admin moderation UI (deferred)

## Open Items (deferred)

1. **Photo resize** — currently store originals; large phone photos (~10MB) could hit upload limit at 8MB. Add ImageSharp pipeline in Plan 06 to generate thumbs + 1600w + original.
2. **Region taxonomy table** — currently a free-form slug column. Add `Regions` table with `Slug, Label, ParentId` once we want hierarchical regions / SEO landing pages.
3. **Verified-tier workflow** — currently any host can set tier=Standard at creation; tier=Verified is currently NOT settable from API (will be admin-flipped via inspector role in a later plan).
4. **R2 production photo storage** — implement HTTP adapter when launch readiness work begins.
