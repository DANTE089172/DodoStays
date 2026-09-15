namespace Dodostays.Api.Modules.Bookings.Services;

/// <summary>
/// Shared derivation of the per-listing Postgres advisory-lock key so the hold path and the
/// confirm path serialize on the SAME key. The lock is taken with pg_advisory_xact_lock and
/// released automatically at transaction end.
/// </summary>
internal static class BookingConcurrency
{
    public static long ListingLockKey(Guid listingId) =>
        unchecked(BitConverter.ToInt64(listingId.ToByteArray(), 0));
}
