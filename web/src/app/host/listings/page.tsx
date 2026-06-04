"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { deleteListing, getMyListings, publishListing, unpublishListing, type Listing } from "@/lib/listings";

export default function HostListingsPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    getMyListings(accessToken).then(setListings).catch((e) => setError((e as Error).message));
  }, [accessToken]);

  async function togglePublish(id: string, status: string) {
    if (!accessToken) return;
    setWorking(true);
    try {
      const updated = status === "Published"
        ? await unpublishListing(accessToken, id)
        : await publishListing(accessToken, id);
      setListings((curr) => curr.map((l) => l.id === id ? updated : l));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function remove(id: string) {
    if (!accessToken || !confirm("Delete this listing? This cannot be undone.")) return;
    setWorking(true);
    try {
      await deleteListing(accessToken, id);
      setListings((curr) => curr.filter((l) => l.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  if (loading || !user) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">My listings</h1>
        <Link href="/host/listings/new" className="rounded bg-black px-4 py-2 text-white">+ Add listing</Link>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {listings.length === 0 ? (
        <p className="text-gray-600">You haven&apos;t created any listings yet.</p>
      ) : (
        <ul className="space-y-4">
          {listings.map((l) => (
            <li key={l.id} className="flex items-start gap-4 rounded border border-gray-200 p-4">
              <div className="h-24 w-32 shrink-0 overflow-hidden rounded bg-gray-100">
                {l.photos[0] && <img src={l.photos[0].publicUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{l.title}</h2>
                    <p className="text-sm text-gray-600">{l.region} · {l.propertyType} · MUR {l.nightlyRateMur.toLocaleString()}/night</p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs ${l.status === "Published" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                    {l.status}
                  </span>
                </div>
                <div className="mt-3 flex gap-2 text-sm">
                  <Link href={`/host/listings/${l.id}/edit`} className="underline">Edit</Link>
                  <button disabled={working} onClick={() => togglePublish(l.id, l.status)} className="underline disabled:opacity-50">
                    {l.status === "Published" ? "Unpublish" : "Publish"}
                  </button>
                  <Link href={`/listings/${l.id}`} className="underline">View public</Link>
                  <button disabled={working} onClick={() => remove(l.id)} className="text-red-600 underline disabled:opacity-50">Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
