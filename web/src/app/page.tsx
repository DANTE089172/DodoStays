"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { FlagDivider } from "@/components/decorations/flag-divider";
import { WaveDivider } from "@/components/decorations/wave-divider";
import { GrainOverlay } from "@/components/decorations/grain-overlay";
import { BatikPattern } from "@/components/decorations/batik-pattern";
import { AiSearchBar } from "@/components/search/ai-search-bar";
import { ExampleQueries } from "@/components/search/example-queries";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1573548842355-73bb50e50323?w=2400&q=80";
const HERO_FALLBACK =
  "https://images.unsplash.com/photo-1571396726928-7bd1cae40f0f?w=2400&q=80";

const FEATURED = [
  {
    title: "A coral villa above Tamarin Bay",
    region: "Tamarin",
    image:
      "https://images.unsplash.com/photo-1505881502353-a1986add3762?w=1600&q=80",
    href: "/listings?region=tamarin",
    priceFrom: 8500,
  },
  {
    title: "Old colonial house, lagoon at the door",
    region: "Mahebourg",
    image:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1600&q=80",
    href: "/listings?region=mahebourg",
    priceFrom: 4200,
  },
  {
    title: "A small apartment in Flic en Flac",
    region: "Flic en Flac",
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&q=80",
    href: "/listings?region=flic-en-flac",
    priceFrom: 2800,
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero — Cinema Maurice: full-bleed photograph, warm-graded with grain,
          on a near-black surface.  The Peach Orb sits behind everything as a
          luminous radial gradient bleeding off the bottom-right edge, so the
          AI search bar reads as a centerpiece lit from below.

          Layering (z-index):
            0  ds-peach-orb         (decorative glow, pointer-events: none)
            1  hero photo
            2  GrainOverlay + editorial gradient overlay
           10  headline + AI search wrapper (takes interaction) */}
      <section
        className="surface-cinema relative"
        style={{ position: "relative", overflow: "hidden" }}
      >
        {/* Peach Orb — radial-gradient halo bleeding off the bottom-right.
            aria-hidden because it carries no semantic meaning; pointer-events
            none so it never intercepts interaction with the search bar. */}
        <div
          aria-hidden
          className="ds-peach-orb"
          style={{
            position: "absolute",
            right: "-15%",
            bottom: "-25%",
            width: "70vw",
            height: "70vw",
            maxWidth: 900,
            maxHeight: 900,
            borderRadius: "50%",
            background: "var(--peach-glow)",
            boxShadow: "var(--orb-shadow)",
            filter: "blur(20px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div
          className="relative h-[80vh] min-h-[560px] w-full overflow-hidden"
          style={{ zIndex: 1 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="A Mauritian beach with mountains beyond"
            className="photo-warm h-full w-full object-cover"
            style={{ filter: "contrast(1.05) saturate(1.1) hue-rotate(-2deg) brightness(0.9)" }}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== HERO_FALLBACK) img.src = HERO_FALLBACK;
            }}
          />
          <GrainOverlay />
          <div aria-hidden="true" className="absolute inset-0 editorial-gradient" />
          <div className="absolute inset-0 flex flex-col justify-end px-6 pb-44 sm:px-12 lg:px-20 lg:pb-52" style={{ zIndex: 10 }}>
            <div className="max-w-2xl">
              <h1 className="font-display text-[clamp(3.5rem,9vw,6rem)] leading-[0.95] tracking-[-0.02em] text-[var(--color-sand)]">
                Mauritius.
              </h1>
              <p className="mt-3 font-script text-3xl italic text-[var(--color-ochre)] sm:text-4xl">
                lakaz pour vous.
              </p>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--color-sand)]/85 sm:text-lg">
                Real prices. Instant book. Hosts you can call by name.
              </p>
            </div>
          </div>
        </div>

        {/* AI search centerpiece — overlaps the hero bottom, sits dead-center.
            The hero-search-wrapper layers a luminous peach halo on the
            existing AiSearchBar without forking the component.  zIndex 10
            keeps it above the orb + photo + gradient overlay. */}
        <div className="absolute inset-x-0 -bottom-20 px-6 sm:px-10" style={{ zIndex: 10 }}>
          <div className="mx-auto w-full max-w-3xl">
            <div className="hero-search-wrapper">
              <AiSearchBar variant="hero" />
            </div>
            <ExampleQueries />
          </div>
        </div>
      </section>

      {/* Spacer so the next section accounts for the search overlap */}
      <div className="h-40 sm:h-48" aria-hidden />

      {/* Flag divider between hero and How it works */}
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
        <FlagDivider />
      </div>

      {/* How DodoStays works — numbered editorial w/ batik bg */}
      <section className="relative bg-[var(--color-card)]">
        <BatikPattern />
        <div className="relative mx-auto w-full max-w-7xl px-6 py-28 sm:px-10 lg:py-36">
          <div className="grid gap-12 md:grid-cols-[1fr_2fr] md:gap-20">
            <div>
              <p className="font-script text-2xl text-[var(--color-ochre)]">
                kifer nou la
              </p>
              <h2 className="mt-2 font-display text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
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
                  <p className="font-display text-7xl leading-none tracking-[-0.04em] text-[var(--color-ochre)]">
                    {item.step}
                  </p>
                  <FlagDivider width="short" className="mt-3" />
                  <h3 className="mt-5 font-display text-xl tracking-[-0.01em]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Wave divider */}
      <div className="mx-auto w-full max-w-7xl px-6 pt-20 sm:px-10">
        <WaveDivider />
      </div>

      {/* Featured stays — asymmetric editorial */}
      <section className="mx-auto w-full max-w-7xl px-6 pb-28 sm:px-10 lg:pb-36">
        <div className="mb-14 flex items-end justify-between">
          <div>
            <p className="font-script text-2xl text-[var(--color-ochre)]">
              bann lakaz nou kontan
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-[-0.02em] sm:text-5xl">
              A few places we love.
            </h2>
          </div>
          <Link
            href="/listings"
            /* "All stays" is a navigation link; deeper-cobalt secondary
               reads better than peach-on-sand for body-text underlines.
               Hover steps up to peach primary for a warm lift. */
            className="hidden text-sm text-[var(--color-secondary)] underline underline-offset-4 transition-colors duration-200 ease-out hover:text-[var(--color-primary)] sm:inline"
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
              <div className="relative aspect-[4/3] w-full overflow-hidden border-[1.5px] border-[var(--color-ochre)] bg-[var(--color-muted)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.image}
                  alt={f.title}
                  className="photo-warm h-full w-full object-cover transition-opacity duration-200 ease-out group-hover:opacity-95"
                />
              </div>
              <div className="mt-5 max-w-md">
                <p className="font-script text-xl text-[var(--color-ochre)]">
                  {f.region}
                </p>
                <h3 className="mt-1 font-display text-2xl leading-[1.15] tracking-[-0.01em] text-[var(--color-foreground)] transition-colors duration-200 ease-out group-hover:text-[var(--color-primary)]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  From{" "}
                  <span className="font-medium text-[var(--color-foreground)]">
                    MUR {f.priceFrom.toLocaleString()}
                  </span>{" "}
                  / night
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Hosting CTA — left-aligned, flag-divider trim */}
      <section className="border-t-[1.5px] border-[var(--color-ochre)] bg-[var(--color-muted)]">
        <FlagDivider />
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-24 sm:px-10 md:grid-cols-[2fr_1fr] md:items-end">
          <div>
            <p className="font-script text-2xl text-[var(--color-ochre)]">
              ou ena enn lakaz?
            </p>
            <h2 className="mt-2 max-w-2xl font-display text-4xl leading-[1.1] tracking-[-0.02em] sm:text-5xl">
              Hosting in Mauritius?{" "}
              <span className="italic text-[var(--color-primary)]">
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
              {/* Default variant = peach primary now; accent variant is
                  reserved for status stamps, not CTAs. */}
              <Button size="lg" className="shadow-block">
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
