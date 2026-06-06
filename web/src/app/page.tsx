"use client";

import Link from "next/link";
import { Search, Calendar, Heart, ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AiSearchBar } from "@/components/search/ai-search-bar";
import { ExampleQueries } from "@/components/search/example-queries";
import { Section } from "@/components/marketing/section";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { DisplayHeading } from "@/components/marketing/display-heading";
import { Lede } from "@/components/marketing/lede";
import { pillButtonClasses } from "@/components/marketing/pill-button";
import { CinematicHeroMedia, CinematicPhoto } from "@/components/cinematic";

// Pexels — drone footage over tropical water. Free hot-link, <8s loop-friendly
// clip. Hard-coded here so it's trivial to swap for a Mauritius-shot original
// later. 1080p variant chosen over 4K UHD for faster initial paint; the 4K
// version (.../3018669-uhd_3840_2160_25fps.mp4) is a known-good fallback if
// CDN policy changes for the 1080p one.
const HERO_VIDEO_SRC =
  "https://videos.pexels.com/video-files/3018669/3018669-hd_1920_1080_25fps.mp4";
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1573548842355-73bb50e50323?w=2400&q=80";

const REGIONS = [
  {
    name: "Tamarin",
    blurb: "Sunset surf town with a quiet, slow rhythm.",
    image:
      "https://images.unsplash.com/photo-1505881502353-a1986add3762?w=1600&q=80",
    href: "/listings?region=tamarin",
  },
  {
    name: "Mahebourg",
    blurb: "Old colonial harbour, lagoon at the door.",
    image:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1600&q=80",
    href: "/listings?region=mahebourg",
  },
  {
    name: "Flic en Flac",
    blurb: "Long west-coast beach, walking distance to everything.",
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&q=80",
    href: "/listings?region=flic-en-flac",
  },
  {
    name: "Belle Mare",
    blurb: "Powder-fine east-coast sand, turquoise lagoon.",
    image:
      "https://images.unsplash.com/photo-1571396726928-7bd1cae40f0f?w=1600&q=80",
    href: "/listings?region=belle-mare",
  },
];

const HOW_STEPS = [
  {
    n: "01",
    title: "Search",
    icon: Search,
    body:
      "Tell us where, when, and what kind of stay. Real prices in rupees, no surge surprises.",
  },
  {
    n: "02",
    title: "Book",
    icon: Calendar,
    body:
      "Talk to KYC-verified hosts directly, then confirm in a few taps. Instant book where it matters.",
  },
  {
    n: "03",
    title: "Stay",
    icon: Heart,
    body:
      "Local advice on which beach to visit Tuesday and where to find the best dholl puri — from people who live here.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <SiteHeader />

      {/* ------------------------------------------------------------------ */}
      {/* HERO — full-bleed photo on cinema surface, peach orb signature      */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="surface-cinema relative isolate overflow-hidden"
        aria-label="Hero"
      >
        {/* Peach orb — the one signature ornament on the page. */}
        <div
          aria-hidden
          className="ds-peach-orb absolute right-[-15%] bottom-[-25%] z-0 hidden md:block"
          style={{
            width: "70vw",
            height: "70vw",
            maxWidth: 900,
            maxHeight: 900,
            borderRadius: "50%",
            background: "var(--peach-glow)",
            boxShadow: "var(--orb-shadow)",
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />

        {/* Background video on desktop with motion-OK; poster image
            (Ken-Burns animated) on mobile + reduced-motion. Ink scrim is
            baked into CinematicHeroMedia for headline legibility. */}
        <CinematicHeroMedia
          videoSrc={HERO_VIDEO_SRC}
          posterSrc={HERO_IMAGE}
          alt="A Mauritian coastline with mountains beyond"
        />

        {/* Editorial column — eyebrow, headline, lede, search */}
        <div className="relative z-10 flex min-h-[88vh] w-full flex-col items-center justify-center px-6 py-[var(--section-py-lg)] text-center">
          <Eyebrow tone="peach">The Indian Ocean. Mauritius.</Eyebrow>
          <DisplayHeading
            level={1}
            className="mt-6 max-w-3xl text-[var(--color-foreground)]"
          >
            Find your kind of <span className="italic">Mauritius</span>.
          </DisplayHeading>
          <Lede className="mt-6 text-[var(--color-foreground)]/85">
            Curated stays from Black River to Belle Mare. Hosted by people who
            know the island.
          </Lede>

          <div className="mt-10 w-full max-w-3xl">
            <div className="hero-search-wrapper">
              <AiSearchBar variant="hero" />
            </div>
            <ExampleQueries />
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-6 z-10 flex justify-center text-[var(--color-foreground)]/60"
        >
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2 — How DodoStays works (cream)                             */}
      {/* ------------------------------------------------------------------ */}
      <Section tone="cream" size="lg">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow tone="peach">How it works</Eyebrow>
          <DisplayHeading level={2} className="mt-5">
            How DodoStays works.
          </DisplayHeading>
          <Lede className="mx-auto mt-6">
            We are not a global platform. We are a small team in Quatre Bornes
            who built a booking site for the island we live on.
          </Lede>
        </div>

        <ol className="mt-20 grid gap-12 sm:grid-cols-3 sm:gap-10">
          {HOW_STEPS.map(({ n, title, icon: Icon, body }) => (
            <li key={n} className="text-center">
              <Icon
                className="mx-auto h-6 w-6 text-[var(--color-primary)]"
                aria-hidden
              />
              <p
                className="ds-display-lg mt-6 text-[var(--color-primary)]"
                aria-hidden
              >
                {n}
              </p>
              <h3 className="ds-display-sm mt-4 text-[var(--color-foreground)]">
                {title}
              </h3>
              <p className="mx-auto mt-4 max-w-xs text-[15px] leading-relaxed text-[var(--color-muted-foreground)]">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 3 — Stays curated by region (sand)                          */}
      {/* ------------------------------------------------------------------ */}
      <Section tone="sand" size="lg">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <Eyebrow tone="peach">Explore the island</Eyebrow>
            <DisplayHeading level={2} className="mt-5">
              Stays curated by region.
            </DisplayHeading>
          </div>
          <Link
            href="/listings"
            className="text-[14px] tracking-[0.04em] text-[var(--color-foreground)] underline-offset-4 transition-colors duration-200 ease-out hover:text-[var(--color-primary)] hover:underline"
          >
            View all stays
          </Link>
        </div>

        <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {REGIONS.map((r) => (
            <Link
              key={r.name}
              href={r.href}
              className="group block"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-muted)]">
                <CinematicPhoto
                  src={r.image}
                  alt={`${r.name}, Mauritius`}
                  grade="warm"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                />
              </div>
              <h3 className="ds-display-sm mt-5 text-[var(--color-foreground)] transition-colors duration-200 ease-out group-hover:text-[var(--color-primary)]">
                {r.name}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-muted-foreground)]">
                {r.blurb}
              </p>
              <span className="mt-3 inline-block text-[13px] tracking-[0.08em] text-[var(--color-primary)]">
                View stays &rarr;
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 4 — Why hosts choose us (cinema)                            */}
      {/* ------------------------------------------------------------------ */}
      <Section tone="ink" size="lg">
        <div className="grid items-center gap-16 md:grid-cols-2 md:gap-20">
          <div>
            <Eyebrow tone="peach">For hosts</Eyebrow>
            <DisplayHeading level={2} className="mt-5 text-[var(--color-foreground)]">
              Hosting in Mauritius? Reach guests who actually want to come here.
            </DisplayHeading>
            <Lede className="mt-6 text-[var(--color-foreground)]/80">
              Set your own prices in rupees. Keep your direct guests. Pay one
              flat commission. No fine print, no foreign-currency surprises at
              checkout.
            </Lede>
            <div className="mt-10">
              <Link
                href="/signup"
                className={pillButtonClasses({ variant: "ghost", size: "lg" })}
              >
                Become a host &rarr;
              </Link>
            </div>
          </div>

          <div className="text-center md:text-left">
            <p
              className="font-display text-[clamp(7rem,18vw,12rem)] leading-none tracking-[-0.04em] text-[var(--color-primary)]"
              aria-hidden
            >
              7%
            </p>
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-[var(--color-foreground)]/70 md:max-w-sm">
              Our flat commission rate. No tiered pricing, no surge fees, no
              category-specific cuts.
            </p>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 5 — Footer CTA (cream, italic close)                        */}
      {/* ------------------------------------------------------------------ */}
      <Section tone="cream" size="lg" width="narrow">
        <div className="text-center">
          <Eyebrow tone="peach">Ready when you are</Eyebrow>
          <DisplayHeading level={2} italic className="mt-5">
            Stay where the sea meets the road.
          </DisplayHeading>
          <Lede className="mx-auto mt-6">
            A small Mauritian booking site, built for people who want to know
            who they&apos;re renting from.
          </Lede>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/listings"
              className={pillButtonClasses({ variant: "solid", size: "lg" })}
            >
              Start exploring
            </Link>
            <Link
              href="/signup"
              className={pillButtonClasses({ variant: "ghost", size: "lg" })}
            >
              Become a host
            </Link>
          </div>
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
