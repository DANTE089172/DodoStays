"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";

export function SiteHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-background)]/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-10">
        <BrandMark />
        <nav className="flex items-center gap-1 sm:gap-4">
          <Link
            href="/listings"
            className="hidden sm:inline-flex h-9 items-center px-2 text-sm text-[var(--color-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-accent)]"
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
                className="hidden sm:inline-flex h-9 items-center px-2 text-sm text-[var(--color-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-accent)]"
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
