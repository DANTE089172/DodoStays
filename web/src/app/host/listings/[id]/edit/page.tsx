"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { deletePhoto, getMyListings, publishListing, unpublishListing, updateListing, uploadPhoto, type Listing } from "@/lib/listings";
import { ListingForm } from "../../listing-form";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <main className="mx-auto max-w-3xl px-4 py-12 text-sm text-[var(--color-muted-foreground)]">
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
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/host/listings"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]"
          >
            <span aria-hidden="true">←</span> Back to my listings
          </Link>
          <Badge variant={listing.status === "Published" ? "success" : "muted"}>
            {listing.status}
          </Badge>
        </div>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]">
              Edit listing
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {listing.title || "Untitled listing"}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {listing.region} · {listing.propertyType}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/listings/${listing.id}`}>
              <Button variant="outline">View public</Button>
            </Link>
            <Button onClick={togglePublish}>
              {listing.status === "Published" ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {/* Photos gallery editor */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Photos</CardTitle>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              The first photo is shown on browse cards. Add at least one before you publish.
            </p>
          </CardHeader>
          <CardContent>
            {listing.photos.length === 0 ? (
              <div className="mb-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/40 px-6 py-12 text-center">
                <span aria-hidden="true" className="text-2xl">📸</span>
                <p className="text-sm font-medium">No photos yet</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Upload a photo below — JPEG, PNG, WebP or HEIC.
                </p>
              </div>
            ) : (
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {listing.photos.map((p, i) => (
                  <figure
                    key={p.id}
                    className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--color-muted)] shadow-sm ring-1 ring-[var(--color-border)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.publicUrl}
                      alt={p.caption ?? ""}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {i === 0 && (
                      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-600 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label="Remove photo"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                    {p.caption && (
                      <figcaption className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/65 to-transparent px-3 py-2 text-xs text-white">
                        {p.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1.5">
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
                className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[var(--color-primary)] bg-[var(--color-primary)]/5 px-4 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10 ${uploading ? "pointer-events-none opacity-60" : ""}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
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
          </CardContent>
        </Card>

        {/* Details form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Update what guests see on the listing page.
            </p>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </main>
    </>
  );
}
