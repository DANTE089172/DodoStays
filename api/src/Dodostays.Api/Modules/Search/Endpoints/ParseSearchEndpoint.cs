using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Search;
using Dodostays.Api.Modules.Search.Services;

namespace Dodostays.Api.Modules.Search.Endpoints;

internal static class ParseSearchEndpoint
{
    public static RouteHandlerBuilder MapParseSearch(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/search/parse", HandleAsync).AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        [FromBody] SearchParseRequest request,
        IValidator<SearchParseRequest> validator,
        SearchOrchestrator orchestrator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());
        var response = await orchestrator.ParseAsync(request.Text, request.CurrentFilters, ct);
        return Results.Ok(response);
    }
}
