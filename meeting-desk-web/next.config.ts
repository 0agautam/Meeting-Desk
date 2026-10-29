import type { NextConfig } from "next";

/**
 * Hosting: Catalyst Slate is the primary target (see docs/HOSTING.md).
 * AppSail is the fallback: `npm run build:appsail` sets BUILD_TARGET=appsail,
 * which switches on standalone output for scripts/build-appsail.mjs.
 * Slate builds with the plain `npm run build` (no standalone).
 */
const isAppSail = process.env.BUILD_TARGET === "appsail";

const nextConfig: NextConfig = {
  ...(isAppSail ? { output: "standalone" as const } : {}),
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // AppSail's reverse proxy sends x-forwarded-host with an explicit ":443", which
      // doesn't match the browser's Origin header (default ports are omitted there) —
      // Next's Server Actions CSRF check then rejects every action with "Invalid Server
      // Actions request" (found live, Sep 29, 2026). Allowlist both hosting domains, plus ABR's own address.
      allowedOrigins: ["**.catalystappsail.com", "**.onslate.com", "meetings.amazingbusinessresults.com"],
    },
  },
};

export default nextConfig;
