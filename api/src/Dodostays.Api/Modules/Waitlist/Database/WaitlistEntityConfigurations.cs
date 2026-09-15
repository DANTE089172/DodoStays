using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Waitlist.Domain;

namespace Dodostays.Api.Modules.Waitlist.Database;

internal static class WaitlistEntityConfigurations
{
    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WaitlistSignup>(b =>
        {
            b.ToTable("waitlist_signups");
            b.HasKey(w => w.Id);
            b.Property(w => w.Email).IsRequired().HasMaxLength(320);
            b.Property(w => w.Audience).HasConversion<int>();
            b.Property(w => w.Name).HasMaxLength(200);
            b.Property(w => w.Region).HasMaxLength(120);
            b.Property(w => w.Message).HasMaxLength(2000);
            b.Property(w => w.Locale).HasMaxLength(16);
            b.Property(w => w.Source).HasMaxLength(500);

            // A person can be on the list once per audience (traveller AND host),
            // but not twice for the same audience — keeps the join idempotent.
            b.HasIndex(w => new { w.Email, w.Audience }).IsUnique();
            b.HasIndex(w => w.CreatedAt);
        });
    }
}
