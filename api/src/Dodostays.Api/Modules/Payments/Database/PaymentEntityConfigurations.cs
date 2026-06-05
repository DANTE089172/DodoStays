using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Payments.Domain;

namespace Dodostays.Api.Modules.Payments.Database;

internal static class PaymentEntityConfigurations
{
    public static void Apply(ModelBuilder modelBuilder)
    {
        // Postgres sequences for gapless invoice numbering (one per InvoiceKind).
        modelBuilder.HasSequence<long>("inv_guest_seq").StartsAt(1).IncrementsBy(1);
        modelBuilder.HasSequence<long>("inv_commission_seq").StartsAt(1).IncrementsBy(1);
        modelBuilder.HasSequence<long>("inv_credit_note_seq").StartsAt(1).IncrementsBy(1);

        modelBuilder.Entity<PaymentRecord>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.ProcessorId).IsRequired().HasMaxLength(64);
            b.Property(x => x.ExternalRef).IsRequired().HasMaxLength(128);
            b.Property(x => x.AmountMur).HasPrecision(18, 2);
            b.Property(x => x.Status).HasConversion<int>();
            b.Property(x => x.FailureReason).HasMaxLength(512);
            b.Property(x => x.RawPayloadJson).HasColumnType("jsonb");

            // No FK navigation enforced; the Booking nav is read-only.
            b.Ignore(x => x.Booking);

            b.HasIndex(x => x.BookingId);
        });

        modelBuilder.Entity<HostPayout>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.HostUserId).IsRequired();
            b.Property(x => x.BookingIds).HasColumnType("uuid[]");
            b.Property(x => x.TotalGrossMur).HasPrecision(18, 2);
            b.Property(x => x.CommissionMur).HasPrecision(18, 2);
            b.Property(x => x.NetMur).HasPrecision(18, 2);
            b.Property(x => x.Status).HasConversion<int>();
            b.Property(x => x.ExternalRef).HasMaxLength(128);
            b.Property(x => x.ProcessorId).IsRequired().HasMaxLength(64);
            b.Property(x => x.FailureReason).HasMaxLength(512);

            b.HasIndex(x => x.HostUserId);
        });

        modelBuilder.Entity<Invoice>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Number).IsRequired().HasMaxLength(32);
            b.Property(x => x.Kind).HasConversion<int>();
            b.Property(x => x.IssuedToDisplayName).IsRequired().HasMaxLength(200);
            b.Property(x => x.IssuedToVatNumber).HasMaxLength(32);
            b.Property(x => x.GrossMur).HasPrecision(18, 2);
            b.Property(x => x.VatMur).HasPrecision(18, 2);
            b.Property(x => x.NetMur).HasPrecision(18, 2);
            b.Property(x => x.PdfStoragePath).IsRequired().HasMaxLength(512);

            b.HasIndex(x => x.Number).IsUnique();
            b.HasIndex(x => x.BookingId);
        });

        modelBuilder.Entity<IdempotencyKey>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.KeyHash).IsRequired().HasMaxLength(128);
            b.Property(x => x.Scope).IsRequired().HasMaxLength(64);
            b.Property(x => x.ResponseBodyJson).IsRequired().HasColumnType("jsonb");
            b.Property(x => x.HttpStatusCode);

            b.HasIndex(x => x.KeyHash).IsUnique();
            b.HasIndex(x => x.ExpiresAt);
        });
    }
}
