namespace Dodostays.Api.Contracts.Identity;

public interface IUserContext
{
    Guid? CurrentUserId { get; }
    Task<UserDto?> GetCurrentUserAsync(CancellationToken ct = default);
    Task<UserDto> RequireUserAsync(CancellationToken ct = default);
}
