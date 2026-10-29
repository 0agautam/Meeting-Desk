import fs from "node:fs";

/** Minimal KEY=VALUE reader for the private env files (no dependency needed). Ignores comments and surrounding quotes. */
export function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const values = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^"(.*)"$|^'(.*)'$/, "$1$2");
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) values[key] = value;
  }
  return values;
}

/**
 * The Catalyst target (token, organisation, project) from an env file. The newer names (CATALYST_TOKEN,
 * CATALYST_ORG, CATALYST_PROJECT_ID) are preferred; the original ones from the first deployment still work.
 */
export function catalystTarget(env) {
  return {
    token: env.CATALYST_TOKEN || env.CATALYST_User5_ABR_TOKEN || "",
    org: env.CATALYST_ORG || env.CATALYST_ABR_ORG || "",
    project: env.CATALYST_PROJECT_ID || env.CATALYST_ABR_PROJECT_ID || "",
  };
}
