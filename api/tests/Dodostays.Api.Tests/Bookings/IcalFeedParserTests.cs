using Xunit;
using FluentAssertions;
using Dodostays.Api.Modules.Bookings.Ical;

namespace Dodostays.Api.Tests.Bookings;

public class IcalFeedParserTests
{
    private const string SampleIcs = """
        BEGIN:VCALENDAR
        PRODID:-//Airbnb Inc//Hosting Calendar 0.8.8//EN
        VERSION:2.0
        CALSCALE:GREGORIAN
        BEGIN:VEVENT
        DTSTAMP:20260315T101010Z
        UID:abc-123@airbnb.com
        DTSTART;VALUE=DATE:20260710
        DTEND;VALUE=DATE:20260715
        SUMMARY:Reserved
        END:VEVENT
        BEGIN:VEVENT
        DTSTAMP:20260315T101010Z
        UID:def-456@airbnb.com
        DTSTART;VALUE=DATE:20260801
        DTEND;VALUE=DATE:20260805
        SUMMARY:Airbnb (Not available)
        END:VEVENT
        END:VCALENDAR
        """;

    [Fact]
    public void Parse_returns_two_events()
    {
        var parser = new IcalFeedParser();
        var events = parser.Parse(SampleIcs);
        events.Should().HaveCount(2);
        events[0].ExternalUid.Should().Be("abc-123@airbnb.com");
        events[0].CheckIn.Should().Be(new DateOnly(2026, 7, 10));
        events[0].CheckOut.Should().Be(new DateOnly(2026, 7, 15));
        events[0].Summary.Should().Be("Reserved");
        events[1].ExternalUid.Should().Be("def-456@airbnb.com");
    }

    [Fact]
    public void Parse_returns_empty_list_for_empty_calendar()
    {
        var parser = new IcalFeedParser();
        var events = parser.Parse("BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR");
        events.Should().BeEmpty();
    }

    [Fact]
    public void Parse_throws_on_garbage_input()
    {
        var parser = new IcalFeedParser();
        Action act = () => parser.Parse("not an iCal feed");
        act.Should().Throw<Exception>();
    }
}
