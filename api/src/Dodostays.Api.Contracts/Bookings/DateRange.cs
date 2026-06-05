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
