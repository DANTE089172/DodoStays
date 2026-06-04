import Link from "next/link";
import { notFound } from "next/navigation";
import { getListing } from "@/lib/listings";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing;
  try {
    listing = await getListing(id);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-4">
        <Link href="/listings" className="text-sm underline">← All listings</Link>
      </div>
      <h1 className="text-3xl font-bold">{listing.title}</h1>
      <p className="mt-1 text-sm text-gray-600">{listing.region} · {listing.propertyType} · Hosted by {listing.hostDisplayName}</p>

      {listing.photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {listing.photos.map((p) => (
            <img key={p.id} src={p.publicUrl} alt={p.caption ?? listing.title} className="aspect-[4/3] w-full rounded object-cover" />
          ))}
        </div>
      )}

      <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold">{listing.bedrooms}</p>
          <p className="text-xs text-gray-600">Bedrooms</p>
        </div>
        <div className="rounded border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold">{listing.beds}</p>
          <p className="text-xs text-gray-600">Beds</p>
        </div>
        <div className="rounded border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold">{listing.maxGuests}</p>
          <p className="text-xs text-gray-600">Max guests</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xl font-semibold">About this place</h2>
        <p className="whitespace-pre-line text-gray-800">{listing.description}</p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xl font-semibold">Amenities</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {listing.amenities.map((a) => <li key={a} className="text-sm">· {a}</li>)}
        </ul>
      </section>

      <aside className="mt-8 rounded border border-gray-200 p-4">
        <p className="text-2xl font-bold">MUR {listing.nightlyRateMur.toLocaleString()}<span className="text-xs font-normal text-gray-500"> / night</span></p>
        <p className="text-xs text-gray-500">+ MUR {listing.cleaningFeeMur.toLocaleString()} cleaning · min {listing.minStayNights} night(s)</p>
        <p className="mt-3 text-sm text-gray-600">Booking will be available soon.</p>
      </aside>
    </main>
  );
}
