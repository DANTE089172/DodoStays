import Link from "next/link";
import { notFound } from "next/navigation";
import { getListing, type Amenity } from "@/lib/listings";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { WaveDivider } from "@/components/decorations/wave-divider";
import { PhotoGallery } from "@/components/listings/photo-gallery";
import { BookingSidebar } from "./booking-sidebar";

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

  const galleryPhotos = listing.photos.map((p) => ({
    url: p.publicUrl,
    caption: p.caption ?? listing.title,
  }));

  return (
    <>
      <SiteHeader />
      <main>
        {/* Photo carousel — edge-to-edge on mobile, contained on desktop. */}
        {galleryPhotos.length > 0 ? (
          <section className="w-full sm:mx-auto sm:max-w-7xl sm:px-10 sm:pb-2 sm:pt-6">
            <PhotoGallery photos={galleryPhotos} aspectRatio="16/9" />
          </section>
        ) : null}

        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <div className="pt-6">
            <Link
              href="/listings"
              className="text-sm text-[var(--color-muted-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-accent)]"
            >
              &larr; All stays
            </Link>
          </div>

          {/* Title block — editorial Mauritius, NOT overlaying the hero */}
          <section className="pt-8 sm:pt-10">
            <p className="font-script text-2xl text-[var(--color-ochre)]">
              {formatRegion(listing.region)}
            </p>
            <h1 className="mt-1 max-w-4xl font-display text-4xl leading-[1.05] tracking-[-0.02em] sm:text-6xl">
              {listing.title}
            </h1>
          </section>

          <div className="grid gap-16 pt-10 lg:grid-cols-[3fr_2fr] lg:gap-20">
            {/* Left column */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{listing.propertyType}</Badge>
                {listing.tier === "Verified" && (
                  <span className="border-[1.5px] border-[var(--color-cane)] px-2.5 font-script text-base text-[var(--color-cane)]">
                    verified host
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                Hosted by{" "}
                <span className="font-medium text-[var(--color-foreground)]">
                  {listing.hostDisplayName}
                </span>
              </p>

              {/* Stats — row */}
              <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-y-[1.5px] border-[var(--color-ochre)] py-6 sm:grid-cols-4">
                <Stat label="Bedrooms" value={listing.bedrooms} />
                <Stat label="Beds" value={listing.beds} />
                <Stat label="Bathrooms" value={listing.bathrooms} />
                <Stat label="Max guests" value={listing.maxGuests} />
              </dl>

              {/* Wave divider */}
              <div className="mt-16">
                <WaveDivider />
              </div>

              {/* About */}
              <section className="mt-12">
                <h2 className="font-display text-3xl leading-[1.1] tracking-[-0.02em] sm:text-4xl">
                  About this place.
                </h2>
                <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-[1.75] text-[var(--color-foreground)]/90">
                  {listing.description}
                </p>
              </section>

              {listing.amenities.length > 0 && (
                <>
                  <div className="mt-16">
                    <WaveDivider />
                  </div>
                  <section className="mt-12">
                    <h2 className="font-display text-3xl leading-[1.1] tracking-[-0.02em] sm:text-4xl">
                      What this place offers.
                    </h2>
                    <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      {listing.amenities.map((a) => (
                        <li
                          key={a}
                          className="flex items-center gap-3 border-b-[1.5px] border-[var(--color-border)] py-2.5 text-[var(--color-foreground)]"
                        >
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 rounded-full bg-[var(--color-ochre)]"
                          />
                          <span>{AMENITY_LABELS[a] ?? a}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              )}

              {/* Wave divider */}
              <div className="mt-16">
                <WaveDivider />
              </div>

              {/* Host */}
              <section className="mt-12">
                <h2 className="font-display text-3xl leading-[1.1] tracking-[-0.02em] sm:text-4xl">
                  Your host.
                </h2>
                <div className="mt-6 flex items-center gap-5">
                  <div
                    aria-hidden="true"
                    className="flex h-16 w-16 shrink-0 items-center justify-center border-[1.5px] border-[var(--color-ochre)] bg-[var(--color-sand)] font-display text-2xl text-[var(--color-foreground)]"
                  >
                    {listing.hostDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-display text-xl tracking-[-0.01em]">
                      {listing.hostDisplayName}
                    </p>
                    <p className="font-script text-base text-[var(--color-cane)]">
                      verified Mauritian host
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <BookingSidebar
              listingId={listing.id}
              nightlyMur={listing.nightlyRateMur}
              cleaningMur={listing.cleaningFeeMur}
              maxGuests={listing.maxGuests}
              minStayNights={listing.minStayNights}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="font-script text-base text-[var(--color-ochre)]">
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl tracking-[-0.01em]">{value}</dd>
    </div>
  );
}
