import { handleTrustPageRequest } from "./_lib/trust-routes.js";

/** @param {import("@cloudflare/workers-types").EventContext} context */
export function onRequestGet(context) {
  return handleTrustPageRequest(context, "how-data-works");
}
