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
