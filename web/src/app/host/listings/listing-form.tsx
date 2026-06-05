"use client";

import { useState } from "react";
import { AMENITY_OPTIONS, REGIONS, type Amenity, type CreateOrUpdateListingInput, type PropertyType } from "@/lib/listings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { DisplayHeading } from "@/components/marketing/display-heading";
import { PillButton } from "@/components/marketing/pill-button";
import { cn } from "@/lib/utils";

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
    <form onSubmit={handleSubmit} className="space-y-16">
      {/* Property — title (1st input), description (textarea) */}
      <Section
        eyebrow="Property"
        title="Property"
        description="The basics guests see first."
      >
        <div className="space-y-2">
          <Label htmlFor="lf-title">Title</Label>
          <Input
            id="lf-title"
            required
            maxLength={200}
            placeholder="Sunny 3-bed villa with pool"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lf-description">Description</Label>
          <Textarea
            id="lf-description"
            required
            rows={6}
            maxLength={5000}
            placeholder="Tell guests what makes your place special…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Section>

      {/* Location — address must be the second text input overall */}
      <Section
        eyebrow="Location"
        title="Location"
        description="Where is your place?"
      >
        <div className="space-y-2">
          <Label htmlFor="lf-address">Address</Label>
          <Input
            id="lf-address"
            type="text"
            required
            maxLength={500}
            placeholder="Street, area, town"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lf-region">Region</Label>
            <Select
              id="lf-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {REGIONS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lf-type">Property type</Label>
            <Select
              id="lf-type"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as PropertyType)}
            >
              <option value="Villa">Villa</option>
              <option value="Apartment">Apartment</option>
              <option value="Guesthouse">Guesthouse</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lf-lat">Latitude</Label>
            <Input
              id="lf-lat"
              type="number"
              step="0.0001"
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lf-lng">Longitude</Label>
            <Input
              id="lf-lng"
              type="number"
              step="0.0001"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </Section>

      {/* Capacity & pricing */}
      <Section
        eyebrow="Capacity & pricing"
        title="Capacity & pricing"
        description="How many can stay, and what does it cost? All amounts in Mauritian rupees."
      >
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <NumField label="Bedrooms" value={bedrooms} onChange={setBedrooms} min={0} />
          <NumField label="Beds" value={beds} onChange={setBeds} min={1} />
          <NumField label="Bathrooms" value={bathrooms} onChange={setBathrooms} min={0} />
          <NumField label="Max guests" value={maxGuests} onChange={setMaxGuests} min={1} />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <NumField label="Nightly rate (MUR)" value={nightlyRateMur} onChange={setNightlyRateMur} min={1} step={1} />
          <NumField label="Cleaning fee (MUR)" value={cleaningFeeMur} onChange={setCleaningFeeMur} min={0} step={1} />
          <NumField label="Min stay (nights)" value={minStayNights} onChange={setMinStayNights} min={1} />
        </div>
      </Section>

      {/* Amenities */}
      <Section
        eyebrow="Amenities"
        title="Amenities"
        description="What does your place include?"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AMENITY_OPTIONS.map((opt) => {
            const checked = amenities.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 border-[1.5px] px-3 py-2.5 text-sm transition-colors duration-200 ease-out",
                  checked
                    ? "border-[var(--color-primary)] bg-[var(--color-card)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleAmenity(opt.value)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </Section>

      {error && (
        <p
          role="alert"
          className="border-[1.5px] border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/5 px-4 py-3 text-sm text-[var(--color-destructive)]"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end border-t border-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)] pt-8">
        <PillButton
          type="submit"
          disabled={submitting}
          variant="solid"
          size="md"
        >
          {submitting ? "Saving…" : submitLabel}
        </PillButton>
      </div>
    </form>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-8 border-t border-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)] pt-12 first:border-t-0 first:pt-0">
      <div className="grid gap-8 md:grid-cols-[260px_1fr] md:gap-12">
        <div>
          <Eyebrow tone="muted">{eyebrow}</Eyebrow>
          <DisplayHeading level={3} className="mt-2 !text-[1.75rem] !leading-tight">
            {title}
          </DisplayHeading>
          {description && (
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {description}
            </p>
          )}
        </div>
        <div className="space-y-6">{children}</div>
      </div>
    </section>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  step?: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
