/**
 * FALLBACK build for Catalyst AppSail (use only if Slate can't run what we need —
 * see docs/HOSTING.md). Based on the Trinity build-for-catalyst.mjs pattern.
 *
 *   npm run build:appsail   →  meeting-desk-web/catalyst_build/  (gitignored)
 *
 * Secrets are NOT copied into app-config.json: set them per environment in the
 * Catalyst console (AppSail → Configuration → Environment variables).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, ".next");
const OUT_DIR = path.join(ROOT, "catalyst_build");
const RM = { recursive: true, force: true, maxRetries: 5, retryDelay: 200 };

// Keep in sync with the Node stack chosen in the Catalyst console (verify supported stacks first).
const APPSAIL_STACK = "node22";
const APPSAIL_MEMORY_MB = 512;

fs.rmSync(NEXT_DIR, RM);
fs.rmSync(OUT_DIR, RM);

console.log("Building Next.js (standalone)…");
execSync("npx next build", { stdio: "inherit", env: { ...process.env, BUILD_TARGET: "appsail" } });

const standalone = path.join(NEXT_DIR, "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error("Standalone output missing — check next.config.ts (BUILD_TARGET=appsail).");
  process.exit(1);
}

fs.cpSync(standalone, OUT_DIR, { recursive: true, dereference: true });
fs.cpSync(path.join(NEXT_DIR, "static"), path.join(OUT_DIR, ".next", "static"), { recursive: true });
if (fs.existsSync(path.join(ROOT, "public"))) {
  fs.cpSync(path.join(ROOT, "public"), path.join(OUT_DIR, "public"), { recursive: true });
}

const appConfig = {
  command: "node server.js",
  build_path: ".",
  stack: APPSAIL_STACK,
  memory: APPSAIL_MEMORY_MB,
  env_variables: {
    // AppSail assigns the port via X_ZOHO_CATALYST_LISTEN_PORT, not PORT.
    PORT: "${X_ZOHO_CATALYST_LISTEN_PORT}",
    HOSTNAME: "0.0.0.0",
    BUILD_TARGET: "appsail",
  },
};
fs.writeFileSync(path.join(OUT_DIR, "app-config.json"), JSON.stringify(appConfig, null, 2));

console.log(`AppSail package ready: ${path.relative(ROOT, OUT_DIR)}/`);
