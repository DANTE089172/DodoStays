import Link from "next/link";
import { Section } from "@/components/marketing/section";
import { Eyebrow } from "@/components/marketing/eyebrow";

const FOOTER_NAV: { label: string; href: string }[] = [
  { label: "Browse", href: "/listings" },
  { label: "Hosts", href: "/host/listings" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <Section tone="ink" size="md" className="mt-0">
      <div className="grid gap-12 md:grid-cols-3 md:gap-16">
        {/* Column 1 — wordmark + tagline */}
        <div>
          <Link
            href="/"
            className="inline-block font-display text-3xl tracking-[0.005em] text-[var(--color-foreground)]"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 700' }}
          >
            DodoStays
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-[1.6] text-[var(--color-muted-foreground)]">
            Honestly priced stays in Mauritius. Real rupees, verified hosts.
          </p>
        </div>

        {/* Column 2 — nav */}
        <div>
          <Eyebrow tone="peach">Explore</Eyebrow>
          <ul className="mt-5 space-y-3">
            {FOOTER_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm tracking-[0.04em] text-[var(--color-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-primary)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — legal + locale */}
        <div>
          <Eyebrow tone="peach">Locale</Eyebrow>
          <p className="mt-5 text-[13px] leading-[1.7] text-[var(--color-muted-foreground)]">
            Made in Mauritius.
          </p>
          <p className="mt-1 text-[13px] leading-[1.7] text-[var(--color-muted-foreground)]">
            All prices in MUR.
          </p>
          <p className="mt-1 text-[13px] leading-[1.7] text-[var(--color-muted-foreground)]">
            &copy; {year} DodoStays.
          </p>
        </div>
      </div>

      {/* Bottom rule — peach 20% line + tiny copyright */}
      <div className="mt-14 border-t border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] pt-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          DodoStays &middot; {year}
        </p>
      </div>
    </Section>
  );
}
