/**
 * Hosting check used to verify Slate (and the AppSail fallback) — see docs/HOSTING.md.
 * Proves: route handlers run, responses are dynamic, and server-only env vars are
 * readable at runtime. It reports only true/false for the env var, never its value.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      ok: true,
      time: new Date().toISOString(),
      buildTarget: process.env.BUILD_TARGET ?? "slate-or-dev",
      nodeVersion: process.version,
      serverEnvCheckPresent: Boolean(process.env.SERVER_ENV_CHECK),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
