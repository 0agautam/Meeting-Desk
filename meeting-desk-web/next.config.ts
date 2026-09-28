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
};

export default nextConfig;
