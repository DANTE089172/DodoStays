"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";

export function SiteHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b-[1.5px] border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-background)]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-10">
        <BrandMark />
        <nav className="flex items-center gap-1 sm:gap-4">
          <Link
            href="/listings"
            className="hidden sm:inline-flex h-9 items-center px-2 text-sm text-[var(--color-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-primary)]"
          >
            Browse
          </Link>
          {!loading && user ? (
            <>
              <Link
                href="/bookings"
                className="hidden sm:inline-flex h-9 items-center px-2 text-sm text-[var(--color-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-primary)]"
              >
                Bookings
              </Link>
              <Link href="/account">
                <Button variant="outline" size="sm">
                  Account
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                /* "Sign in" is the canonical secondary action — takes the
                   downgraded cobalt secondary token, not the peach primary
                   nor the flamboyant status accent. */
                className="hidden sm:inline-flex h-9 items-center px-2 text-sm text-[var(--color-secondary)] transition-colors duration-200 ease-out hover:text-[var(--color-primary)]"
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
