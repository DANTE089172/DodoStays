"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { deletePhoto, getMyListings, publishListing, unpublishListing, updateListing, uploadPhoto, type Listing } from "@/lib/listings";
import { ListingForm } from "../../listing-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlagDivider } from "@/components/decorations/flag-divider";

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

  if (loading || !user)
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-sm text-[var(--color-muted-foreground)]">
        Loading…
      </main>
    );
  if (!listing)
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-6 py-16 text-sm text-[var(--color-muted-foreground)] sm:px-10">
          Listing not found.
        </main>
      </>
    );

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
      <main className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/host/listings"
            className="text-sm text-[var(--color-muted-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-accent)]"
          >
            &larr; Back to my listings
          </Link>
          <span
            className={`inline-flex items-center border-[1.5px] px-2.5 font-script text-base ${
              listing.status === "Published"
                ? "border-[var(--color-cane)] text-[var(--color-cane)]"
                : "border-[var(--color-ochre)] text-[var(--color-ochre)]"
            }`}
          >
            {listing.status}
          </span>
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-6 pb-10">
          <div>
            <p className="font-script text-2xl text-[var(--color-ochre)]">
              edit lakaz
            </p>
            <h1 className="mt-1 font-display text-5xl leading-[1.05] tracking-[-0.02em] sm:text-6xl">
              {listing.title || "Untitled listing"}
            </h1>
            <p className="mt-3 font-script text-lg text-[var(--color-ochre)]">
              {listing.region} · {listing.propertyType}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/listings/${listing.id}`}>
              <Button variant="outline">View public</Button>
            </Link>
            <Button onClick={togglePublish} className="shadow-block">
              {listing.status === "Published" ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>
        <FlagDivider />

        {error && (
          <p
            role="alert"
            className="mt-6 border-[1.5px] border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/5 px-4 py-3 text-sm text-[var(--color-destructive)]"
          >
            {error}
          </p>
        )}

        {/* Photos gallery editor */}
        <section className="mt-14 space-y-8">
          <FlagDivider />
          <div className="grid gap-8 md:grid-cols-[260px_1fr] md:gap-12">
            <div>
              <p className="font-script text-2xl italic text-[var(--color-ochre)]">
                bann foto
              </p>
              <h2 className="mt-1 font-display text-3xl tracking-[-0.01em]">
                Photos
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                The first photo is the cover guests see on browse pages. Add
                at least one before you publish.
              </p>
            </div>
            <div>
              {listing.photos.length === 0 ? (
                <div className="mb-6 border-[1.5px] border-dashed border-[var(--color-ochre)] bg-[var(--color-muted)]/40 px-6 py-16 text-center">
                  <p className="font-display text-xl">No photos yet.</p>
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                    JPEG, PNG, WebP or HEIC.
                  </p>
                </div>
              ) : (
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {listing.photos.map((p, i) => (
                    <figure
                      key={p.id}
                      className="group relative aspect-[4/3] overflow-hidden border-[1.5px] border-[var(--color-ochre)] bg-[var(--color-muted)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.publicUrl}
                        alt={p.caption ?? ""}
                        className="photo-warm h-full w-full object-cover transition-opacity duration-200 ease-out group-hover:opacity-90"
                      />
                      {i === 0 && (
                        <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center bg-[var(--color-flamboyant)] px-2 py-0.5 font-script text-base text-[var(--color-sand)]">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        className="absolute right-2 top-2 inline-flex h-7 items-center justify-center bg-[var(--color-card)]/95 px-2.5 font-script text-base text-[var(--color-flamboyant)] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label="Remove photo"
                      >
                        remove
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
                  className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[2px] border-[1.5px] border-[var(--color-primary)] bg-transparent px-5 text-sm font-medium text-[var(--color-primary)] transition-colors duration-200 ease-out hover:bg-[var(--color-primary)] hover:text-[var(--color-sand)] ${uploading ? "pointer-events-none opacity-60" : ""}`}
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
          </div>
        </section>

        {/* Details form */}
        <section className="mt-20 border-t-[1.5px] border-[var(--color-ochre)] pt-14">
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
