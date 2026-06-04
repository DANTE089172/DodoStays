"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { deletePhoto, getMyListings, publishListing, unpublishListing, updateListing, uploadPhoto, type Listing } from "@/lib/listings";
import { ListingForm } from "../../listing-form";

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, accessToken, loading } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    getMyListings(accessToken)
      .then((all) => setListing(all.find((l) => l.id === id) ?? null))
      .catch((e) => setError((e as Error).message));
  }, [accessToken, id]);

  if (loading || !user) return <main className="p-8">Loading…</main>;
  if (!listing) return <main className="p-8">Listing not found.</main>;

  async function onPhoto(file: File) {
    if (!accessToken) return;
    try {
      const photo = await uploadPhoto(accessToken, id, file, photoCaption || undefined);
      setListing((l) => l ? { ...l, photos: [...l.photos, photo] } : l);
      setPhotoCaption("");
    } catch (e) {
      setError((e as Error).message);
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
    const updated = listing.status === "Published"
      ? await unpublishListing(accessToken, listing.id)
      : await publishListing(accessToken, listing.id);
    setListing(updated);
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/host/listings" className="text-sm underline">← Back</Link>
        <span className={`rounded px-2 py-0.5 text-xs ${listing.status === "Published" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
          {listing.status}
        </span>
      </div>
      <h1 className="mb-6 text-3xl font-bold">Edit listing</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Photos</h2>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {listing.photos.map((p) => (
            <div key={p.id} className="relative h-32 overflow-hidden rounded bg-gray-100">
              <img src={p.publicUrl} alt={p.caption ?? ""} className="h-full w-full object-cover" />
              <button onClick={() => removePhoto(p.id)} className="absolute right-1 top-1 rounded bg-white/90 px-2 text-xs">Remove</button>
            </div>
          ))}
        </div>
        <input type="text" placeholder="Caption (optional)" className="mb-2 w-full rounded border border-gray-300 p-2 text-sm"
               value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} />
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic"
               onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); }} />
      </section>

      <section className="mb-8">
        <button onClick={togglePublish} className="rounded border border-black px-4 py-2">
          {listing.status === "Published" ? "Unpublish" : "Publish"}
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Details</h2>
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
  );
}
