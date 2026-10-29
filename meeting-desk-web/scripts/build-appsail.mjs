/**
 * FALLBACK build for Catalyst AppSail (use only if Slate can't run what we need —
 * see docs/HOSTING.md). Based on the Trinity build-for-catalyst.mjs pattern.
 *
 *   npm run build:appsail   →  meeting-desk-web/catalyst_build/  (gitignored)
 *
 * Environment variables: `catalyst deploy` REPLACES the AppSail's variables with the
 * env_variables written below — anything added only in the console is wiped on the next
 * deploy (found Oct 2, 2026). So the app's own settings (DEPLOY_ENV_VARS) are read from
 * the private, git-ignored env file (.env.catalyst.local, or the file named by ENV_FILE) at build time and written
 * into catalyst_build/app-config.json, which is also gitignored.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { catalystTarget, readEnvFile } from "./lib/envFile.mjs";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, ".next");
const OUT_DIR = path.join(ROOT, "catalyst_build");
const RM = { recursive: true, force: true, maxRetries: 5, retryDelay: 200 };

/** Settings the deployed app reads from process.env, supplied at build time. Add new ones here. */
const DEPLOY_ENV_VARS = ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "QUICKML_LLM_ENDPOINT_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];

/** Settings that are only written when present (no warning when absent). */
const OPTIONAL_ENV_VARS = ["QUICKML_LLM_ENDPOINT_URL"];

/** Which private env file this build is for (one per deployment: yours, ABR's, …). Default: .env.catalyst.local */
const ENV_FILE = process.env.ENV_FILE || ".env.catalyst.local";

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

// AppSail's app-config.json env_variables does NOT do ${VAR} template substitution —
// it sets the literal string, which parseInt() can't read, silently falling back to
// port 3000 and crash-looping (confirmed via Catalyst logs, Sep 29, 2026). AppSail
// assigns the real port through process.env.X_ZOHO_CATALYST_LISTEN_PORT directly, so
// read that from inside the server process instead of trying to template it in.
const serverJsPath = path.join(OUT_DIR, "server.js");
const serverJs = fs.readFileSync(serverJsPath, "utf8");
fs.writeFileSync(
  serverJsPath,
  `process.env.PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || "3000";\n${serverJs}`,
);

const privateEnv = readEnvFile(path.resolve(ROOT, ENV_FILE));
const appEnv = {};
// Values come from the deployment's own env file. Shell variables (direnv exports the demo's into any shell
// opened in this repo) are only a fallback for the default demo file, so a build for another deployment can
// never pick up the demo's secrets by accident; a missing value is warned about instead.
const usingDefaultEnvFile = ENV_FILE === ".env.catalyst.local";
const fromShell = (name) => (usingDefaultEnvFile ? process.env[name] : undefined);
for (const name of DEPLOY_ENV_VARS) {
  const value = privateEnv[name] || fromShell(name);
  if (value) appEnv[name] = value;
  else console.warn(`WARNING: ${name} is not set in ${ENV_FILE} — the deployed app won't have it.`);
}
for (const name of OPTIONAL_ENV_VARS) {
  const value = privateEnv[name] || fromShell(name);
  if (value) appEnv[name] = value;
}
// The Catalyst organisation id (sent with QuickML calls); the same value the deploy command targets.
const orgId = catalystTarget(privateEnv).org;
if (orgId) appEnv.MD_ORG_ID = orgId;
else console.warn(`WARNING: no Catalyst organisation id (CATALYST_ORG) in ${ENV_FILE} — the AI notes reading won't work.`);

const appConfig = {
  command: "node server.js",
  build_path: ".",
  stack: APPSAIL_STACK,
  memory: APPSAIL_MEMORY_MB,
  env_variables: {
    HOSTNAME: "0.0.0.0",
    BUILD_TARGET: "appsail",
    ...appEnv,
  },
};
fs.writeFileSync(path.join(OUT_DIR, "app-config.json"), JSON.stringify(appConfig, null, 2));

console.log(`AppSail package ready: ${path.relative(ROOT, OUT_DIR)}/`);
