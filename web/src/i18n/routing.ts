import { defineRouting } from "next-intl/routing";

/**
 * Locale-prefixed routing for DodoStays.
 *
 * Default = English. French / Russian / German added in Plan 10.
 * URL strategy is `localePrefix: "always"` — every URL is `/{locale}/...`.
 * The middleware in `web/middleware.ts` redirects bare `/` to `/{detected}/`.
 */
export const routing = defineRouting({
  locales: ["en", "fr", "ru", "de"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
