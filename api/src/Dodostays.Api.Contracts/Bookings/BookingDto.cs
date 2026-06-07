using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Payments;

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
    string? CancellationReason,
    BookingPaymentSummaryDto? PaymentSummary);
