using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class CreateListingEndpoint
{
    public static RouteHandlerBuilder MapCreateListing(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/listings", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        [FromBody] CreateListingRequest request,
        IValidator<CreateListingRequest> validator,
        IUserContext userContext,
        ListingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var dto = await service.CreateAsync(user.Id, request, ct);
        return Results.Created($"/api/listings/{dto.Id}", dto);
    }
}
