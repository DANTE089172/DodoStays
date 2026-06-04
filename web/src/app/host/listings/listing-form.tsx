"use client";

import { useState } from "react";
import { AMENITY_OPTIONS, REGIONS, type Amenity, type CreateOrUpdateListingInput, type PropertyType } from "@/lib/listings";

interface Props {
  initial?: Partial<CreateOrUpdateListingInput>;
  submitLabel: string;
  onSubmit: (input: CreateOrUpdateListingInput) => Promise<void>;
}

export function ListingForm({ initial, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [propertyType, setPropertyType] = useState<PropertyType>(initial?.propertyType ?? "Villa");
  const [region, setRegion] = useState(initial?.region ?? "flic-en-flac");
  const [addressLine, setAddressLine] = useState(initial?.addressLine ?? "");
  const [latitude, setLatitude] = useState(initial?.latitude ?? -20.27);
  const [longitude, setLongitude] = useState(initial?.longitude ?? 57.36);
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms ?? 1);
  const [beds, setBeds] = useState(initial?.beds ?? 1);
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms ?? 1);
  const [maxGuests, setMaxGuests] = useState(initial?.maxGuests ?? 2);
  const [nightlyRateMur, setNightlyRateMur] = useState(initial?.nightlyRateMur ?? 3000);
  const [cleaningFeeMur, setCleaningFeeMur] = useState(initial?.cleaningFeeMur ?? 500);
  const [minStayNights, setMinStayNights] = useState(initial?.minStayNights ?? 1);
  const [amenities, setAmenities] = useState<Amenity[]>(initial?.amenities ?? []);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleAmenity(a: Amenity) {
    setAmenities((current) => current.includes(a) ? current.filter((x) => x !== a) : [...current, a]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        title, description, propertyType, region, addressLine,
        latitude, longitude, bedrooms, beds, bathrooms, maxGuests,
        nightlyRateMur, cleaningFeeMur, minStayNights, amenities,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold">Title</label>
        <input className="w-full rounded border border-gray-300 p-2" required maxLength={200}
               value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-semibold">Description</label>
        <textarea className="w-full rounded border border-gray-300 p-2" required rows={5} maxLength={5000}
                  value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold">Property type</label>
          <select className="w-full rounded border border-gray-300 p-2"
                  value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType)}>
            <option value="Villa">Villa</option>
            <option value="Apartment">Apartment</option>
            <option value="Guesthouse">Guesthouse</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold">Region</label>
          <select className="w-full rounded border border-gray-300 p-2"
                  value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold">Address</label>
        <input className="w-full rounded border border-gray-300 p-2" required maxLength={500}
               value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold">Latitude</label>
          <input type="number" step="0.0001" className="w-full rounded border border-gray-300 p-2"
                 value={latitude} onChange={(e) => setLatitude(parseFloat(e.target.value))} />
        </div>
        <div>
          <label className="block text-sm font-semibold">Longitude</label>
          <input type="number" step="0.0001" className="w-full rounded border border-gray-300 p-2"
                 value={longitude} onChange={(e) => setLongitude(parseFloat(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <NumField label="Bedrooms" value={bedrooms} onChange={setBedrooms} min={0} />
        <NumField label="Beds" value={beds} onChange={setBeds} min={1} />
        <NumField label="Bathrooms" value={bathrooms} onChange={setBathrooms} min={0} />
        <NumField label="Max guests" value={maxGuests} onChange={setMaxGuests} min={1} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <NumField label="Nightly rate (MUR)" value={nightlyRateMur} onChange={setNightlyRateMur} min={1} step={1} />
        <NumField label="Cleaning fee (MUR)" value={cleaningFeeMur} onChange={setCleaningFeeMur} min={0} step={1} />
        <NumField label="Min stay (nights)" value={minStayNights} onChange={setMinStayNights} min={1} />
      </div>
      <div>
        <label className="block text-sm font-semibold">Amenities</label>
        <div className="grid grid-cols-3 gap-2">
          {AMENITY_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={amenities.includes(opt.value)} onChange={() => toggleAmenity(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function NumField({ label, value, onChange, min, step = 1 }: { label: string; value: number; onChange: (n: number) => void; min: number; step?: number }) {
  return (
    <div>
      <label className="block text-sm font-semibold">{label}</label>
      <input type="number" step={step} min={min}
             className="w-full rounded border border-gray-300 p-2"
             value={value}
             onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}
