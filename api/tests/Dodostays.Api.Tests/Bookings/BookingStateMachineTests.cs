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
