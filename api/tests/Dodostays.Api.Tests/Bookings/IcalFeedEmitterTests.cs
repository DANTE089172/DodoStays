using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Ical;

namespace Dodostays.Api.Tests.Bookings;

public class IcalFeedEmitterTests
{
    [Fact]
    public void Emit_produces_valid_ics_with_one_vevent_per_booking()
    {
        var emitter = new IcalFeedEmitter();
        var bookings = new List<EmittedBooking>
        {
            new(Guid.Parse("11111111-1111-1111-1111-111111111111"), "Sunny villa with pool",
                new DateOnly(2026, 7, 10), new DateOnly(2026, 7, 15), BookingState.Confirmed),
            new(Guid.Parse("22222222-2222-2222-2222-222222222222"), "Sunny villa with pool",
                new DateOnly(2026, 8, 1), new DateOnly(2026, 8, 5), BookingState.CheckedIn),
        };

        var ics = emitter.Emit("DodoStays — Sunny villa", bookings);

        ics.Should().Contain("BEGIN:VCALENDAR");
        ics.Should().Contain("END:VCALENDAR");
        ics.Should().Contain("PRODID:-//DodoStays//Booking Calendar//EN");
        ics.Should().Contain("11111111-1111-1111-1111-111111111111@dodostays");
        ics.Should().Contain("22222222-2222-2222-2222-222222222222@dodostays");
        var begins = System.Text.RegularExpressions.Regex.Matches(ics, "BEGIN:VEVENT");
        begins.Count.Should().Be(2);
    }

    [Fact]
    public void Emit_for_empty_returns_valid_calendar_with_no_vevents()
    {
        var emitter = new IcalFeedEmitter();
        var ics = emitter.Emit("DodoStays", Array.Empty<EmittedBooking>());
        ics.Should().Contain("BEGIN:VCALENDAR");
        ics.Should().Contain("END:VCALENDAR");
        ics.Should().NotContain("BEGIN:VEVENT");
    }
}
