import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Point the plugin at our request handler so getTranslations / useTranslations
// can resolve messages on the server.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
