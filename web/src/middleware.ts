import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * next-intl middleware:
 *   - Redirects `/` to `/{detected-locale}/` based on the Accept-Language
 *     header, falling back to a sticky `NEXT_LOCALE` cookie when set.
 *   - Rewrites locale-prefixed URLs into the same `[locale]` route segment.
 */
export default createMiddleware(routing);

/**
 * Matcher excludes Next internals, the `(dev)` preview routes, API endpoints,
 * static files and image-optimisation paths. Anything user-facing under `/`
 * gets a locale prefix.
 */
export const config = {
  matcher: [
    "/((?!api|_next|_vercel|ui-preview|wizard-preview|.*\\..*).*)",
  ],
};
