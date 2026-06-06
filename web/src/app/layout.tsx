import type { Metadata } from "next";
import "./globals.css";

/**
 * Minimal root layout. Required by Next 16 because every app must own at least
 * one layout that emits `<html>`/`<body>`. The real shell (fonts, MUI provider,
 * auth provider) lives in `[locale]/layout.tsx` so it can wrap children in a
 * `NextIntlClientProvider` for the active locale.
 */
export const metadata: Metadata = {
  title: "DodoStays",
  description: "Stay in Mauritius. Like a local.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
