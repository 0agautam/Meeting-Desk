/**
 * Builds and deploys the AppSail package to ONE Catalyst project, chosen by an env file:
 *
 *   npm run deploy:demo   → .env.catalyst.local (the original test setup)
 *   npm run deploy:abr    → .env.catalyst.abr   (ABR's own deployment)
 *   npm run deploy:appsail -- --env <any env file>
 *
 * Each env file holds that deployment's Catalyst token/organisation/project and its app settings
 * (Zoho, Google, AI keys) plus an optional DEPLOYMENT_NAME label; see docs/NEW-DEPLOYMENT.md. The same code
 * goes to every deployment: only the env file differs, so nothing can leak from one setup into another.
 * The token is never printed.
 *
 * The original test setup deploys from the repository folder (linked to its Catalyst project). Any other
 * env file deploys from its own small workspace folder (meeting-desk-web/.deploy/<name>/, git-ignored), so the demo's project link is not the one deployed to; the Catalyst command line
 * refuses to use another organisation's token inside a folder linked to a different organisation.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { catalystTarget, readEnvFile } from "./lib/envFile.mjs";

const DEFAULT_ENV_FILE = ".env.catalyst.local";
const ROOT = process.cwd(); // meeting-desk-web
const flag = process.argv.indexOf("--env");
const envFile = flag >= 0 ? process.argv[flag + 1] : DEFAULT_ENV_FILE;
if (!envFile) {
  console.error("--env needs a file name.");
  process.exit(1);
}

const env = readEnvFile(path.resolve(ROOT, envFile));
const { token, org, project } = catalystTarget(env);
const missing = [!token && "CATALYST_TOKEN", !org && "CATALYST_ORG", !project && "CATALYST_PROJECT_ID"].filter(Boolean);
if (missing.length) {
  console.error(`${envFile} is missing: ${missing.join(", ")}. Nothing was built or deployed.`);
  process.exit(1);
}

const name = env.DEPLOYMENT_NAME || path.basename(envFile);
console.log("");
console.log("=".repeat(64));
console.log(` DEPLOYING: ${name.toUpperCase()}`);
console.log(` env file:  ${envFile}`);
console.log(` Catalyst:  organisation ${org}, project ${project}`);
console.log("=".repeat(64));
console.log("");

execFileSync("node", ["scripts/build-appsail.mjs"], { cwd: ROOT, stdio: "inherit", env: { ...process.env, ENV_FILE: envFile } });

let cwd = path.resolve(ROOT, ".."); // the repository root, where catalyst.json lives
if (envFile !== DEFAULT_ENV_FILE) {
  cwd = path.join(ROOT, ".deploy", path.basename(envFile).replace(/^\.+/, "").replace(/[^A-Za-z0-9_-]+/g, "-"));
  fs.mkdirSync(cwd, { recursive: true });
  fs.writeFileSync(
    path.join(cwd, "catalyst.json"),
    JSON.stringify({ appsail: [{ source: path.relative(cwd, path.join(ROOT, "catalyst_build")), name: "meeting-desk" }] }, null, 2),
  );
}

execFileSync("catalyst", ["deploy", "--only", "appsail", "--token", token, "--org", org, "--project", project], {
  cwd,
  stdio: "inherit",
  shell: process.platform === "win32", // "catalyst" is a .cmd file on Windows
});
