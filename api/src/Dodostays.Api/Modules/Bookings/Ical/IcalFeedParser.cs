using Ical.Net;
using Ical.Net.CalendarComponents;

namespace Dodostays.Api.Modules.Bookings.Ical;

public sealed class IcalFeedParser
{
    public IReadOnlyList<ParsedIcalEvent> Parse(string icsContent)
    {
        var calendar = Calendar.Load(icsContent);
        var events = new List<ParsedIcalEvent>();
        foreach (var ev in calendar.Events ?? Enumerable.Empty<CalendarEvent>())
        {
            if (ev.Start is null || ev.End is null) continue;
            var checkIn = DateOnly.FromDateTime(ev.Start.Value);
            var checkOut = DateOnly.FromDateTime(ev.End.Value);
            if (checkOut <= checkIn) continue;
            events.Add(new ParsedIcalEvent(
                ExternalUid: string.IsNullOrEmpty(ev.Uid) ? Guid.NewGuid().ToString("N") : ev.Uid,
                CheckIn: checkIn,
                CheckOut: checkOut,
                Summary: ev.Summary));
        }
        return events;
    }
}

public readonly record struct ParsedIcalEvent(
    string ExternalUid,
    DateOnly CheckIn,
    DateOnly CheckOut,
    string? Summary);
