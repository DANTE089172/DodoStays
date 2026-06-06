import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

/**
 * Per-request locale resolution. next-intl looks at the URL prefix (provided by
 * the middleware), validates against the `routing.locales` whitelist and falls
 * back to the default locale otherwise. Messages are loaded eagerly per
 * locale — the four JSON packs are tiny (a few KB each).
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = (
    await import(`../../messages/${locale}.json`)
  ).default;

  return {
    locale,
    messages,
  };
});
