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
import { REGIONS } from "@/lib/listings";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1571396726928-7bd1cae40f0f?w=2400&q=80";

const FEATURED = [
  {
    title: "A coral villa above Tamarin Bay",
    region: "Tamarin",
    image:
      "https://images.unsplash.com/photo-1505881502353-a1986add3762?w=1600&q=80",
    href: "/listings?region=tamarin",
  },
  {
    title: "Old colonial house, lagoon at the door",
    region: "Mahebourg",
    image:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1600&q=80",
    href: "/listings?region=mahebourg",
  },
  {
    title: "A small apartment in Flic en Flac",
    region: "Flic en Flac",
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&q=80",
    href: "/listings?region=flic-en-flac",
  },
];

export default function Home() {
  const router = useRouter();
  const [region, setRegion] = useState("");
  const [dates, setDates] = useState("");
  const [guests, setGuests] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (region) sp.set("region", region);
    if (guests) sp.set("minGuests", guests);
    const query = sp.toString();
    router.push(query ? `/listings?${query}` : "/listings");
  }

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero — full-bleed photograph */}
      <section className="relative">
        <div className="relative h-[80vh] min-h-[560px] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="A Mauritian lagoon at sunset"
            className="h-full w-full object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 editorial-gradient" />
          <div className="absolute inset-0 flex flex-col justify-end px-6 pb-32 sm:px-12 lg:px-20 lg:pb-40">
            <p className="small-caps text-xs text-[var(--color-sand)]/85">
              Editorial · Mauritius · Est. 2025
            </p>
            <h1 className="mt-4 max-w-4xl font-display text-[clamp(2.75rem,7vw,5rem)] leading-[1.02] tracking-[-0.02em] text-[var(--color-sand)]">
              Stay in Mauritius.{" "}
              <span className="italic text-[var(--color-sand)]/95">
                Like a local.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-sand)]/85 sm:text-lg">
              Real prices in rupees. Verified Mauritian hosts. From a
              coral-shaded villa in Tamarin to a lagoon-side guesthouse in
              Mahebourg.
            </p>
          </div>
        </div>

        {/* Search bar — overlaps the bottom of the hero */}
        <div className="relative mx-auto -mt-14 w-full max-w-5xl px-6 sm:px-10 lg:-mt-16">
          <form
            onSubmit={onSearch}
            className="grid grid-cols-1 gap-x-0 gap-y-4 border border-[var(--color-border)] bg-[var(--color-card)] p-2 sm:grid-cols-[1.4fr_1.2fr_0.9fr_auto] sm:items-end sm:gap-y-0"
          >
            <div className="flex flex-col gap-1.5 px-4 py-3 sm:border-r sm:border-[var(--color-border)]">
              <Label htmlFor="hero-region">Where</Label>
              <Select
                id="hero-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
              >
                <option value="">Anywhere in Mauritius</option>
                {REGIONS.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 px-4 py-3 sm:border-r sm:border-[var(--color-border)]">
              <Label htmlFor="hero-dates">When</Label>
              <Input
                id="hero-dates"
                type="text"
                placeholder="Add dates"
                value={dates}
                onChange={(e) => setDates(e.target.value)}
                className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
              />
            </div>
            <div className="flex flex-col gap-1.5 px-4 py-3 sm:border-r sm:border-[var(--color-border)]">
              <Label htmlFor="hero-guests">Guests</Label>
              <Input
                id="hero-guests"
                type="number"
                min={1}
                placeholder="2"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
              />
            </div>
            <div className="flex items-stretch p-2">
              <Button
                type="submit"
                size="lg"
                className="h-12 w-full px-8 sm:w-auto"
              >
                Search stays
              </Button>
            </div>
          </form>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--color-muted-foreground)]">
            <span className="small-caps">Popular</span>
            {["grand-baie", "flic-en-flac", "tamarin", "le-morne"].map((slug) => {
              const r = REGIONS.find((x) => x.slug === slug);
              if (!r) return null;
              return (
                <Link
                  key={slug}
                  href={`/listings?region=${slug}`}
                  className="text-[var(--color-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-accent)]"
                >
                  {r.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How DodoStays works — numbered editorial */}
      <section className="mx-auto w-full max-w-7xl px-6 py-28 sm:px-10 lg:py-36">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr] md:gap-20">
          <div>
            <p className="small-caps text-xs text-[var(--color-muted-foreground)]">
              How it works
            </p>
            <h2 className="mt-4 font-display text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
              How DodoStays works.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--color-muted-foreground)]">
              We are not a global platform. We are a small team in Quatre
              Bornes who built a booking site for the island we live on.
            </p>
          </div>
          <ol className="grid gap-12 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Honest listings.",
                body:
                  "Real photos and real prices in rupees. No surge pricing, no foreign-currency surprises at checkout.",
              },
              {
                step: "02",
                title: "Verified hosts.",
                body:
                  "Every host is KYC-verified. Read past guest reviews and chat directly before you confirm.",
              },
              {
                step: "03",
                title: "Local advice.",
                body:
                  "Tips on which beach to visit Tuesday, where to find dholl puri, and which reef to snorkel — from people who actually live here.",
              },
            ].map((item) => (
              <li key={item.step}>
                <p className="font-display text-6xl leading-none tracking-[-0.04em] text-[var(--color-foreground)]">
                  {item.step}
                </p>
                <h3 className="mt-6 font-display text-xl tracking-[-0.01em]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Featured stays — editorial photo+caption pairs */}
      <section className="mx-auto w-full max-w-7xl px-6 pb-28 sm:px-10 lg:pb-36">
        <div className="mb-14 flex items-end justify-between">
          <div>
            <p className="small-caps text-xs text-[var(--color-muted-foreground)]">
              Featured stays
            </p>
            <h2 className="mt-4 font-display text-4xl tracking-[-0.02em] sm:text-5xl">
              A few places we love.
            </h2>
          </div>
          <Link
            href="/listings"
            className="hidden text-sm text-[var(--color-foreground)] underline underline-offset-4 transition-colors duration-200 ease-out hover:text-[var(--color-accent)] sm:inline"
          >
            All stays
          </Link>
        </div>
        <div className="grid gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
          {FEATURED.map((f, i) => (
            <Link
              key={f.title}
              href={f.href}
              className={`group block ${
                i === 0 ? "md:col-span-2 lg:col-span-2" : ""
              }`}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--color-muted)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.image}
                  alt={f.title}
                  className="h-full w-full object-cover transition-opacity duration-200 ease-out group-hover:opacity-95"
                />
              </div>
              <div className="mt-5 max-w-md">
                <p className="small-caps text-xs text-[var(--color-muted-foreground)]">
                  {f.region}
                </p>
                <h3 className="mt-2 font-display text-2xl leading-[1.15] tracking-[-0.01em] text-[var(--color-foreground)] transition-colors duration-200 ease-out group-hover:text-[var(--color-accent)]">
                  {f.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Hosting CTA — left-aligned editorial */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-muted)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-24 sm:px-10 md:grid-cols-[2fr_1fr] md:items-end">
          <div>
            <p className="small-caps text-xs text-[var(--color-muted-foreground)]">
              For Mauritian hosts
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-[1.1] tracking-[-0.02em] sm:text-5xl">
              Hosting in Mauritius?{" "}
              <span className="italic text-[var(--color-accent)]">
                Reach guests who actually want to come here.
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-muted-foreground)]">
              Set your own prices in MUR. Keep your direct guests. Pay one
              flat commission. No fine print.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href="/signup">
              <Button variant="accent" size="lg">
                List your place
              </Button>
            </Link>
            <Link href="/listings">
              <Button variant="outline" size="lg">
                Browse stays
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
