using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Modules.Search.DriveTime;

public interface IDriveTimeService
{
    /// <summary>
    /// Returns minimum estimated drive time (minutes) from origin to nearest anchor.
    /// Returns int.MaxValue when no anchors are supplied.
    /// </summary>
    Task<int> EstimateMinutesAsync(double originLat, double originLng, IReadOnlyList<Anchor> anchors, CancellationToken ct);
}
