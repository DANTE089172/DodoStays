"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Stack } from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import {
  deletePhoto,
  getMyListings,
  publishListing,
  unpublishListing,
  updateListing,
  uploadPhoto,
  type Listing,
} from "@/lib/listings";
import { ListingForm } from "../../listing-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalFeedList } from "@/components/bookings/external-feed-list";
import { CopyIcalUrlCard } from "@/components/bookings/copy-ical-url-card";
import { Section } from "@/components/marketing/section";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { DisplayHeading } from "@/components/marketing/display-heading";
import { PillButton, pillButtonClasses } from "@/components/marketing/pill-button";
import { cn } from "@/lib/utils";

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, accessToken, loading } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    getMyListings(accessToken)
      .then((all) => setListing(all.find((l) => l.id === id) ?? null))
      .catch((e) => setError((e as Error).message));
  }, [accessToken, id]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-sm text-[var(--color-muted-foreground)]">
        Loading…
      </main>
    );
  }

  if (!listing) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-6 py-16 text-sm text-[var(--color-muted-foreground)] sm:px-10">
          Listing not found.
        </main>
      </>
    );
  }

  async function onPhoto(file: File) {
    if (!accessToken) return;
    setUploading(true);
    try {
      const photo = await uploadPhoto(accessToken, id, file, photoCaption || undefined);
      setListing((l) => l ? { ...l, photos: [...l.photos, photo] } : l);
      setPhotoCaption("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(photoId: string) {
    if (!accessToken) return;
    try {
      await deletePhoto(accessToken, id, photoId);
      setListing((l) => l ? { ...l, photos: l.photos.filter((p) => p.id !== photoId) } : l);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function togglePublish() {
    if (!accessToken || !listing) return;
    try {
      const updated = listing.status === "Published"
        ? await unpublishListing(accessToken, listing.id)
        : await publishListing(accessToken, listing.id);
      setListing(updated);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <SiteHeader />

      <Section tone="cream" size="sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/host/listings"
            className="text-sm text-[var(--color-muted-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-foreground)]"
          >
            &larr; Back to my listings
          </Link>
          <span
            className={cn(
              "ds-eyebrow inline-flex items-center rounded-full border-[1.5px] px-2.5 py-1",
              listing.status === "Published"
                ? "border-[var(--color-cane)] text-[var(--color-cane)]"
                : "border-[var(--color-ochre)] text-[var(--color-ochre)]",
            )}
          >
            {listing.status}
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Eyebrow>Edit listing</Eyebrow>
            <DisplayHeading level={2} className="mt-3 break-words">
              {listing.title || "Untitled listing"}
            </DisplayHeading>
            <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
              {listing.region} &middot; {listing.propertyType}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/listings/${listing.id}`}
              className={pillButtonClasses({ variant: "ghost", size: "sm" })}
            >
              View public
            </Link>
            <PillButton onClick={togglePublish} variant="solid" size="sm">
              {listing.status === "Published" ? "Unpublish" : "Publish"}
            </PillButton>
          </div>
        </div>
      </Section>

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
        {error && (
          <p
            role="alert"
            className="mb-6 rounded-md border border-[color-mix(in_srgb,var(--color-destructive)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-destructive)_5%,transparent)] px-4 py-3 text-sm text-[var(--color-destructive)]"
          >
            {error}
          </p>
        )}

        {/* Photos gallery editor */}
        <section className="space-y-6">
          <header>
            <Eyebrow tone="muted">Photos</Eyebrow>
            <DisplayHeading level={3} className="mt-2">
              Photos
            </DisplayHeading>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              The first photo is the cover guests see on browse pages. Add at
              least one before you publish.
            </p>
          </header>
          <div>
            {listing.photos.length === 0 ? (
              <div className="mb-6 rounded-lg border border-dashed border-[color-mix(in_srgb,var(--color-foreground)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-muted)_40%,transparent)] px-6 py-16 text-center">
                <p className="font-[var(--font-display)] text-xl font-semibold">
                  No photos yet.
                </p>
                <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                  JPEG, PNG, WebP or HEIC.
                </p>
              </div>
            ) : (
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {listing.photos.map((p, i) => (
                  <figure
                    key={p.id}
                    className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)] bg-[var(--color-muted)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.publicUrl}
                      alt={p.caption ?? ""}
                      className="h-full w-full object-cover transition-opacity duration-200 ease-out group-hover:opacity-90"
                    />
                    {i === 0 && (
                      <span className="ds-eyebrow pointer-events-none absolute left-2 top-2 inline-flex items-center rounded-full bg-[var(--color-primary)] px-2 py-1 text-[var(--color-primary-foreground)]">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      className="ds-eyebrow absolute right-2 top-2 inline-flex h-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-card)_95%,transparent)] px-2.5 text-[var(--color-destructive)] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label="Remove photo"
                    >
                      Remove
                    </button>
                    {p.caption && (
                      <figcaption className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-[var(--color-foreground)]/75 to-transparent px-3 py-2 text-xs text-[var(--color-sand)]">
                        {p.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="photo-caption">Caption (optional)</Label>
                <Input
                  id="photo-caption"
                  type="text"
                  placeholder="Sunset over the lagoon"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                />
              </div>
              <label
                className={cn(
                  pillButtonClasses({ variant: "ghost", size: "md" }),
                  "cursor-pointer",
                  uploading && "pointer-events-none opacity-60",
                )}
              >
                {uploading ? "Uploading…" : "Upload photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPhoto(f);
                  }}
                />
              </label>
            </div>
          </div>
        </section>

        {/* Channels — external iCal feeds */}
        <section className="mt-16 space-y-6">
          <header>
            <Eyebrow tone="muted">Channels</Eyebrow>
            <DisplayHeading level={3} className="mt-2">
              Channels
            </DisplayHeading>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Sync your calendar with Airbnb, Booking.com and others so the
              same dates stay blocked everywhere.
            </p>
          </header>
          <Stack spacing={3}>
            <CopyIcalUrlCard listingId={listing.id} />
            <ExternalFeedList listingId={listing.id} />
          </Stack>
        </section>

        {/* Details form */}
        <section className="mt-16 border-t border-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)] pt-12">
          <ListingForm
            submitLabel="Save changes"
            initial={{
              title: listing.title,
              description: listing.description,
              propertyType: listing.propertyType,
              region: listing.region,
              addressLine: listing.addressLine,
              latitude: listing.latitude,
              longitude: listing.longitude,
              bedrooms: listing.bedrooms,
              beds: listing.beds,
              bathrooms: listing.bathrooms,
              maxGuests: listing.maxGuests,
              nightlyRateMur: listing.nightlyRateMur,
              cleaningFeeMur: listing.cleaningFeeMur,
              minStayNights: listing.minStayNights,
              amenities: listing.amenities,
            }}
            onSubmit={async (input) => {
              if (!accessToken) throw new Error("Not authenticated");
              const updated = await updateListing(accessToken, listing.id, input);
              setListing(updated);
            }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
