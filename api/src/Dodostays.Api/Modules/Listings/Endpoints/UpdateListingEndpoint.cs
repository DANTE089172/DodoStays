using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class UpdateListingEndpoint
{
    public static RouteHandlerBuilder MapUpdateListing(this IEndpointRouteBuilder app)
    {
        return app.MapPut("/api/listings/{id:guid}", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        [FromBody] UpdateListingRequest request,
        IValidator<UpdateListingRequest> validator,
        IUserContext userContext,
        ListingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        try
        {
            var dto = await service.UpdateAsync(user.Id, id, request, ct);
            return Results.Ok(dto);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
    }
}
