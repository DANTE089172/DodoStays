"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { pillButtonClasses } from "@/components/marketing/pill-button";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

const PUBLIC_LINKS: NavLink[] = [
  { href: "/listings", label: "Browse" },
  { href: "/signup", label: "Hosts" },
  { href: "/about", label: "About" },
];

const AUTHED_LINKS: NavLink[] = [
  { href: "/listings", label: "Browse" },
  { href: "/bookings", label: "Bookings" },
  { href: "/host/listings", label: "Hosts" },
];

/**
 * Onepirate-flavoured site header.
 *
 * Three-column layout: serif wordmark left, tracked nav center, auth + pill CTA
 * right. Page-flow (NOT sticky) — the magazine treatment lets the hero own the
 * top of the viewport. Mobile collapses into a hamburger that opens a full-
 * screen overlay.
 *
 * Auth-aware: when signed in, swaps "Sign in" + "Become a host" for "Account"
 * link + bookings nav. The auth wiring matches the previous implementation.
 */
export function SiteHeader() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  // Close mobile menu when navigating away.
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open]);

  const navLinks = !loading && user ? AUTHED_LINKS : PUBLIC_LINKS;
  const isAuthed = !loading && !!user;

  return (
    <header className="relative z-30 bg-[var(--color-background)]">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6 sm:px-10">
        {/* Wordmark — left */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--color-foreground)]"
          aria-label="DodoStays home"
        >
          <DodoMark />
          <span
            className="font-display text-[1.5rem] leading-none tracking-[-0.005em]"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 600' }}
          >
            DodoStays
          </span>
        </Link>

        {/* Center nav — desktop only */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-10 md:flex"
        >
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[14px] tracking-[0.04em] text-[var(--color-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-primary)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right — auth + CTA, desktop */}
        <div className="hidden items-center gap-5 md:flex">
          {isAuthed ? (
            <>
              <Link
                href="/account"
                className="text-[14px] tracking-[0.04em] text-[var(--color-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-primary)]"
              >
                Account
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-[14px] tracking-[0.04em] text-[var(--color-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-primary)]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className={pillButtonClasses({ variant: "solid", size: "sm" })}
              >
                Become a host
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-foreground)] hover:bg-[var(--color-muted)] md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile overlay */}
      <div
        id="mobile-nav"
        className={cn(
          "fixed inset-0 z-40 bg-[var(--color-background)] transition-opacity duration-200 md:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="font-display text-[1.5rem] leading-none tracking-[-0.005em] text-[var(--color-foreground)]"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 600' }}
          >
            DodoStays
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mx-auto flex max-w-md flex-col gap-2 px-6 pt-10">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="ds-display-sm py-3 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
            >
              {l.label}
            </Link>
          ))}

          <div className="mt-8 border-t border-[var(--color-border)] pt-8">
            {isAuthed ? (
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="ds-display-sm block py-3 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
              >
                Account
              </Link>
            ) : (
              <div className="flex flex-col gap-4">
                <Link
                  href="/signin"
                  onClick={() => setOpen(false)}
                  className="text-[14px] tracking-[0.04em] text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className={pillButtonClasses({ variant: "solid", size: "md", className: "w-full" })}
                >
                  Become a host
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

function DodoMark() {
  // Tiny wordmark companion — Onepirate uses pure wordmarks, so we keep the
  // bird small (16px) and let the serif do the lifting.
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="14"
      viewBox="0 0 44 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 22 C8 14, 14 9, 22 9 C28 9, 32 12, 33 16 C34 16.5, 36 17, 37.5 18 C39 19, 40 20.5, 39 21.5 C38 22.5, 35.5 22, 34 21.5 C33.5 24, 32 26, 30 27.5 L31.5 32 L28 32 L27 28.5 C25.5 29, 23.5 29, 22 28.7 L21 32.5 L17.5 32.5 L18.5 28 C13 26, 9.5 24, 8 22 Z"
        fill="currentColor"
      />
      <path
        d="M37 17.5 C38.5 17, 40 17.5, 41 18.5 C40 18.8, 39 18.7, 38 18.2 Z"
        fill="currentColor"
      />
    </svg>
  );
}
