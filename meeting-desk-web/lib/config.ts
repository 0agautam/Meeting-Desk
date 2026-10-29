/**
 * App-wide settings you may want to change. Edit the value here and redeploy.
 */

/** Minutes kept free before and after a meeting when a person has no buffer saved yet. */
export const DEFAULT_BUFFER_MIN = 15;

/** How long a sign-in lasts before the person has to enter their email again. */
export const SESSION_LIFETIME_HOURS = 24;

/**
 * The Catalyst organisation id (sent as the CATALYST-ORG header on QuickML calls, as the endpoint's page requires).
 * Not a secret, but different for every deployment, so it comes from the environment (the build script copies it
 * from the deployment's env file). Empty if it isn't set.
 */
export const MD_ORG_ID = process.env.MD_ORG_ID ?? "";
