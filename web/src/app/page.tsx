"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { REGIONS } from "@/lib/listings";

export default function Home() {
  const router = useRouter();
  const [region, setRegion] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [maxNightly, setMaxNightly] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (region) sp.set("region", region);
    if (propertyType) sp.set("propertyType", propertyType);
    if (maxNightly) sp.set("maxNightlyMur", maxNightly);
    const query = sp.toString();
    router.push(query ? `/listings?${query}` : "/listings");
  }

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-gradient-to-b from-[var(--color-sand)] via-[var(--color-background)] to-[var(--color-background)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-1/2 h-[420px] w-[420px] translate-x-1/2 rounded-full bg-[var(--color-accent)]/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-[320px] w-[320px] rounded-full bg-[var(--color-primary)]/15 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)]/80 px-3 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              Built for Mauritius
            </span>
            <h1 className="mt-6 text-balance text-5xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-6xl lg:text-7xl">
              Stay where the lagoon meets the trade winds.
            </h1>
            <p className="mt-5 text-balance text-lg text-[var(--color-muted-foreground)] sm:text-xl">
              Real prices in MUR. Verified hosts. No hidden fees. Find your
              villa, apartment, or guesthouse from Grand Baie to Le Morne.
            </p>
          </div>

          {/* Search */}
          <Card className="mx-auto mt-10 max-w-4xl">
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={onSearch} className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="hero-region">Region</Label>
                  <Select id="hero-region" value={region} onChange={(e) => setRegion(e.target.value)}>
                    <option value="">Anywhere in Mauritius</option>
                    {REGIONS.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hero-type">Property type</Label>
                  <Select id="hero-type" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    <option value="">Any type</option>
                    <option value="Villa">Villa</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Guesthouse">Guesthouse</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hero-price">Max MUR / night</Label>
                  <Input
                    id="hero-price"
                    type="number"
                    min={1}
                    placeholder="e.g. 5000"
                    value={maxNightly}
                    onChange={(e) => setMaxNightly(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg" className="md:h-10">
                  Search stays
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--color-muted-foreground)]">
            <span className="font-medium text-[var(--color-foreground)]">Popular:</span>
            {["grand-baie", "flic-en-flac", "tamarin", "le-morne"].map((slug) => {
              const region = REGIONS.find((r) => r.slug === slug);
              if (!region) return null;
              return (
                <Link
                  key={slug}
                  href={`/listings?region=${slug}`}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  {region.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How DodoStays works</h2>
          <p className="mt-3 text-[var(--color-muted-foreground)]">
            We keep it simple, transparent, and 100% Mauritian.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Browse honest listings",
              body:
                "Real photos, real prices in rupees. No surge pricing, no foreign-currency surprises at checkout.",
            },
            {
              step: "02",
              title: "Book a verified host",
              body:
                "Every host is KYC-verified. Read past guest reviews and chat directly before you confirm.",
            },
            {
              step: "03",
              title: "Stay like a local",
              body:
                "Get tips on the best beaches, dholl puri spots, and snorkeling reefs from people who actually live here.",
            },
          ].map((item) => (
            <Card key={item.step} className="h-full">
              <CardContent className="flex h-full flex-col gap-3 p-8">
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]">
                  Step {item.step}
                </span>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                  {item.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <Card className="overflow-hidden border-0 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-lg">
          <CardContent className="grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Hosting in Mauritius?</h2>
              <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
                Reach guests who actually want to come here. Set your own prices in MUR, keep your direct guests, and pay one flat commission.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup">
                <Button variant="secondary" size="lg">
                  List your place
                </Button>
              </Link>
              <Link href="/listings">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  Browse stays
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}
