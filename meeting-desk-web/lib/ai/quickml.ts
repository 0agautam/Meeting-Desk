import "server-only";
import { MD_ORG_ID } from "@/lib/config";
import { tryGetCatalystApp } from "@/lib/data/catalystApp";

/**
 * Asks the Catalyst QuickML LLM-serving endpoint (GLM-4.7-Flash, single-shot, saved in the console as
 * configuration "meeting-desk-notes") one question and returns its text.
 *
 * The request follows the endpoint's own details page in the console: POST <endpoint url> with the
 * header `x-quickml-endpoint-key` and the body `{ "prompt": "…" }`; the answer comes back as
 * `{ "data": [{ "data": "<text>" }], "usage": …, "model": … }`. The SDK's own HTTP client adds the app's
 * authorization and the Environment headers, so no extra Zoho approval is involved. Needs:
 *   QUICKML_LLM_ENDPOINT_KEY   the endpoint key (secret; AppSail environment variable from .env.catalyst.local)
 *   MD_ORG_ID            the Catalyst organisation id (lib/config.ts)
 *   QUICKML_LLM_ENDPOINT_URL   optional: the "Endpoint URL" from the endpoint's page, if it ever differs from the default below
 * Only works on the deployed app (the SDK needs Catalyst's request headers).
 */
export class AiUnavailableError extends Error {}

/** Where the endpoint page says to POST (the project id is filled in from the running app). */
const defaultEndpointUrl = (projectId: string | number) => `https://console.catalyst.zoho.com/quickml/v1/project/${projectId}/genai/endpoints/glm-flash-47/generate`;

export async function askLlm(prompt: string): Promise<string> {
  const endpointKey = process.env.QUICKML_LLM_ENDPOINT_KEY;
  if (!endpointKey) throw new AiUnavailableError("QUICKML_LLM_ENDPOINT_KEY is not set.");
  if (!MD_ORG_ID) throw new AiUnavailableError("MD_ORG_ID is not set.");
  const app = await tryGetCatalystApp();
  if (!app) throw new AiUnavailableError("Not running inside Catalyst, so the AI isn't reachable.");

  const url = new URL(process.env.QUICKML_LLM_ENDPOINT_URL || defaultEndpointUrl(app.config.projectId));
  const response = await app.quickML().requester.send({
    method: "POST",
    origin: url.origin,
    path: url.pathname,
    data: { prompt },
    type: "json",
    headers: { "x-quickml-endpoint-key": endpointKey, "CATALYST-ORG": MD_ORG_ID },
    catalyst: false,
    user: "admin",
  } as Parameters<ReturnType<typeof app.quickML>["requester"]["send"]>[0]);

  const body = response.data as { data?: { data?: unknown }[]; result?: { content?: unknown }[] } | undefined;
  const text = body?.data?.[0]?.data ?? body?.result?.[0]?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error(`QuickML returned no text (HTTP ${response.statusCode}).`);
  return text;
}
