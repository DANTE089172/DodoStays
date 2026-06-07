using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Payments;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Payments.Invoices;

namespace Dodostays.Api.Modules.Payments.Endpoints;

internal static class GetBookingInvoiceEndpoint
{
    public static RouteHandlerBuilder MapGetBookingInvoice(this IEndpointRouteBuilder app) =>
        app.MapGet("/api/bookings/{id:guid}/invoice", HandleAsync)
            .RequireAuthorization()
            .WithName("GetBookingInvoice");

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        DodostaysDbContext db,
        IInvoicePdfStorage invoicePdfStorage,
        ILogger<IResult> logger,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);

        // Load booking to check authorization
        var booking = await db.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id, ct);

        if (booking is null)
            return Results.NotFound();

        // Load listing to get host user ID
        var listing = await db.Listings
            .AsNoTracking()
            .Where(l => l.Id == booking.ListingId)
            .Select(l => new { l.HostUserId })
            .FirstOrDefaultAsync(ct);

        if (listing is null)
            return Results.NotFound();

        // Authorize: current user must be guest OR host
        if (booking.GuestUserId != user.Id && listing.HostUserId != user.Id)
            return Results.Forbid();

        // Find the GuestStay invoice for this booking
        var invoice = await db.Invoices
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.BookingId == id && i.Kind == InvoiceKind.GuestStay, ct);

        if (invoice is null)
            return Results.NotFound(new { message = "No invoice yet — booking may still be pending payment." });

        // Read PDF bytes
        var bytes = await invoicePdfStorage.ReadAsync(invoice.PdfStoragePath, ct);

        if (bytes is null)
        {
            logger.LogError("Invoice PDF file missing for invoice {InvoiceId} at path {Path}",
                invoice.Id, invoice.PdfStoragePath);
            return Results.Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Invoice file missing on disk");
        }

        return Results.File(bytes, "application/pdf", $"{invoice.Number}.pdf");
    }
}
