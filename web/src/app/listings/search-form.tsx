"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REGIONS, type PropertyType } from "@/lib/listings";

export function SearchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [region, setRegion] = useState(params.get("region") ?? "");
  const [propertyType, setPropertyType] = useState<PropertyType | "">((params.get("propertyType") as PropertyType) ?? "");
  const [maxNightly, setMaxNightly] = useState(params.get("maxNightlyMur") ?? "");
  const [minBedrooms, setMinBedrooms] = useState(params.get("minBedrooms") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (region) sp.set("region", region);
    if (propertyType) sp.set("propertyType", propertyType);
    if (maxNightly) sp.set("maxNightlyMur", maxNightly);
    if (minBedrooms) sp.set("minBedrooms", minBedrooms);
    router.push(`/listings?${sp.toString()}`);
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded border border-gray-200 p-4 sm:grid-cols-5">
      <select className="rounded border border-gray-300 p-2" value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="">Any region</option>
        {REGIONS.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
      </select>
      <select className="rounded border border-gray-300 p-2"
              value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType | "")}>
        <option value="">Any type</option>
        <option value="Villa">Villa</option>
        <option value="Apartment">Apartment</option>
        <option value="Guesthouse">Guesthouse</option>
      </select>
      <input type="number" min={0} placeholder="Min bedrooms" className="rounded border border-gray-300 p-2"
             value={minBedrooms} onChange={(e) => setMinBedrooms(e.target.value)} />
      <input type="number" min={1} placeholder="Max MUR/night" className="rounded border border-gray-300 p-2"
             value={maxNightly} onChange={(e) => setMaxNightly(e.target.value)} />
      <button type="submit" className="rounded bg-black p-2 text-white">Search</button>
    </form>
  );
}
