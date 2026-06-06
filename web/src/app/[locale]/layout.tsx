import { notFound } from "next/navigation";
import { Caveat, Fraunces, IBM_Plex_Sans } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { AuthProvider } from "@/lib/auth-context";
import { MuiProvider } from "@/components/mui-provider";
import { routing } from "@/i18n/routing";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "opsz"],
});

// Caveat is on its way out (see plan notes — "Caveat font is dead — don't
// reintroduce"). Two surfaces still reference `--font-caveat` via CSS variable
// (example-queries, search-acknowledgement). Keep loading it for now to avoid
// a visual regression — removing the variable can be a follow-up cleanup.
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

/**
 * Statically render every supported locale at build time.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Lock translations to this locale for the entire RSC tree.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${caveat.variable} ${plex.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider>
          <MuiProvider>
            <AuthProvider>{children}</AuthProvider>
          </MuiProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
