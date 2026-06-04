import Link from "next/link";
import { notFound } from "next/navigation";
import { getListing, type Amenity } from "@/lib/listings";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

const AMENITY_LABELS: Record<Amenity, string> = {
  Pool: "Pool",
  BeachAccess: "Beach access",
  AirCon: "Air conditioning",
  Wifi: "Wi-Fi",
  Kitchen: "Kitchen",
  Parking: "Parking",
  Tv: "TV",
  WashingMachine: "Washing machine",
  Balcony: "Balcony",
  Garden: "Garden",
  Bbq: "BBQ",
  Generator: "Generator",
};

const AMENITY_ICONS: Record<Amenity, string> = {
  Pool: "🏊",
  BeachAccess: "🏖️",
  AirCon: "❄️",
  Wifi: "📶",
  Kitchen: "🍳",
  Parking: "🅿️",
  Tv: "📺",
  WashingMachine: "🧺",
  Balcony: "🌅",
  Garden: "🌿",
  Bbq: "🔥",
  Generator: "⚡",
};

function formatRegion(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing;
  try {
    listing = await getListing(id);
  } catch {
    notFound();
  }

  const heroPhoto = listing.photos[0];
  const restPhotos = listing.photos.slice(1, 5);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4">
          <Link
            href="/listings"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]"
          >
            <span aria-hidden="true">←</span> All listings
          </Link>
        </div>

        {/* Hero gallery */}
        {listing.photos.length > 0 && (
          <div className="mb-8 grid gap-2 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2">
            {heroPhoto && (
              <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-muted)] sm:col-span-2 sm:row-span-2 sm:aspect-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroPhoto.publicUrl}
                  alt={heroPhoto.caption ?? listing.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            {restPhotos.map((p) => (
              <div
                key={p.id}
                className="relative hidden aspect-[4/3] overflow-hidden bg-[var(--color-muted)] sm:block sm:aspect-auto"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.publicUrl}
                  alt={p.caption ?? listing.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Title + layout */}
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{listing.propertyType}</Badge>
              {listing.tier === "Verified" && <Badge>✓ Verified host</Badge>}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {listing.title}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {formatRegion(listing.region)} · Hosted by{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {listing.hostDisplayName}
              </span>
            </p>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Bedrooms" value={listing.bedrooms} />
              <Stat label="Beds" value={listing.beds} />
              <Stat label="Bathrooms" value={listing.bathrooms} />
              <Stat label="Max guests" value={listing.maxGuests} />
            </div>

            <Separator className="my-8" />

            {/* About */}
            <section>
              <h2 className="text-xl font-semibold">About this place</h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[var(--color-foreground)]/90">
                {listing.description}
              </p>
            </section>

            {listing.amenities.length > 0 && (
              <>
                <Separator className="my-8" />
                <section>
                  <h2 className="text-xl font-semibold">What this place offers</h2>
                  <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {listing.amenities.map((a) => (
                      <li
                        key={a}
                        className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-sm"
                      >
                        <span aria-hidden="true" className="text-base">
                          {AMENITY_ICONS[a] ?? "·"}
                        </span>
                        <span>{AMENITY_LABELS[a] ?? a}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}

            <Separator className="my-8" />

            {/* Host card */}
            <section>
              <h2 className="text-xl font-semibold">Your host</h2>
              <Card className="mt-4">
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-base font-semibold text-[var(--color-primary-foreground)]"
                  >
                    {listing.hostDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{listing.hostDisplayName}</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      Verified Mauritian host on DodoStays
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sticky booking sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="shadow-md">
              <CardContent className="p-6">
                <p className="text-3xl font-bold">
                  MUR {listing.nightlyRateMur.toLocaleString()}
                  <span className="text-sm font-normal text-[var(--color-muted-foreground)]">
                    {" "}/ night
                  </span>
                </p>

                <div className="mt-5 space-y-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/40 p-4 text-sm">
                  <Row
                    label={`Cleaning fee`}
                    value={`MUR ${listing.cleaningFeeMur.toLocaleString()}`}
                  />
                  <Row
                    label="Min stay"
                    value={`${listing.minStayNights} night${listing.minStayNights === 1 ? "" : "s"}`}
                  />
                  <Row label="Max guests" value={String(listing.maxGuests)} />
                </div>

                <button
                  type="button"
                  disabled
                  className="mt-5 inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white opacity-60"
                >
                  Reserve
                </button>

                <div className="mt-4 flex items-center justify-center">
                  <Badge variant="accent" className="text-[11px]">
                    Booking will be available soon
                  </Badge>
                </div>

                <p className="mt-4 text-center text-xs text-[var(--color-muted-foreground)]">
                  No charges until you book.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center">
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span className="font-medium text-[var(--color-foreground)]">{value}</span>
    </div>
  );
}
