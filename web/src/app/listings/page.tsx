import Link from "next/link";
import { searchListings, type ListingSearchResponse } from "@/lib/listings";
import { SearchForm } from "./search-form";

export const dynamic = "force-dynamic";

export default async function ListingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const params: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") params[k] = v;
  }

  let results: ListingSearchResponse;
  let error: string | null = null;
  try {
    results = await searchListings(params);
  } catch (e) {
    results = { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 1 };
    error = (e as Error).message;
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-4">
        <Link href="/" className="text-sm underline">← Home</Link>
      </div>
      <h1 className="mb-4 text-3xl font-bold">Browse stays in Mauritius</h1>
      <SearchForm />
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <p className="mt-4 text-sm text-gray-600">{results.totalCount} listings</p>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.items.map((l) => (
          <li key={l.id} className="overflow-hidden rounded border border-gray-200">
            <Link href={`/listings/${l.id}`}>
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                {l.primaryPhotoUrl && <img src={l.primaryPhotoUrl} alt={l.title} className="h-full w-full object-cover" />}
              </div>
              <div className="p-3">
                <h2 className="font-semibold">{l.title}</h2>
                <p className="text-sm text-gray-600">{l.region} · {l.propertyType} · {l.maxGuests} guests</p>
                <p className="mt-1 font-semibold">MUR {l.nightlyRateMur.toLocaleString()}<span className="text-xs font-normal text-gray-500"> / night</span></p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {results.items.length === 0 && !error && (
        <p className="mt-8 text-center text-gray-500">No listings match these filters yet.</p>
      )}
    </main>
  );
}
