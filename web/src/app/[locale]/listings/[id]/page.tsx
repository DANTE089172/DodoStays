import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getListing, type Amenity } from "@/lib/listings";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PhotoGallery } from "@/components/listings/photo-gallery";
import { Section } from "@/components/marketing/section";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { DisplayHeading } from "@/components/marketing/display-heading";
import { Lede } from "@/components/marketing/lede";
import { pillButtonClasses } from "@/components/marketing/pill-button";
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

  const regionLabel = formatRegion(listing.region);
  const eyebrowText = `${regionLabel.toUpperCase()} · ${listing.propertyType.toUpperCase()}`;

  return (
    <>
      <SiteHeader />
      <main>
        {/* Photo carousel — edge-to-edge on mobile, contained on desktop. */}
        {galleryPhotos.length > 0 ? (
          <section className="w-full bg-[var(--color-sand)] sm:mx-auto sm:max-w-7xl sm:px-10 sm:pb-2 sm:pt-6">
            <PhotoGallery photos={galleryPhotos} aspectRatio="16/9" />
          </section>
        ) : null}

        {/* Title block — Section tone="sand" for editorial intro */}
        <Section tone="sand" size="sm">
          <div className="pb-4">
            <Link
              href="/listings"
              className="text-sm text-[var(--color-muted-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-primary)]"
            >
              &larr; All stays
            </Link>
          </div>
          <Eyebrow tone="peach">{eyebrowText}</Eyebrow>
          <DisplayHeading level={1} className="mt-4 max-w-4xl">
            {listing.title}
          </DisplayHeading>
          <p className="mt-6 text-sm text-[var(--color-muted-foreground)]">
            Hosted by{" "}
            <span className="font-medium text-[var(--color-foreground)]">
              {listing.hostDisplayName}
            </span>
            {listing.tier === "Verified" ? (
              <span className="ml-3 inline-flex items-center">
                <Eyebrow tone="peach">Verified host</Eyebrow>
              </span>
            ) : null}
          </p>

          {/* Stats row — tracked-caps Plex Sans, no boxes */}
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-[color-mix(in_srgb,var(--color-foreground)_15%,transparent)] py-8 sm:grid-cols-4">
            <Stat label="Bedrooms" value={listing.bedrooms} />
            <Stat label="Beds" value={listing.beds} />
            <Stat label="Bathrooms" value={listing.bathrooms} />
            <Stat label="Max guests" value={listing.maxGuests} />
          </dl>
        </Section>

        {/* About + amenities + sidebar grid */}
        <Section tone="cream" size="md">
          <div className="grid gap-16 lg:grid-cols-[3fr_2fr] lg:gap-20">
            <div className="min-w-0">
              <Eyebrow tone="muted">About this place</Eyebrow>
              <DisplayHeading level={2} className="mt-3">
                A stay shaped by{" "}
                <span className="italic">{regionLabel}</span>.
              </DisplayHeading>
              <Lede size="wide" className="mt-6 max-w-2xl">
                {firstParagraph(listing.description)}
              </Lede>
              {restParagraphs(listing.description).length > 0 ? (
                <div className="mt-6 max-w-2xl space-y-5 text-base leading-[1.75] text-[var(--color-foreground)]/85">
                  {restParagraphs(listing.description).map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>
              ) : null}

              {listing.amenities.length > 0 ? (
                <section className="mt-16">
                  <Eyebrow tone="muted">Amenities</Eyebrow>
                  <DisplayHeading level={3} className="mt-3">
                    What this place offers.
                  </DisplayHeading>
                  <ul className="mt-8 grid grid-cols-1 gap-x-10 gap-y-1 sm:grid-cols-2">
                    {listing.amenities.map((a) => (
                      <li
                        key={a}
                        className="flex items-center gap-3 border-b border-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)] py-3 text-sm text-[var(--color-foreground)]"
                      >
                        <Check
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-[var(--color-primary)]"
                          strokeWidth={2.25}
                        />
                        <span>{AMENITY_LABELS[a] ?? a}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <BookingSidebar
              listingId={listing.id}
              nightlyMur={listing.nightlyRateMur}
              cleaningMur={listing.cleaningFeeMur}
              maxGuests={listing.maxGuests}
              minStayNights={listing.minStayNights}
            />
          </div>
        </Section>

        {/* Host — cinema treatment */}
        <Section tone="ink" size="md">
          <div className="mx-auto flex max-w-3xl flex-col items-start gap-8 sm:flex-row sm:items-center">
            <div
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-primary)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] font-display text-3xl text-[var(--color-foreground)]"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 600' }}
            >
              {listing.hostDisplayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <Eyebrow tone="peach">Meet your host</Eyebrow>
              <DisplayHeading level={3} className="mt-3">
                {listing.hostDisplayName}
              </DisplayHeading>
              <p className="mt-4 max-w-xl text-base leading-[1.7] text-[var(--color-muted-foreground)]">
                A verified Mauritian host. Quick to reply and happy to point
                you toward the right beach, market, or sunset spot.
              </p>
              <div className="mt-6">
                <Link
                  href={`/listings/${listing.id}#message-host`}
                  className={pillButtonClasses({ variant: "ghost", size: "md" })}
                >
                  Message host
                </Link>
              </div>
            </div>
          </div>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="ds-eyebrow text-[var(--color-muted-foreground)]">
        {label}
      </dt>
      <dd
        className="mt-2 font-display text-2xl tracking-[-0.01em]"
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 600' }}
      >
        {value}
      </dd>
    </div>
  );
}

function firstParagraph(text: string): string {
  const idx = text.indexOf("\n\n");
  return idx === -1 ? text : text.slice(0, idx);
}

function restParagraphs(text: string): string[] {
  const idx = text.indexOf("\n\n");
  if (idx === -1) return [];
  return text
    .slice(idx + 2)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}
