import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";

// Point the plugin at our request handler so getTranslations / useTranslations
// can resolve messages on the server.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withMDX = createMDX({
  // Plugins added via string names are Turbopack-compatible; we don't need any
  // extras for the journal yet, but leaving the wrapper in place keeps the door
  // open for remark-gfm or rehype-slug if the editorial team wants tables / TOCs.
});

const nextConfig: NextConfig = {
  // Allow .md / .mdx files to be imported as components (used by the journal
  // route). Standard route files (.tsx) still take precedence.
  pageExtensions: ["ts", "tsx", "md", "mdx"],

  // Enable standalone output for Docker deployment (creates optimized server.js
  // with minimal dependencies, reducing image size from ~1GB to ~150MB)
  output: "standalone",
};

export default withNextIntl(withMDX(nextConfig));
