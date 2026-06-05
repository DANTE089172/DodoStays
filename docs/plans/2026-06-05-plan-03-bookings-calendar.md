# DodoStays Plan 03 — Bookings, Calendar & iCal Sync

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A guest can pick dates on a listing and place a 15-minute hold (Postgres advisory lock prevents collisions); a host can see confirmed bookings and external-Airbnb-blocked dates on their calendar; bidirectional iCal sync between DodoStays and external platforms (Airbnb/Booking) prevents double-booking. Real payment capture is deferred to Plan 04 — this plan stubs the "confirm" step so the lifecycle is testable end-to-end.

**Architecture:** New `Bookings` module under `api/src/Dodostays.Api/Modules/Bookings/`. New `BookingState` enum (`PendingPayment`, `Confirmed`, `CheckedIn`, `Completed`, `Cancelled`, `Disputed`). Bookings have a `DateRange` value object covering check-in/out, and a `BookingHold` row with a 15-min TTL enforced by a Postgres `daterange` exclusion constraint and a service-level advisory lock. iCal sync uses Hangfire (`Hangfire.PostgreSql`) for the 15-minute background pull job; outbound feeds are signed URLs served by the API at `GET /ical/listings/{listingId}.ics`. Frontend gets MUI `DateRangePicker` on listing detail, a `BookingDates` chip pair, a "Hold dates" CTA with a countdown, and a host calendar overview using MUI `DateCalendar`.

**Tech stack additions:**
- `Hangfire.AspNetCore` + `Hangfire.PostgreSql` (.NET) for the iCal sync background job and dashboard
- `Ical.Net` (.NET) for parsing/emitting iCalendar feeds
- `@mui/x-date-pickers` (frontend) — already partially in scope from Plan 02b's MUI hybrid; add the date-range adapter
- `date-fns` (frontend) — date math without timezone surprises

**Pre-conditions (Plan 02 outputs):**
- `Listings` table with PostGIS lat/lng + amenities[] + status
- `ListingSearchService` exposes filtered/paged search
- `Identity` module with `IUserContext` + JWT auth
- 103 backend tests + 5 e2e all passing
- DodostaysDbContext is `IdentityDbContext<DodostaysUser, DodostaysRole, Guid>` partial class

---

## File Structure

```
api/src/Dodostays.Api.Contracts/
  Bookings/
    BookingState.cs                  # enum
    DateRange.cs                     # struct (CheckIn, CheckOut)
    BookingDto.cs
    BookingSummaryDto.cs
    HoldBookingRequest.cs
    HoldBookingResponse.cs
    ConfirmBookingRequest.cs         # stub (Plan 04 wires payment)
    AvailabilityRequest.cs
    AvailabilityResponse.cs
    CancelBookingRequest.cs
    CalendarDayStatus.cs             # enum: Free, Held, BookedInternal, BookedExternal, Past
    CalendarDto.cs                   # listing + month calendar projection

api/src/Dodostays.Api/Modules/Bookings/
  BookingsModule.cs                  # AddBookingsModule, MapBookingsEndpoints, MapIcalEndpoints
  Domain/
    Booking.cs                       # entity
    BookingHold.cs                   # entity (short-lived)
    ExternalCalendarFeed.cs          # entity (host-supplied iCal URLs)
    ExternalCalendarBlock.cs         # entity (synced blocks)
    BookingStateMachine.cs           # transition rules
  Database/
    DodostaysDbContext.Bookings.cs   # partial; DbSets + OnModelCreatingBookings
    BookingEntityConfigurations.cs
    (migration → Common/Database/Migrations/AddBookingsSchema)
  Services/
    AvailabilityService.cs           # date-range overlap queries
    BookingHoldService.cs            # advisory lock + insert hold + TTL
    BookingService.cs                # confirm/cancel/checkin orchestration
    CalendarService.cs               # month projection for hosts
    PricingService.cs                # nightly × nights + cleaning fee
  Ical/
    IIcalFeedFetcher.cs              # interface
    HttpIcalFeedFetcher.cs           # HttpClient impl
    IcalFeedParser.cs                # Ical.Net wrapper
    IcalFeedEmitter.cs               # produces our outbound .ics
    IcalSyncJob.cs                   # Hangfire recurring job
    SignedIcalUrlGenerator.cs        # HMAC-signed ?token= for outbound
  Validation/
    HoldBookingValidator.cs
    AvailabilityRequestValidator.cs
  Endpoints/
    HoldBookingEndpoint.cs           # POST /api/bookings/hold
    ConfirmBookingEndpoint.cs        # POST /api/bookings/confirm  (stub: marks Confirmed; Plan 04 attaches payment)
    GetMyBookingsEndpoint.cs         # GET  /api/bookings/mine    (guest's bookings)
    GetListingBookingsEndpoint.cs    # GET  /api/listings/{id}/bookings (host's bookings on a listing)
    CancelBookingEndpoint.cs         # POST /api/bookings/{id}/cancel
    CheckInBookingEndpoint.cs        # POST /api/bookings/{id}/checkin (host marks guest arrived)
    GetAvailabilityEndpoint.cs       # GET  /api/listings/{id}/availability?from=&to=
    GetCalendarEndpoint.cs           # GET  /api/listings/{id}/calendar?month=YYYY-MM (host)
    GetIcalFeedEndpoint.cs           # GET  /ical/listings/{id}.ics?token=...
    AddExternalFeedEndpoint.cs       # POST /api/listings/{id}/external-calendars
    RemoveExternalFeedEndpoint.cs    # DELETE /api/listings/{id}/external-calendars/{feedId}
    ListExternalFeedsEndpoint.cs     # GET    /api/listings/{id}/external-calendars

api/tests/
  Dodostays.Api.Tests/
    Bookings/
      DateRangeTests.cs
      BookingStateMachineTests.cs
      PricingServiceTests.cs
      IcalFeedParserTests.cs
      IcalFeedEmitterTests.cs
      SignedIcalUrlGeneratorTests.cs
  Dodostays.Api.IntegrationTests/
    Bookings/
      BookingHoldFlowTests.cs        # advisory lock + collisions
      BookingLifecycleFlowTests.cs   # hold → confirm → checkin → completed
      AvailabilityFlowTests.cs
      CalendarFlowTests.cs
      ExternalFeedFlowTests.cs       # add feed; trigger sync; assert blocked dates
      IcalOutboundFeedTests.cs       # GET signed feed; verify ICS content

web/src/
  lib/
    bookings.ts                      # API client + types
    dates.ts                         # date-fns helpers + ISO formatters
  components/
    bookings/
      booking-date-picker.tsx        # MUI DateRangePicker themed
      booking-summary.tsx            # nights × rate breakdown card
      hold-countdown.tsx             # 15-min visual countdown
      external-feed-list.tsx         # host: add/remove iCal URLs
      host-calendar.tsx              # MUI DateCalendar with booking/external markers
      cancellation-dialog.tsx        # MUI Dialog
  app/
    listings/
      [id]/
        page.tsx                     # MODIFIED: real date picker + booking summary
    host/
      listings/
        [id]/
          edit/
            page.tsx                 # MODIFIED: tabs (Details / Photos / Calendar / Channels)
    bookings/
      page.tsx                       # NEW: guest bookings dashboard
  e2e/
    bookings.spec.ts                 # guest: pick dates → hold → countdown visible
```

**Module boundary rule:** `Bookings` depends on `Listings` (read-only access via `Listing.Id`, `NightlyRateMur`, `CleaningFeeMur`, `MinStayNights`) and `Identity` (`IUserContext`). It does NOT touch `Search` or `Payments` (Plan 04). Pricing is computed inside the module from listing fields — Plan 04 will REPLACE `PricingService` with one that does FX freezing + commission split.

**Time zone rule:** Everything stored in DB as `DateOnly` (date) for check-in/out — Mauritius has one timezone (UTC+4) and STRs are date-based, not minute-based. The frontend converts to ISO `YYYY-MM-DD` strings; the backend uses `DateOnly` and Postgres `date` columns. Calendar exclusion uses `daterange [check_in, check_out)` with `&&` overlap operator.

---

## Section A — Bookings Core (Tasks 3.1 → 3.7)

These tasks build the Bookings module up to the point where guests can hold and confirm dates.

### Task 3.1: Booking contracts (enums, value objects, DTOs)

**Files:**
- Create: `api/src/Dodostays.Api.Contracts/Bookings/BookingState.cs`
- Create: `api/src/Dodostays.Api.Contracts/Bookings/CalendarDayStatus.cs`
- Create: `api/src/Dodostays.Api.Contracts/Bookings/DateRange.cs`
- Create: `api/src/Dodostays.Api.Contracts/Bookings/BookingDto.cs`
- Create: `api/src/Dodostays.Api.Contracts/Bookings/BookingSummaryDto.cs`
- Create: `api/src/Dodostays.Api.Contracts/Bookings/HoldBookingRequest.cs`
- Create: `api/src/Dodostays.Api.Contracts/Bookings/HoldBookingResponse.cs`
- Create: `api/src/Dodostays.Api.Contracts/Bookings/ConfirmBookingRequest.cs`
- Create: `api/src/Dodostays.Api.Contracts/Bookings/AvailabilityRequest.cs`
- Create: `api/src/Dodostays.Api.Contracts/Bookings/AvailabilityResponse.cs`
- Create: `api/src/Dodostays.Api.Contracts/Bookings/CancelBookingRequest.cs`
- Create: `api/src/Dodostays.Api.Contracts/Bookings/CalendarDto.cs`

- [ ] **Step 1: Create `BookingState.cs`**

```csharp
using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Bookings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BookingState
{
    PendingPayment = 0,
    Confirmed = 1,
    CheckedIn = 2,
    Completed = 3,
    Cancelled = 4,
    Disputed = 5
}
```

- [ ] **Step 2: Create `CalendarDayStatus.cs`**

```csharp
using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Bookings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CalendarDayStatus
{
    Free = 0,
    Held = 1,
    BookedInternal = 2,
    BookedExternal = 3,
    Past = 4
}
```

- [ ] **Step 3: Create `DateRange.cs`**

```csharp
namespace Dodostays.Api.Contracts.Bookings;

public readonly record struct DateRange(DateOnly CheckIn, DateOnly CheckOut)
{
    public int Nights => CheckOut.DayNumber - CheckIn.DayNumber;

    public bool IsValid =>
        CheckOut > CheckIn && Nights >= 1 && Nights <= 365;

    public bool Overlaps(DateRange other) =>
        CheckIn < other.CheckOut && other.CheckIn < CheckOut;

    public override string ToString() =>
        $"{CheckIn:yyyy-MM-dd} → {CheckOut:yyyy-MM-dd} ({Nights} nights)";
}
```

- [ ] **Step 4: Create `BookingDto.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Contracts.Bookings;

public sealed record BookingDto(
    Guid Id,
    Guid ListingId,
    string ListingTitle,
    string? PrimaryPhotoUrl,
    Guid GuestUserId,
    string GuestDisplayName,
    Guid HostUserId,
    string HostDisplayName,
    BookingState State,
    DateRange Dates,
    int NumGuests,
    decimal NightlyRateMur,
    decimal CleaningFeeMur,
    decimal SubtotalMur,
    decimal VatMur,
    decimal TotalMur,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ConfirmedAt,
    DateTimeOffset? CheckedInAt,
    DateTimeOffset? CompletedAt,
    DateTimeOffset? CancelledAt,
    string? CancellationReason);
```

- [ ] **Step 5: Create `BookingSummaryDto.cs`**

```csharp
namespace Dodostays.Api.Contracts.Bookings;

public sealed record BookingSummaryDto(
    Guid Id,
    Guid ListingId,
    string ListingTitle,
    string? PrimaryPhotoUrl,
    BookingState State,
    DateRange Dates,
    decimal TotalMur,
    DateTimeOffset CreatedAt);
```

- [ ] **Step 6: Create `HoldBookingRequest.cs`**

```csharp
namespace Dodostays.Api.Contracts.Bookings;

public sealed record HoldBookingRequest(
    Guid ListingId,
    DateOnly CheckIn,
    DateOnly CheckOut,
    int NumGuests);
```

- [ ] **Step 7: Create `HoldBookingResponse.cs`**

```csharp
namespace Dodostays.Api.Contracts.Bookings;

public sealed record HoldBookingResponse(
    Guid BookingId,
    BookingState State,
    DateRange Dates,
    int NumGuests,
    decimal NightlyRateMur,
    decimal CleaningFeeMur,
    decimal SubtotalMur,
    decimal VatMur,
    decimal TotalMur,
    DateTimeOffset HoldExpiresAt);
```

- [ ] **Step 8: Create `ConfirmBookingRequest.cs`**

```csharp
namespace Dodostays.Api.Contracts.Bookings;

public sealed record ConfirmBookingRequest(
    Guid BookingId,
    string? PaymentReference = null);   // Plan 04 will populate this with the MIPS reference
```

- [ ] **Step 9: Create `AvailabilityRequest.cs`**

```csharp
namespace Dodostays.Api.Contracts.Bookings;

public sealed record AvailabilityRequest(
    DateOnly From,
    DateOnly To);
```

- [ ] **Step 10: Create `AvailabilityResponse.cs`**

```csharp
namespace Dodostays.Api.Contracts.Bookings;

public sealed record AvailabilityResponse(
    Guid ListingId,
    DateOnly From,
    DateOnly To,
    bool IsAvailable,
    IReadOnlyList<DateRange> ConflictingRanges);
```

- [ ] **Step 11: Create `CancelBookingRequest.cs`**

```csharp
namespace Dodostays.Api.Contracts.Bookings;

public sealed record CancelBookingRequest(string? Reason);
```

- [ ] **Step 12: Create `CalendarDto.cs`**

```csharp
namespace Dodostays.Api.Contracts.Bookings;

public sealed record CalendarDto(
    Guid ListingId,
    int Year,
    int Month,
    IReadOnlyList<CalendarDayDto> Days);

public sealed record CalendarDayDto(
    DateOnly Date,
    CalendarDayStatus Status,
    Guid? BookingId,
    string? ExternalSource);   // e.g. "Airbnb" / "Booking.com"
```

- [ ] **Step 13: Build & commit**

```bash
cd C:/temp/Dodostays/api && dotnet build src/Dodostays.Api.Contracts/Dodostays.Api.Contracts.csproj
git -C C:/temp/Dodostays add api/src/Dodostays.Api.Contracts/Bookings/
git -C C:/temp/Dodostays commit -m "feat(contracts): Bookings DTOs (BookingState, DateRange, hold/confirm/calendar)"
```

Expected: 0 errors.

---

### Task 3.2: Booking domain entities + state machine + tests

**Files:**
- Create: `api/src/Dodostays.Api/Modules/Bookings/Domain/Booking.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Domain/BookingHold.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Domain/ExternalCalendarFeed.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Domain/ExternalCalendarBlock.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Domain/BookingStateMachine.cs`
- Test: `api/tests/Dodostays.Api.Tests/Bookings/DateRangeTests.cs`
- Test: `api/tests/Dodostays.Api.Tests/Bookings/BookingStateMachineTests.cs`

- [ ] **Step 1: Write failing tests**

`api/tests/Dodostays.Api.Tests/Bookings/DateRangeTests.cs`:

```csharp
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Bookings;

namespace Dodostays.Api.Tests.Bookings;

public class DateRangeTests
{
    [Fact]
    public void Nights_counts_correctly()
    {
        var r = new DateRange(new(2026, 6, 10), new(2026, 6, 13));
        r.Nights.Should().Be(3);
    }

    [Fact]
    public void IsValid_rejects_zero_nights()
    {
        var r = new DateRange(new(2026, 6, 10), new(2026, 6, 10));
        r.IsValid.Should().BeFalse();
    }

    [Fact]
    public void IsValid_rejects_reverse_range()
    {
        var r = new DateRange(new(2026, 6, 13), new(2026, 6, 10));
        r.IsValid.Should().BeFalse();
    }

    [Fact]
    public void IsValid_accepts_one_year()
    {
        var r = new DateRange(new(2026, 6, 10), new(2027, 6, 10));
        r.IsValid.Should().BeTrue();
    }

    [Fact]
    public void IsValid_rejects_over_one_year()
    {
        var r = new DateRange(new(2026, 6, 10), new(2027, 6, 11));
        r.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Overlaps_returns_true_for_partial_overlap()
    {
        var a = new DateRange(new(2026, 6, 10), new(2026, 6, 15));
        var b = new DateRange(new(2026, 6, 13), new(2026, 6, 18));
        a.Overlaps(b).Should().BeTrue();
        b.Overlaps(a).Should().BeTrue();
    }

    [Fact]
    public void Overlaps_returns_false_for_back_to_back()
    {
        var a = new DateRange(new(2026, 6, 10), new(2026, 6, 13));
        var b = new DateRange(new(2026, 6, 13), new(2026, 6, 16));
        a.Overlaps(b).Should().BeFalse();
        b.Overlaps(a).Should().BeFalse();
    }

    [Fact]
    public void Overlaps_returns_false_for_disjoint()
    {
        var a = new DateRange(new(2026, 6, 1), new(2026, 6, 5));
        var b = new DateRange(new(2026, 6, 10), new(2026, 6, 15));
        a.Overlaps(b).Should().BeFalse();
    }
}
```

`api/tests/Dodostays.Api.Tests/Bookings/BookingStateMachineTests.cs`:

```csharp
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Domain;

namespace Dodostays.Api.Tests.Bookings;

public class BookingStateMachineTests
{
    [Theory]
    [InlineData(BookingState.PendingPayment, BookingState.Confirmed, true)]
    [InlineData(BookingState.PendingPayment, BookingState.Cancelled, true)]
    [InlineData(BookingState.PendingPayment, BookingState.CheckedIn, false)]
    [InlineData(BookingState.PendingPayment, BookingState.Completed, false)]
    [InlineData(BookingState.Confirmed, BookingState.CheckedIn, true)]
    [InlineData(BookingState.Confirmed, BookingState.Cancelled, true)]
    [InlineData(BookingState.Confirmed, BookingState.PendingPayment, false)]
    [InlineData(BookingState.Confirmed, BookingState.Completed, false)]
    [InlineData(BookingState.CheckedIn, BookingState.Completed, true)]
    [InlineData(BookingState.CheckedIn, BookingState.Disputed, true)]
    [InlineData(BookingState.CheckedIn, BookingState.Cancelled, false)]
    [InlineData(BookingState.Completed, BookingState.Disputed, true)]
    [InlineData(BookingState.Completed, BookingState.Cancelled, false)]
    [InlineData(BookingState.Cancelled, BookingState.Confirmed, false)]
    [InlineData(BookingState.Disputed, BookingState.Completed, true)]
    public void CanTransition_returns_expected(BookingState from, BookingState to, bool allowed)
    {
        BookingStateMachine.CanTransition(from, to).Should().Be(allowed);
    }
}
```

- [ ] **Step 2: Run — should fail (build errors)**

```bash
cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~Bookings"
```

- [ ] **Step 3: Create `Booking.cs`**

```csharp
using Dodostays.Api.Contracts.Bookings;

namespace Dodostays.Api.Modules.Bookings.Domain;

public class Booking
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public Guid GuestUserId { get; set; }
    public Guid HostUserId { get; set; }
    public BookingState State { get; set; } = BookingState.PendingPayment;

    public DateOnly CheckIn { get; set; }
    public DateOnly CheckOut { get; set; }
    public int NumGuests { get; set; }

    public decimal NightlyRateMur { get; set; }
    public decimal CleaningFeeMur { get; set; }
    public decimal SubtotalMur { get; set; }
    public decimal VatMur { get; set; }
    public decimal TotalMur { get; set; }

    public string? PaymentReference { get; set; }
    public string? CancellationReason { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset HoldExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddMinutes(15);
    public DateTimeOffset? ConfirmedAt { get; set; }
    public DateTimeOffset? CheckedInAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }

    public DateRange Dates => new(CheckIn, CheckOut);

    public void MarkConfirmed(string? paymentReference)
    {
        if (!BookingStateMachine.CanTransition(State, BookingState.Confirmed))
            throw new InvalidOperationException($"Cannot confirm from state {State}.");
        State = BookingState.Confirmed;
        PaymentReference = paymentReference;
        ConfirmedAt = DateTimeOffset.UtcNow;
    }

    public void MarkCheckedIn()
    {
        if (!BookingStateMachine.CanTransition(State, BookingState.CheckedIn))
            throw new InvalidOperationException($"Cannot check-in from state {State}.");
        State = BookingState.CheckedIn;
        CheckedInAt = DateTimeOffset.UtcNow;
    }

    public void MarkCompleted()
    {
        if (!BookingStateMachine.CanTransition(State, BookingState.Completed))
            throw new InvalidOperationException($"Cannot complete from state {State}.");
        State = BookingState.Completed;
        CompletedAt = DateTimeOffset.UtcNow;
    }

    public void Cancel(string? reason)
    {
        if (!BookingStateMachine.CanTransition(State, BookingState.Cancelled))
            throw new InvalidOperationException($"Cannot cancel from state {State}.");
        State = BookingState.Cancelled;
        CancelledAt = DateTimeOffset.UtcNow;
        CancellationReason = reason;
    }
}
```

- [ ] **Step 4: Create `BookingHold.cs`**

```csharp
namespace Dodostays.Api.Modules.Bookings.Domain;

public class BookingHold
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public Guid ListingId { get; set; }
    public DateOnly CheckIn { get; set; }
    public DateOnly CheckOut { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddMinutes(15);
    public bool IsActive => DateTimeOffset.UtcNow < ExpiresAt;
}
```

- [ ] **Step 5: Create `ExternalCalendarFeed.cs`**

```csharp
namespace Dodostays.Api.Modules.Bookings.Domain;

public class ExternalCalendarFeed
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public string Source { get; set; } = "Airbnb";   // free string: "Airbnb" / "Booking.com" / "Vrbo" / "Other"
    public string Url { get; set; } = string.Empty;  // host-supplied iCal URL
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastSyncedAt { get; set; }
    public string? LastError { get; set; }
}
```

- [ ] **Step 6: Create `ExternalCalendarBlock.cs`**

```csharp
namespace Dodostays.Api.Modules.Bookings.Domain;

public class ExternalCalendarBlock
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public Guid FeedId { get; set; }
    public string ExternalUid { get; set; } = string.Empty;   // VEVENT UID
    public DateOnly CheckIn { get; set; }
    public DateOnly CheckOut { get; set; }
    public string? Summary { get; set; }
    public DateTimeOffset SyncedAt { get; set; } = DateTimeOffset.UtcNow;
}
```

- [ ] **Step 7: Create `BookingStateMachine.cs`**

```csharp
using Dodostays.Api.Contracts.Bookings;

namespace Dodostays.Api.Modules.Bookings.Domain;

public static class BookingStateMachine
{
    private static readonly Dictionary<BookingState, HashSet<BookingState>> Transitions = new()
    {
        [BookingState.PendingPayment] = new() { BookingState.Confirmed, BookingState.Cancelled },
        [BookingState.Confirmed]      = new() { BookingState.CheckedIn, BookingState.Cancelled },
        [BookingState.CheckedIn]      = new() { BookingState.Completed, BookingState.Disputed },
        [BookingState.Completed]      = new() { BookingState.Disputed },
        [BookingState.Cancelled]      = new() { },
        [BookingState.Disputed]       = new() { BookingState.Completed }
    };

    public static bool CanTransition(BookingState from, BookingState to) =>
        Transitions.TryGetValue(from, out var allowed) && allowed.Contains(to);

    public static void EnsureTransition(BookingState from, BookingState to)
    {
        if (!CanTransition(from, to))
            throw new InvalidOperationException($"Invalid transition: {from} → {to}");
    }
}
```

- [ ] **Step 8: Run tests**

```bash
cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~Bookings"
```

Expected: 8 DateRange + 14 BookingStateMachine = 22 passing.

- [ ] **Step 9: Build full**

```bash
dotnet build
```

Expected: 0 errors.

- [ ] **Step 10: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Bookings/Domain/ api/tests/Dodostays.Api.Tests/Bookings/
git -C C:/temp/Dodostays commit -m "feat(bookings): domain entities + BookingStateMachine with TDD"
```

---

### Task 3.3: Wire Bookings tables into DbContext + EF migration

**Files:**
- Create: `api/src/Dodostays.Api/Modules/Bookings/Database/BookingEntityConfigurations.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Database/DodostaysDbContext.Bookings.cs`
- Modify: `api/src/Dodostays.Api/Modules/Common/Database/DodostaysDbContext.cs` (call OnModelCreatingBookings)

- [ ] **Step 1: Create `BookingEntityConfigurations.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Bookings.Domain;

namespace Dodostays.Api.Modules.Bookings.Database;

internal static class BookingEntityConfigurations
{
    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Booking>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.State).HasConversion<int>();
            b.Property(x => x.CheckIn).HasColumnType("date");
            b.Property(x => x.CheckOut).HasColumnType("date");
            b.Property(x => x.NightlyRateMur).HasPrecision(12, 2);
            b.Property(x => x.CleaningFeeMur).HasPrecision(12, 2);
            b.Property(x => x.SubtotalMur).HasPrecision(12, 2);
            b.Property(x => x.VatMur).HasPrecision(12, 2);
            b.Property(x => x.TotalMur).HasPrecision(12, 2);
            b.Property(x => x.PaymentReference).HasMaxLength(128);
            b.Property(x => x.CancellationReason).HasMaxLength(1000);
            b.HasIndex(x => x.ListingId);
            b.HasIndex(x => x.GuestUserId);
            b.HasIndex(x => x.HostUserId);
            b.HasIndex(x => new { x.ListingId, x.State });
            b.HasIndex(x => new { x.ListingId, x.CheckIn, x.CheckOut });
        });

        modelBuilder.Entity<BookingHold>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.CheckIn).HasColumnType("date");
            b.Property(x => x.CheckOut).HasColumnType("date");
            b.HasOne(x => x.Booking)
                .WithMany()
                .HasForeignKey(x => x.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(x => new { x.ListingId, x.CheckIn, x.CheckOut });
            b.HasIndex(x => x.ExpiresAt);
        });

        modelBuilder.Entity<ExternalCalendarFeed>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Source).IsRequired().HasMaxLength(64);
            b.Property(x => x.Url).IsRequired().HasMaxLength(2048);
            b.Property(x => x.LastError).HasMaxLength(2000);
            b.HasIndex(x => x.ListingId);
        });

        modelBuilder.Entity<ExternalCalendarBlock>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.ExternalUid).IsRequired().HasMaxLength(256);
            b.Property(x => x.Summary).HasMaxLength(500);
            b.Property(x => x.CheckIn).HasColumnType("date");
            b.Property(x => x.CheckOut).HasColumnType("date");
            b.HasIndex(x => x.ListingId);
            b.HasIndex(x => x.FeedId);
            b.HasIndex(x => new { x.ListingId, x.CheckIn, x.CheckOut });
            b.HasIndex(x => new { x.FeedId, x.ExternalUid }).IsUnique();
        });
    }
}
```

- [ ] **Step 2: Create `DodostaysDbContext.Bookings.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Bookings.Domain;

namespace Dodostays.Api.Modules.Common.Database;

public partial class DodostaysDbContext
{
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingHold> BookingHolds => Set<BookingHold>();
    public DbSet<ExternalCalendarFeed> ExternalCalendarFeeds => Set<ExternalCalendarFeed>();
    public DbSet<ExternalCalendarBlock> ExternalCalendarBlocks => Set<ExternalCalendarBlock>();

    private static void OnModelCreatingBookings(ModelBuilder modelBuilder)
    {
        Modules.Bookings.Database.BookingEntityConfigurations.Apply(modelBuilder);
    }
}
```

- [ ] **Step 3: Modify `DodostaysDbContext.cs`**

Read the file. The `OnModelCreating` method calls `OnModelCreatingIdentity(modelBuilder)` and `OnModelCreatingListings(modelBuilder)`. Add a third call AFTER the listings call:

```csharp
OnModelCreatingBookings(modelBuilder);
```

Final method:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);
    modelBuilder.HasPostgresExtension("postgis");
    OnModelCreatingIdentity(modelBuilder);
    OnModelCreatingListings(modelBuilder);
    OnModelCreatingBookings(modelBuilder);
}
```

- [ ] **Step 4: Build**

```bash
cd C:/temp/Dodostays/api && dotnet build
```

Expected: 0 errors. Kill `Dodostays.Api.exe` if locked.

- [ ] **Step 5: Generate migration**

```bash
dotnet ef migrations add AddBookingsSchema --project src/Dodostays.Api --output-dir Modules/Common/Database/Migrations
```

Read the generated `Up()` method. It should create:
- `Bookings` table with date columns + decimal columns + 5 indexes
- `BookingHolds` table with FK cascade to Bookings + 2 indexes
- `ExternalCalendarFeeds` table with index on ListingId
- `ExternalCalendarBlocks` table with 4 indexes including the unique `(FeedId, ExternalUid)`

- [ ] **Step 6: Apply migration**

```bash
dotnet ef database update --project src/Dodostays.Api
```

- [ ] **Step 7: Verify in Postgres**

```bash
docker exec dodostays-postgres psql -U dodostays -d dodostays -c "\dt"
```

Expected: 4 new tables (`Bookings`, `BookingHolds`, `ExternalCalendarFeeds`, `ExternalCalendarBlocks`) alongside existing tables.

```bash
docker exec dodostays-postgres psql -U dodostays -d dodostays -c "SELECT \"MigrationId\" FROM \"__EFMigrationsHistory\" ORDER BY \"MigrationId\";"
```

Expected: 4 rows ending with `_AddBookingsSchema`.

- [ ] **Step 8: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "feat(bookings): wire entities into DodostaysDbContext + EF migration"
```

---

### Task 3.4: PricingService + tests

**Files:**
- Create: `api/src/Dodostays.Api/Modules/Bookings/Services/PricingService.cs`
- Test: `api/tests/Dodostays.Api.Tests/Bookings/PricingServiceTests.cs`

The pricing rule (this plan): `Subtotal = Nightly × Nights + Cleaning`. `VAT = Subtotal × 0.15` (Mauritius VAT). `Total = Subtotal + VAT`. All MUR. Plan 04 will replace this with FX-aware logic.

- [ ] **Step 1: Write the failing test**

```csharp
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Tests.Bookings;

public class PricingServiceTests
{
    private readonly PricingService _svc = new();

    [Fact]
    public void Computes_subtotal_vat_and_total()
    {
        var dates = new DateRange(new(2026, 6, 10), new(2026, 6, 13));
        var p = _svc.Quote(nightlyMur: 5000m, cleaningMur: 800m, dates: dates);

        p.Nights.Should().Be(3);
        p.SubtotalMur.Should().Be(15800m);
        p.VatMur.Should().Be(2370m);
        p.TotalMur.Should().Be(18170m);
    }

    [Fact]
    public void Zero_cleaning_fee_handled()
    {
        var dates = new DateRange(new(2026, 6, 10), new(2026, 6, 12));
        var p = _svc.Quote(5000m, 0m, dates);
        p.SubtotalMur.Should().Be(10000m);
        p.VatMur.Should().Be(1500m);
        p.TotalMur.Should().Be(11500m);
    }

    [Fact]
    public void Throws_on_invalid_date_range()
    {
        var dates = new DateRange(new(2026, 6, 13), new(2026, 6, 10));
        Action act = () => _svc.Quote(5000m, 800m, dates);
        act.Should().Throw<ArgumentException>();
    }
}
```

- [ ] **Step 2: Run — should fail**

- [ ] **Step 3: Create `PricingService.cs`**

```csharp
using Dodostays.Api.Contracts.Bookings;

namespace Dodostays.Api.Modules.Bookings.Services;

public sealed class PricingService
{
    public const decimal MauritiusVatRate = 0.15m;

    public PriceQuote Quote(decimal nightlyMur, decimal cleaningMur, DateRange dates)
    {
        if (!dates.IsValid) throw new ArgumentException("Invalid date range.", nameof(dates));
        var nights = dates.Nights;
        var subtotal = (nightlyMur * nights) + cleaningMur;
        var vat = Math.Round(subtotal * MauritiusVatRate, 2, MidpointRounding.ToEven);
        var total = subtotal + vat;
        return new PriceQuote(nights, subtotal, vat, total);
    }
}

public readonly record struct PriceQuote(
    int Nights,
    decimal SubtotalMur,
    decimal VatMur,
    decimal TotalMur);
```

- [ ] **Step 4: Run — expect 3 passing**

- [ ] **Step 5: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Bookings/Services/PricingService.cs api/tests/Dodostays.Api.Tests/Bookings/PricingServiceTests.cs
git -C C:/temp/Dodostays commit -m "feat(bookings): PricingService with VAT calc + unit tests"
```

---

### Task 3.5: AvailabilityService + BookingHoldService

This is the concurrency-critical piece. Two guests trying to grab the same dates must race-condition-safely produce ONE winner. We use Postgres advisory locks scoped to `(listing_id, check_in_day_number)`.

**Files:**
- Create: `api/src/Dodostays.Api/Modules/Bookings/Services/AvailabilityService.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Services/BookingHoldService.cs`

- [ ] **Step 1: Create `AvailabilityService.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Services;

public sealed class AvailabilityService
{
    private readonly DodostaysDbContext _db;

    public AvailabilityService(DodostaysDbContext db) => _db = db;

    public async Task<AvailabilityResponse> CheckAsync(Guid listingId, DateRange dates, CancellationToken ct)
    {
        var conflicts = new List<DateRange>();

        // Confirmed/CheckedIn/Completed bookings (active, non-cancelled)
        var bookingConflicts = await _db.Bookings
            .Where(b => b.ListingId == listingId
                && b.State != BookingState.Cancelled
                && b.CheckIn < dates.CheckOut
                && dates.CheckIn < b.CheckOut)
            .Select(b => new { b.CheckIn, b.CheckOut })
            .ToListAsync(ct);
        conflicts.AddRange(bookingConflicts.Select(b => new DateRange(b.CheckIn, b.CheckOut)));

        // Active holds
        var now = DateTimeOffset.UtcNow;
        var holdConflicts = await _db.BookingHolds
            .Where(h => h.ListingId == listingId
                && h.ExpiresAt > now
                && h.CheckIn < dates.CheckOut
                && dates.CheckIn < h.CheckOut)
            .Select(h => new { h.CheckIn, h.CheckOut })
            .ToListAsync(ct);
        conflicts.AddRange(holdConflicts.Select(h => new DateRange(h.CheckIn, h.CheckOut)));

        // External calendar blocks
        var externalConflicts = await _db.ExternalCalendarBlocks
            .Where(e => e.ListingId == listingId
                && e.CheckIn < dates.CheckOut
                && dates.CheckIn < e.CheckOut)
            .Select(e => new { e.CheckIn, e.CheckOut })
            .ToListAsync(ct);
        conflicts.AddRange(externalConflicts.Select(e => new DateRange(e.CheckIn, e.CheckOut)));

        return new AvailabilityResponse(
            ListingId: listingId,
            From: dates.CheckIn,
            To: dates.CheckOut,
            IsAvailable: conflicts.Count == 0,
            ConflictingRanges: conflicts);
    }

    public async Task<bool> IsAvailableAsync(Guid listingId, DateRange dates, CancellationToken ct)
    {
        var r = await CheckAsync(listingId, dates, ct);
        return r.IsAvailable;
    }
}
```

- [ ] **Step 2: Create `BookingHoldService.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Domain;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Services;

public sealed class BookingHoldService
{
    private readonly DodostaysDbContext _db;
    private readonly AvailabilityService _availability;
    private readonly PricingService _pricing;

    public BookingHoldService(DodostaysDbContext db, AvailabilityService availability, PricingService pricing)
    {
        _db = db;
        _availability = availability;
        _pricing = pricing;
    }

    public async Task<HoldBookingResponse> HoldAsync(
        Guid guestUserId,
        HoldBookingRequest req,
        CancellationToken ct)
    {
        var dates = new DateRange(req.CheckIn, req.CheckOut);
        if (!dates.IsValid)
            throw new InvalidOperationException("Invalid date range.");

        var listing = await _db.Listings.SingleOrDefaultAsync(l => l.Id == req.ListingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");

        if (req.NumGuests < 1 || req.NumGuests > listing.MaxGuests)
            throw new InvalidOperationException($"Guest count must be 1..{listing.MaxGuests}.");
        if (dates.Nights < listing.MinStayNights)
            throw new InvalidOperationException($"Minimum stay is {listing.MinStayNights} night(s).");

        // Postgres advisory lock keyed on listing id (truncated to int64).
        // This serializes hold attempts on the same listing.
        var lockKey = unchecked((long)BitConverter.ToInt64(listing.Id.ToByteArray(), 0));

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock({lockKey})", ct);

        var avail = await _availability.CheckAsync(listing.Id, dates, ct);
        if (!avail.IsAvailable)
            throw new InvalidOperationException("Dates not available.");

        var quote = _pricing.Quote(listing.NightlyRateMur, listing.CleaningFeeMur, dates);

        var booking = new Booking
        {
            ListingId = listing.Id,
            GuestUserId = guestUserId,
            HostUserId = listing.HostUserId,
            State = BookingState.PendingPayment,
            CheckIn = dates.CheckIn,
            CheckOut = dates.CheckOut,
            NumGuests = req.NumGuests,
            NightlyRateMur = listing.NightlyRateMur,
            CleaningFeeMur = listing.CleaningFeeMur,
            SubtotalMur = quote.SubtotalMur,
            VatMur = quote.VatMur,
            TotalMur = quote.TotalMur,
            HoldExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15)
        };
        _db.Bookings.Add(booking);

        var hold = new BookingHold
        {
            BookingId = booking.Id,
            ListingId = listing.Id,
            CheckIn = dates.CheckIn,
            CheckOut = dates.CheckOut,
            ExpiresAt = booking.HoldExpiresAt
        };
        _db.BookingHolds.Add(hold);

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return new HoldBookingResponse(
            BookingId: booking.Id,
            State: booking.State,
            Dates: dates,
            NumGuests: booking.NumGuests,
            NightlyRateMur: booking.NightlyRateMur,
            CleaningFeeMur: booking.CleaningFeeMur,
            SubtotalMur: booking.SubtotalMur,
            VatMur: booking.VatMur,
            TotalMur: booking.TotalMur,
            HoldExpiresAt: booking.HoldExpiresAt);
    }
}
```

- [ ] **Step 3: Build**

```bash
cd C:/temp/Dodostays/api && dotnet build
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Bookings/Services/
git -C C:/temp/Dodostays commit -m "feat(bookings): AvailabilityService + BookingHoldService with Postgres advisory lock"
```

---

### Task 3.6: BookingService (confirm/cancel/checkin) + CalendarService

**Files:**
- Create: `api/src/Dodostays.Api/Modules/Bookings/Services/BookingService.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Services/CalendarService.cs`

- [ ] **Step 1: Create `BookingService.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Domain;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Services;

public sealed class BookingService
{
    private readonly DodostaysDbContext _db;

    public BookingService(DodostaysDbContext db) => _db = db;

    public async Task<BookingDto> ConfirmAsync(Guid guestUserId, Guid bookingId, string? paymentReference, CancellationToken ct)
    {
        var booking = await _db.Bookings.SingleOrDefaultAsync(b => b.Id == bookingId, ct)
            ?? throw new KeyNotFoundException("Booking not found.");
        if (booking.GuestUserId != guestUserId)
            throw new UnauthorizedAccessException("Not your booking.");
        if (booking.HoldExpiresAt < DateTimeOffset.UtcNow && booking.State == BookingState.PendingPayment)
            throw new InvalidOperationException("Hold expired — please hold dates again.");

        booking.MarkConfirmed(paymentReference);

        // The hold record can be removed; booking itself is now the source of truth
        var holds = await _db.BookingHolds.Where(h => h.BookingId == bookingId).ToListAsync(ct);
        _db.BookingHolds.RemoveRange(holds);

        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(booking, ct);
    }

    public async Task<BookingDto> CancelAsync(Guid actorUserId, Guid bookingId, string? reason, CancellationToken ct)
    {
        var booking = await _db.Bookings.SingleOrDefaultAsync(b => b.Id == bookingId, ct)
            ?? throw new KeyNotFoundException("Booking not found.");
        if (booking.GuestUserId != actorUserId && booking.HostUserId != actorUserId)
            throw new UnauthorizedAccessException("Not your booking.");

        booking.Cancel(reason);
        var holds = await _db.BookingHolds.Where(h => h.BookingId == bookingId).ToListAsync(ct);
        _db.BookingHolds.RemoveRange(holds);

        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(booking, ct);
    }

    public async Task<BookingDto> CheckInAsync(Guid hostUserId, Guid bookingId, CancellationToken ct)
    {
        var booking = await _db.Bookings.SingleOrDefaultAsync(b => b.Id == bookingId, ct)
            ?? throw new KeyNotFoundException("Booking not found.");
        if (booking.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("Not your listing.");

        booking.MarkCheckedIn();
        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(booking, ct);
    }

    public async Task<BookingDto?> GetAsync(Guid bookingId, Guid actorUserId, CancellationToken ct)
    {
        var booking = await _db.Bookings.AsNoTracking().SingleOrDefaultAsync(b => b.Id == bookingId, ct);
        if (booking is null) return null;
        if (booking.GuestUserId != actorUserId && booking.HostUserId != actorUserId) return null;
        return await ToDtoAsync(booking, ct);
    }

    public async Task<IReadOnlyList<BookingSummaryDto>> GetMineAsync(Guid guestUserId, CancellationToken ct)
    {
        var rows = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.GuestUserId == guestUserId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id, b.ListingId, b.State, b.CheckIn, b.CheckOut, b.TotalMur, b.CreatedAt,
                Listing = _db.Listings.Where(l => l.Id == b.ListingId).Select(l => new
                {
                    l.Title,
                    PrimaryPhotoUrl = l.Photos.OrderBy(p => p.SortOrder).Select(p => p.PublicUrl).FirstOrDefault()
                }).FirstOrDefault()
            })
            .ToListAsync(ct);

        return rows.Select(r => new BookingSummaryDto(
            Id: r.Id,
            ListingId: r.ListingId,
            ListingTitle: r.Listing?.Title ?? "(deleted listing)",
            PrimaryPhotoUrl: r.Listing?.PrimaryPhotoUrl,
            State: r.State,
            Dates: new DateRange(r.CheckIn, r.CheckOut),
            TotalMur: r.TotalMur,
            CreatedAt: r.CreatedAt)).ToList();
    }

    public async Task<IReadOnlyList<BookingSummaryDto>> GetForListingAsync(Guid listingId, Guid hostUserId, CancellationToken ct)
    {
        var listing = await _db.Listings.SingleOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");
        if (listing.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("Not your listing.");

        var rows = await _db.Bookings.AsNoTracking()
            .Where(b => b.ListingId == listingId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id, b.ListingId, b.State, b.CheckIn, b.CheckOut, b.TotalMur, b.CreatedAt,
                Listing = _db.Listings.Where(l => l.Id == b.ListingId).Select(l => new
                {
                    l.Title,
                    PrimaryPhotoUrl = l.Photos.OrderBy(p => p.SortOrder).Select(p => p.PublicUrl).FirstOrDefault()
                }).FirstOrDefault()
            })
            .ToListAsync(ct);

        return rows.Select(r => new BookingSummaryDto(
            r.Id, r.ListingId,
            r.Listing?.Title ?? "(deleted listing)",
            r.Listing?.PrimaryPhotoUrl,
            r.State,
            new DateRange(r.CheckIn, r.CheckOut),
            r.TotalMur, r.CreatedAt)).ToList();
    }

    private async Task<BookingDto> ToDtoAsync(Booking b, CancellationToken ct)
    {
        var info = await _db.Listings
            .Where(l => l.Id == b.ListingId)
            .Select(l => new
            {
                l.Title,
                PrimaryPhotoUrl = l.Photos.OrderBy(p => p.SortOrder).Select(p => p.PublicUrl).FirstOrDefault(),
                HostName = _db.Users.Where(u => u.Id == l.HostUserId).Select(u => u.DisplayName).FirstOrDefault()
            })
            .SingleAsync(ct);

        var guestName = await _db.Users
            .Where(u => u.Id == b.GuestUserId)
            .Select(u => u.DisplayName)
            .SingleAsync(ct);

        return new BookingDto(
            Id: b.Id,
            ListingId: b.ListingId,
            ListingTitle: info.Title,
            PrimaryPhotoUrl: info.PrimaryPhotoUrl,
            GuestUserId: b.GuestUserId,
            GuestDisplayName: guestName,
            HostUserId: b.HostUserId,
            HostDisplayName: info.HostName ?? "(unknown)",
            State: b.State,
            Dates: new DateRange(b.CheckIn, b.CheckOut),
            NumGuests: b.NumGuests,
            NightlyRateMur: b.NightlyRateMur,
            CleaningFeeMur: b.CleaningFeeMur,
            SubtotalMur: b.SubtotalMur,
            VatMur: b.VatMur,
            TotalMur: b.TotalMur,
            CreatedAt: b.CreatedAt,
            ConfirmedAt: b.ConfirmedAt,
            CheckedInAt: b.CheckedInAt,
            CompletedAt: b.CompletedAt,
            CancelledAt: b.CancelledAt,
            CancellationReason: b.CancellationReason);
    }
}
```

- [ ] **Step 2: Create `CalendarService.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Services;

public sealed class CalendarService
{
    private readonly DodostaysDbContext _db;

    public CalendarService(DodostaysDbContext db) => _db = db;

    public async Task<CalendarDto> GetMonthAsync(Guid listingId, Guid hostUserId, int year, int month, CancellationToken ct)
    {
        var listing = await _db.Listings.SingleOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");
        if (listing.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("Not your listing.");

        var firstDay = new DateOnly(year, month, 1);
        var nextMonth = firstDay.AddMonths(1);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var bookings = await _db.Bookings.AsNoTracking()
            .Where(b => b.ListingId == listingId
                && b.State != BookingState.Cancelled
                && b.CheckIn < nextMonth
                && firstDay < b.CheckOut)
            .Select(b => new { b.Id, b.CheckIn, b.CheckOut })
            .ToListAsync(ct);

        var holds = await _db.BookingHolds.AsNoTracking()
            .Where(h => h.ListingId == listingId
                && h.ExpiresAt > DateTimeOffset.UtcNow
                && h.CheckIn < nextMonth
                && firstDay < h.CheckOut)
            .Select(h => new { h.CheckIn, h.CheckOut })
            .ToListAsync(ct);

        var feedSourceLookup = await _db.ExternalCalendarFeeds.AsNoTracking()
            .Where(f => f.ListingId == listingId)
            .ToDictionaryAsync(f => f.Id, f => f.Source, ct);

        var external = await _db.ExternalCalendarBlocks.AsNoTracking()
            .Where(e => e.ListingId == listingId
                && e.CheckIn < nextMonth
                && firstDay < e.CheckOut)
            .Select(e => new { e.FeedId, e.CheckIn, e.CheckOut })
            .ToListAsync(ct);

        var days = new List<CalendarDayDto>();
        for (var d = firstDay; d < nextMonth; d = d.AddDays(1))
        {
            CalendarDayStatus status;
            Guid? bookingId = null;
            string? source = null;

            if (d < today)
            {
                status = CalendarDayStatus.Past;
            }
            else if (bookings.FirstOrDefault(b => b.CheckIn <= d && d < b.CheckOut) is { } booked)
            {
                status = CalendarDayStatus.BookedInternal;
                bookingId = booked.Id;
            }
            else if (external.FirstOrDefault(e => e.CheckIn <= d && d < e.CheckOut) is { } ext)
            {
                status = CalendarDayStatus.BookedExternal;
                source = feedSourceLookup.TryGetValue(ext.FeedId, out var s) ? s : "External";
            }
            else if (holds.Any(h => h.CheckIn <= d && d < h.CheckOut))
            {
                status = CalendarDayStatus.Held;
            }
            else
            {
                status = CalendarDayStatus.Free;
            }

            days.Add(new CalendarDayDto(d, status, bookingId, source));
        }

        return new CalendarDto(listingId, year, month, days);
    }
}
```

- [ ] **Step 3: Build**

```bash
cd C:/temp/Dodostays/api && dotnet build
```

Expected: 0 errors. Kill `Dodostays.Api.exe` if locked.

- [ ] **Step 4: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Bookings/Services/
git -C C:/temp/Dodostays commit -m "feat(bookings): BookingService (confirm/cancel/checkin) + CalendarService"
```

---

### Task 3.7: Booking endpoints + validators + module wiring

**Files:**
- Create: `api/src/Dodostays.Api/Modules/Bookings/Validation/HoldBookingValidator.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Validation/AvailabilityRequestValidator.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Endpoints/HoldBookingEndpoint.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Endpoints/ConfirmBookingEndpoint.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Endpoints/GetMyBookingsEndpoint.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Endpoints/GetListingBookingsEndpoint.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Endpoints/CancelBookingEndpoint.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Endpoints/CheckInBookingEndpoint.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Endpoints/GetAvailabilityEndpoint.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/Endpoints/GetCalendarEndpoint.cs`
- Create: `api/src/Dodostays.Api/Modules/Bookings/BookingsModule.cs`
- Modify: `api/src/Dodostays.Api/Program.cs`

- [ ] **Step 1: Create `HoldBookingValidator.cs`**

```csharp
using FluentValidation;
using Dodostays.Api.Contracts.Bookings;

namespace Dodostays.Api.Modules.Bookings.Validation;

public sealed class HoldBookingValidator : AbstractValidator<HoldBookingRequest>
{
    public HoldBookingValidator()
    {
        RuleFor(r => r.ListingId).NotEmpty();
        RuleFor(r => r.NumGuests).GreaterThan(0).LessThanOrEqualTo(50);
        RuleFor(r => r.CheckOut)
            .Must((req, checkOut) => checkOut > req.CheckIn)
            .WithMessage("CheckOut must be after CheckIn.");
        RuleFor(r => r)
            .Must(r => (r.CheckOut.DayNumber - r.CheckIn.DayNumber) <= 365)
            .WithMessage("Stay cannot exceed 365 nights.");
        RuleFor(r => r.CheckIn)
            .GreaterThanOrEqualTo(_ => DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("CheckIn cannot be in the past.");
    }
}
```

- [ ] **Step 2: Create `AvailabilityRequestValidator.cs`**

```csharp
using FluentValidation;
using Dodostays.Api.Contracts.Bookings;

namespace Dodostays.Api.Modules.Bookings.Validation;

public sealed class AvailabilityRequestValidator : AbstractValidator<AvailabilityRequest>
{
    public AvailabilityRequestValidator()
    {
        RuleFor(r => r.To)
            .Must((req, to) => to > req.From)
            .WithMessage("To must be after From.");
        RuleFor(r => r)
            .Must(r => (r.To.DayNumber - r.From.DayNumber) <= 365)
            .WithMessage("Range cannot exceed 365 days.");
    }
}
```

- [ ] **Step 3: Create `HoldBookingEndpoint.cs`**

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class HoldBookingEndpoint
{
    public static RouteHandlerBuilder MapHoldBooking(this IEndpointRouteBuilder app) =>
        app.MapPost("/api/bookings/hold", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        [FromBody] HoldBookingRequest request,
        IValidator<HoldBookingRequest> validator,
        IUserContext userContext,
        BookingHoldService hold,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        try
        {
            var res = await hold.HoldAsync(user.Id, request, ct);
            return Results.Ok(res);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Problem(statusCode: StatusCodes.Status409Conflict, title: ex.Message);
        }
    }
}
```

- [ ] **Step 4: Create `ConfirmBookingEndpoint.cs`** (Plan 04 will replace the body to wire MIPS)

```csharp
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class ConfirmBookingEndpoint
{
    public static RouteHandlerBuilder MapConfirmBooking(this IEndpointRouteBuilder app) =>
        app.MapPost("/api/bookings/confirm", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        [FromBody] ConfirmBookingRequest request,
        IUserContext userContext,
        BookingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            var dto = await service.ConfirmAsync(user.Id, request.BookingId, request.PaymentReference, ct);
            return Results.Ok(dto);
        }
        catch (KeyNotFoundException) { return Results.NotFound(); }
        catch (UnauthorizedAccessException) { return Results.Forbid(); }
        catch (InvalidOperationException ex)
        {
            return Results.Problem(statusCode: StatusCodes.Status409Conflict, title: ex.Message);
        }
    }
}
```

- [ ] **Step 5: Create `GetMyBookingsEndpoint.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class GetMyBookingsEndpoint
{
    public static RouteHandlerBuilder MapGetMyBookings(this IEndpointRouteBuilder app) =>
        app.MapGet("/api/bookings/mine", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        IUserContext userContext,
        BookingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var items = await service.GetMineAsync(user.Id, ct);
        return Results.Ok(items);
    }
}
```

- [ ] **Step 6: Create `GetListingBookingsEndpoint.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class GetListingBookingsEndpoint
{
    public static RouteHandlerBuilder MapGetListingBookings(this IEndpointRouteBuilder app) =>
        app.MapGet("/api/listings/{id:guid}/bookings", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        BookingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            var items = await service.GetForListingAsync(id, user.Id, ct);
            return Results.Ok(items);
        }
        catch (KeyNotFoundException) { return Results.NotFound(); }
        catch (UnauthorizedAccessException) { return Results.Forbid(); }
    }
}
```

- [ ] **Step 7: Create `CancelBookingEndpoint.cs`**

```csharp
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class CancelBookingEndpoint
{
    public static RouteHandlerBuilder MapCancelBooking(this IEndpointRouteBuilder app) =>
        app.MapPost("/api/bookings/{id:guid}/cancel", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        [FromBody] CancelBookingRequest request,
        IUserContext userContext,
        BookingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            var dto = await service.CancelAsync(user.Id, id, request.Reason, ct);
            return Results.Ok(dto);
        }
        catch (KeyNotFoundException) { return Results.NotFound(); }
        catch (UnauthorizedAccessException) { return Results.Forbid(); }
        catch (InvalidOperationException ex)
        {
            return Results.Problem(statusCode: StatusCodes.Status409Conflict, title: ex.Message);
        }
    }
}
```

- [ ] **Step 8: Create `CheckInBookingEndpoint.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class CheckInBookingEndpoint
{
    public static RouteHandlerBuilder MapCheckInBooking(this IEndpointRouteBuilder app) =>
        app.MapPost("/api/bookings/{id:guid}/checkin", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        BookingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            var dto = await service.CheckInAsync(user.Id, id, ct);
            return Results.Ok(dto);
        }
        catch (KeyNotFoundException) { return Results.NotFound(); }
        catch (UnauthorizedAccessException) { return Results.Forbid(); }
        catch (InvalidOperationException ex)
        {
            return Results.Problem(statusCode: StatusCodes.Status409Conflict, title: ex.Message);
        }
    }
}
```

- [ ] **Step 9: Create `GetAvailabilityEndpoint.cs`**

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class GetAvailabilityEndpoint
{
    public static RouteHandlerBuilder MapGetAvailability(this IEndpointRouteBuilder app) =>
        app.MapGet("/api/listings/{id:guid}/availability", HandleAsync).AllowAnonymous();

    private static async Task<IResult> HandleAsync(
        Guid id,
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        IValidator<AvailabilityRequest> validator,
        AvailabilityService service,
        CancellationToken ct)
    {
        var req = new AvailabilityRequest(from, to);
        var validation = await validator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var res = await service.CheckAsync(id, new DateRange(from, to), ct);
        return Results.Ok(res);
    }
}
```

- [ ] **Step 10: Create `GetCalendarEndpoint.cs`**

```csharp
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class GetCalendarEndpoint
{
    public static RouteHandlerBuilder MapGetCalendar(this IEndpointRouteBuilder app) =>
        app.MapGet("/api/listings/{id:guid}/calendar", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        [FromQuery] int year,
        [FromQuery] int month,
        IUserContext userContext,
        CalendarService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            var dto = await service.GetMonthAsync(id, user.Id, year, month, ct);
            return Results.Ok(dto);
        }
        catch (KeyNotFoundException) { return Results.NotFound(); }
        catch (UnauthorizedAccessException) { return Results.Forbid(); }
    }
}
```

- [ ] **Step 11: Create `BookingsModule.cs`**

```csharp
using FluentValidation;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Endpoints;
using Dodostays.Api.Modules.Bookings.Services;
using Dodostays.Api.Modules.Bookings.Validation;

namespace Dodostays.Api.Modules.Bookings;

public static class BookingsModule
{
    public static IServiceCollection AddBookingsModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<PricingService>();
        services.AddScoped<AvailabilityService>();
        services.AddScoped<BookingHoldService>();
        services.AddScoped<BookingService>();
        services.AddScoped<CalendarService>();

        services.AddScoped<IValidator<HoldBookingRequest>, HoldBookingValidator>();
        services.AddScoped<IValidator<AvailabilityRequest>, AvailabilityRequestValidator>();

        return services;
    }

    public static IEndpointRouteBuilder MapBookingsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapHoldBooking();
        app.MapConfirmBooking();
        app.MapGetMyBookings();
        app.MapGetListingBookings();
        app.MapCancelBooking();
        app.MapCheckInBooking();
        app.MapGetAvailability();
        app.MapGetCalendar();
        return app;
    }
}
```

- [ ] **Step 12: Modify `Program.cs`**

Read it. Add `using Dodostays.Api.Modules.Bookings;`. After `builder.Services.AddListingsModule(builder.Configuration);`, add `builder.Services.AddBookingsModule(builder.Configuration);`. After `app.MapListingsEndpoints();`, add `app.MapBookingsEndpoints();`.

- [ ] **Step 13: Build + smoke test**

```bash
cd C:/temp/Dodostays/api && dotnet build
```

Expected: 0 errors.

Start API, then:

```bash
curl -s "http://localhost:5080/api/listings/00000000-0000-0000-0000-000000000000/availability?from=2026-07-01&to=2026-07-05"
```

Expected: a JSON `AvailabilityResponse` with `isAvailable: true` and an empty `conflictingRanges` array (no listings/bookings yet for that ID — it just returns no conflicts; this is the expected stub response).

- [ ] **Step 14: Run all tests**

```bash
dotnet test
```

Expected: 98 prior + 22 new (DateRange + StateMachine) + 3 (PricingService) = 123+ passing.

- [ ] **Step 15: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "feat(bookings): 8 endpoints + validators + module wiring"
```

---

## Section A complete (Tasks 3.1 → 3.7)

After Section A, the backend supports the full booking lifecycle except payment capture (stubbed) and iCal sync (Section B). Tests: 22 unit (DateRange + StateMachine) + 3 unit (Pricing) + integration tests come in Task 3.8 below.

---

> **TODO** — Section B (iCal sync, Hangfire, integration tests) and Section C (Frontend booking flow + e2e + manual verification) follow in subsequent plan documents (`plan-03b-ical-sync.md`, `plan-03c-frontend-bookings.md`) so this file stays under reasonable size. Both sections are scoped:
>
> **Section B (Tasks 3.8 → 3.12):**
> - Task 3.8: Booking flow integration tests (hold + lifecycle + availability + calendar)
> - Task 3.9: Hangfire setup + `Hangfire.PostgreSql` storage + recurring 15-min sync job
> - Task 3.10: `Ical.Net` package, `IcalFeedParser`, `IcalFeedEmitter`, `SignedIcalUrlGenerator` + unit tests
> - Task 3.11: Inbound iCal sync — `ExternalCalendarFeed` CRUD endpoints + `IcalSyncJob` integration test against an in-memory iCal feed
> - Task 3.12: Outbound iCal feed endpoint `GET /ical/listings/{id}.ics?token=...` + integration test
>
> **Section C (Tasks 3.13 → 3.16):**
> - Task 3.13: Frontend `lib/bookings.ts` + `lib/dates.ts` + MUI date-range picker setup
> - Task 3.14: Listing detail page booking flow — date picker, price summary, hold button + countdown
> - Task 3.15: Host edit page calendar tab + external feed management
> - Task 3.16: Guest bookings dashboard at `/bookings` + Playwright e2e + manual verification
>
> Each follow-up section builds on Section A and is roughly 600-800 lines per file (this fits in one chunk per section).

---

## Plan 03 Section A — Definition of Done

- [ ] `Dodostays.Api.Contracts.Bookings` namespace with `BookingState`, `DateRange`, `CalendarDayStatus`, all DTOs
- [ ] `Bookings`, `BookingHolds`, `ExternalCalendarFeeds`, `ExternalCalendarBlocks` tables migrated
- [ ] Domain entities + `BookingStateMachine` covering 6 states with valid-transition table
- [ ] `PricingService` with VAT 15% computation
- [ ] `AvailabilityService` checks conflicts vs bookings + holds + external blocks
- [ ] `BookingHoldService` uses Postgres `pg_advisory_xact_lock` for race-safety
- [ ] `BookingService` (confirm/cancel/checkin/get/getMine/getForListing)
- [ ] `CalendarService` projects month-view of `Free/Held/BookedInternal/BookedExternal/Past`
- [ ] 8 endpoints registered via `BookingsModule` + Program.cs wiring
- [ ] Unit tests: 8 DateRange + 14 BookingStateMachine + 3 PricingService = 25 new
- [ ] Build clean; all prior 98 tests still pass
