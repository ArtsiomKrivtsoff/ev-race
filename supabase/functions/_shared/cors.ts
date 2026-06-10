/**
 * CORS for browser calls from evrace.by with credentials (voter cookie).
 */

const ALLOWED_ORIGINS = new Set([
  "https://evrace.by",
  "https://www.evrace.by",
  "http://localhost:8788",
  "http://127.0.0.1:8788",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
]);

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const base: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      ...base,
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    };
  }

  return {
    ...base,
    "Access-Control-Allow-Origin": "*",
  };
}
