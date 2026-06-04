import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2 text-base font-bold">
            <span
              aria-hidden="true"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-bold"
            >
              D
            </span>
            <span>
              Dodo<span className="text-[var(--color-primary)]">Stays</span>
            </span>
          </Link>
          <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
            Mauritius. Real prices. Instant book.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">Explore</p>
          <ul className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
            <li><Link className="hover:text-[var(--color-primary)]" href="/listings?region=grand-baie">Grand Baie</Link></li>
            <li><Link className="hover:text-[var(--color-primary)]" href="/listings?region=flic-en-flac">Flic en Flac</Link></li>
            <li><Link className="hover:text-[var(--color-primary)]" href="/listings?region=tamarin">Tamarin</Link></li>
            <li><Link className="hover:text-[var(--color-primary)]" href="/listings?region=le-morne">Le Morne</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">Hosting</p>
          <ul className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
            <li><Link className="hover:text-[var(--color-primary)]" href="/signup">Become a host</Link></li>
            <li><Link className="hover:text-[var(--color-primary)]" href="/host/listings">Manage listings</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">Account</p>
          <ul className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
            <li><Link className="hover:text-[var(--color-primary)]" href="/signin">Sign in</Link></li>
            <li><Link className="hover:text-[var(--color-primary)]" href="/signup">Create account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-[var(--color-muted-foreground)] sm:flex-row sm:px-6">
          <p>&copy; {new Date().getFullYear()} DodoStays. Made in Mauritius.</p>
          <p>All prices in MUR. Verified hosts only.</p>
        </div>
      </div>
    </footer>
  );
}
