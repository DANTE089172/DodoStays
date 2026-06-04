import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-[var(--color-foreground)] text-[var(--color-sand)]">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 sm:px-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <BrandMark tone="sand" />
          <p
            className="mt-6 font-script text-2xl text-[var(--color-ochre)]"
          >
            Mauritius. Honestly priced.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-sand)]/75">
            A small Mauritian booking site. Real prices in rupees, verified
            hosts, no foreign-currency surprises at checkout.
          </p>
        </div>
        <FooterColumn
          title="Explore"
          links={[
            { label: "Grand Baie", href: "/listings?region=grand-baie" },
            { label: "Flic en Flac", href: "/listings?region=flic-en-flac" },
            { label: "Tamarin", href: "/listings?region=tamarin" },
            { label: "Le Morne", href: "/listings?region=le-morne" },
          ]}
        />
        <FooterColumn
          title="Hosting"
          links={[
            { label: "Become a host", href: "/signup" },
            { label: "Manage listings", href: "/host/listings" },
          ]}
        />
        <FooterColumn
          title="Account"
          links={[
            { label: "Sign in", href: "/signin" },
            { label: "Create account", href: "/signup" },
          ]}
        />
      </div>
      <div className="border-t-[1.5px] border-[var(--color-sand)]/20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-6 py-6 text-xs text-[var(--color-sand)]/60 sm:flex-row sm:items-center sm:px-10">
          <p>&copy; {new Date().getFullYear()} DodoStays. All prices in MUR.</p>
          <p className="font-script text-base text-[var(--color-ochre)]">
            Made in Maurice 🇲🇺
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="mb-4 small-caps text-xs text-[var(--color-ochre)]">
        {title}
      </p>
      <ul className="space-y-2.5 text-sm text-[var(--color-sand)]/85">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              className="transition-colors duration-200 ease-out hover:text-[var(--color-ochre)]"
              href={l.href}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
