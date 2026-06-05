using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Payments.Domain;

namespace Dodostays.Api.Modules.Common.Database;

public partial class DodostaysDbContext
{
    public DbSet<PaymentRecord> PaymentRecords => Set<PaymentRecord>();
    public DbSet<HostPayout> HostPayouts => Set<HostPayout>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<IdempotencyKey> IdempotencyKeys => Set<IdempotencyKey>();

    private static void OnModelCreatingPayments(ModelBuilder modelBuilder)
    {
        Modules.Payments.Database.PaymentEntityConfigurations.Apply(modelBuilder);
    }
}

/// <summary>
/// Public test hook so the unit-test project can apply Payments configuration to a minimal
/// isolated DbContext without taking a dependency on the full <see cref="DodostaysDbContext"/>
/// (which uses PostGIS-only column types incompatible with the in-memory provider).
/// Not intended for production use.
/// </summary>
public static class PaymentsConfigurationTestHook
{
    public static void Invoke(ModelBuilder modelBuilder)
        => Modules.Payments.Database.PaymentEntityConfigurations.Apply(modelBuilder);
}
