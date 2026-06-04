"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-background)]/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-bold shadow-sm"
          >
            D
          </span>
          <span>
            Dodo<span className="text-[var(--color-primary)]">Stays</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/listings"
            className="hidden sm:inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
          >
            Browse
          </Link>
          {!loading && user ? (
            <Link href="/account">
              <Button variant="outline" size="sm">
                Account
              </Button>
            </Link>
          ) : (
            <>
              <Link
                href="/signin"
                className="hidden sm:inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
              >
                Sign in
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
