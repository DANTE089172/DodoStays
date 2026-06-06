"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { pillButtonClasses } from "@/components/marketing/pill-button";
import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";

interface NavLink {
  href: string;
  labelKey: keyof Messages["siteHeader"]["links"];
}

// Re-narrow the next-intl messages so the labelKey union stays in lockstep
// with the JSON. (We don't actually need the type to compile — it's a doc
// hint for future contributors.)
type Messages = {
  siteHeader: {
    links: {
      browse: string;
      hosts: string;
      about: string;
      bookings: string;
      account: string;
    };
  };
};

const PUBLIC_LINKS: NavLink[] = [
  { href: "/listings", labelKey: "browse" },
  { href: "/signup", labelKey: "hosts" },
  { href: "/about", labelKey: "about" },
];

const AUTHED_LINKS: NavLink[] = [
  { href: "/listings", labelKey: "browse" },
  { href: "/bookings", labelKey: "bookings" },
  { href: "/host/listings", labelKey: "hosts" },
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
 *
 * Plan 10 added a tiny EN / FR / RU / DE locale switcher. The active locale
 * gets a peach underline; clicking another locale uses next-intl's locale-aware
 * Link, which preserves the current pathname and persists the choice in the
 * `NEXT_LOCALE` cookie automatically (handled by next-intl middleware).
 */
export function SiteHeader() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const t = useTranslations("siteHeader");
  const pathname = usePathname();
  const activeLocale = useLocale();

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
          aria-label={t("homeAriaLabel")}
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
          aria-label={t("primaryNavLabel")}
          className="hidden items-center gap-10 md:flex"
        >
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[14px] tracking-[0.04em] text-[var(--color-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-primary)]"
            >
              {t(`links.${l.labelKey}`)}
            </Link>
          ))}
        </nav>

        {/* Right — locale switcher + auth + CTA, desktop */}
        <div className="hidden items-center gap-5 md:flex">
          <LocaleSwitcher
            pathname={pathname}
            activeLocale={activeLocale}
          />
          {isAuthed ? (
            <Link
              href="/account"
              className="text-[14px] tracking-[0.04em] text-[var(--color-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-primary)]"
            >
              {t("links.account")}
            </Link>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-[14px] tracking-[0.04em] text-[var(--color-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-primary)]"
              >
                {t("links.account") /* fall-through replaced below */}
              </Link>
              <Link
                href="/signup"
                className={pillButtonClasses({ variant: "solid", size: "sm" })}
              >
                {t("becomeHost")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={t("openMenu")}
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
            aria-label={t("closeMenu")}
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
              {t(`links.${l.labelKey}`)}
            </Link>
          ))}

          <div className="mt-8 border-t border-[var(--color-border)] pt-8">
            {isAuthed ? (
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="ds-display-sm block py-3 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
              >
                {t("links.account")}
              </Link>
            ) : (
              <div className="flex flex-col gap-4">
                <Link
                  href="/signin"
                  onClick={() => setOpen(false)}
                  className="text-[14px] tracking-[0.04em] text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
                >
                  {/* common.buttons.signIn */}
                  <SignInLabel />
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className={pillButtonClasses({ variant: "solid", size: "md", className: "w-full" })}
                >
                  {t("becomeHost")}
                </Link>
              </div>
            )}
          </div>

          {/* Locale switcher — mobile, lives at the bottom of the overlay */}
          <div className="mt-10 border-t border-[var(--color-border)] pt-6">
            <p className="ds-eyebrow text-[var(--color-muted-foreground)]">
              {t("language")}
            </p>
            <div className="mt-4">
              <LocaleSwitcher
                pathname={pathname}
                activeLocale={activeLocale}
                onSelect={() => setOpen(false)}
              />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

// --------------------------------------------------------------------------
// Sign-in label is a tiny client component so the desktop header can show
// "Sign in" using the common.buttons.signIn translation while the rest of the
// header stays in the siteHeader namespace.
// --------------------------------------------------------------------------
function SignInLabel() {
  const tCommon = useTranslations("common.buttons");
  return <>{tCommon("signIn")}</>;
}

// --------------------------------------------------------------------------
// Locale switcher — minimal tracked-caps row of locale codes.
// --------------------------------------------------------------------------
interface LocaleSwitcherProps {
  pathname: string;
  activeLocale: string;
  onSelect?: () => void;
}

function LocaleSwitcher({
  pathname,
  activeLocale,
  onSelect,
}: LocaleSwitcherProps) {
  return (
    <ul className="flex items-center gap-2" aria-label="Language">
      {routing.locales.map((loc) => {
        const isActive = loc === activeLocale;
        return (
          <li key={loc}>
            <Link
              href={pathname}
              locale={loc}
              onClick={() => onSelect?.()}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "inline-block px-1.5 py-0.5 text-[11px] uppercase tracking-[0.18em] transition-colors duration-150",
                isActive
                  ? "text-[var(--color-foreground)] underline decoration-[var(--color-primary)] decoration-2 underline-offset-[6px]"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
              )}
            >
              {loc}
            </Link>
          </li>
        );
      })}
    </ul>
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
