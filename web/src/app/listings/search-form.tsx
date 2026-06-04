"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REGIONS, type PropertyType } from "@/lib/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

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
    <form
      onSubmit={submit}
      className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-end"
    >
      <Field label="Region" htmlFor="search-region">
        <Select
          id="search-region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="">Any region</option>
          {REGIONS.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Property type" htmlFor="search-type">
        <Select
          id="search-type"
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value as PropertyType | "")}
        >
          <option value="">Any type</option>
          <option value="Villa">Villa</option>
          <option value="Apartment">Apartment</option>
          <option value="Guesthouse">Guesthouse</option>
        </Select>
      </Field>
      <Field label="Min bedrooms" htmlFor="search-bedrooms">
        <Input
          id="search-bedrooms"
          type="number"
          min={0}
          placeholder="Any"
          value={minBedrooms}
          onChange={(e) => setMinBedrooms(e.target.value)}
        />
      </Field>
      <Field label="Max MUR / night" htmlFor="search-price">
        <Input
          id="search-price"
          type="number"
          min={1}
          placeholder="Any"
          value={maxNightly}
          onChange={(e) => setMaxNightly(e.target.value)}
        />
      </Field>
      <div className="col-span-2 lg:col-span-1">
        <Button type="submit" className="w-full lg:w-auto" size="default">
          Search
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
