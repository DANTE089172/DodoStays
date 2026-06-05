using System.Text;
using Dodostays.Api.Contracts.Bookings;

namespace Dodostays.Api.Modules.Bookings.Ical;

public sealed class IcalFeedEmitter
{
    public string Emit(string calendarName, IReadOnlyList<EmittedBooking> bookings)
    {
        var now = DateTime.UtcNow;
        var sb = new StringBuilder();
        sb.AppendLine("BEGIN:VCALENDAR");
        sb.AppendLine("PRODID:-//DodoStays//Booking Calendar//EN");
        sb.AppendLine("VERSION:2.0");
        sb.AppendLine("CALSCALE:GREGORIAN");
        sb.AppendLine("METHOD:PUBLISH");
        sb.AppendLine($"X-WR-CALNAME:{Escape(calendarName)}");
        foreach (var b in bookings)
        {
            sb.AppendLine("BEGIN:VEVENT");
            sb.AppendLine($"DTSTAMP:{now:yyyyMMddTHHmmssZ}");
            sb.AppendLine($"UID:{b.BookingId}@dodostays");
            sb.AppendLine($"DTSTART;VALUE=DATE:{b.CheckIn:yyyyMMdd}");
            sb.AppendLine($"DTEND;VALUE=DATE:{b.CheckOut:yyyyMMdd}");
            sb.AppendLine($"SUMMARY:{Escape($"DodoStays — {StateLabel(b.State)}")}");
            sb.AppendLine("STATUS:CONFIRMED");
            sb.AppendLine("TRANSP:OPAQUE");
            sb.AppendLine("END:VEVENT");
        }
        sb.AppendLine("END:VCALENDAR");
        return sb.ToString();
    }

    private static string Escape(string? s) =>
        (s ?? string.Empty)
            .Replace("\\", "\\\\")
            .Replace(";", "\\;")
            .Replace(",", "\\,")
            .Replace("\r\n", "\\n")
            .Replace("\n", "\\n");

    private static string StateLabel(BookingState s) => s switch
    {
        BookingState.PendingPayment => "Pending",
        BookingState.Confirmed => "Confirmed",
        BookingState.CheckedIn => "Checked in",
        BookingState.Completed => "Completed",
        _ => s.ToString()
    };
}

public readonly record struct EmittedBooking(
    Guid BookingId,
    string ListingTitle,
    DateOnly CheckIn,
    DateOnly CheckOut,
    BookingState State);
