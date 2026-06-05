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
