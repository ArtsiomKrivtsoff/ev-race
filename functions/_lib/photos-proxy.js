/**
 * First-party proxy — BY Photos API on evrace.by
 */

export function photosApiUrl(env, functionName, search = "") {
  const base = String(
    env.PHOTOS_API_BASE || "https://api.evrace.by/functions/v1",
  ).replace(/\/$/, "");
  return `${base}/${functionName}${search}`;
}

export function photosForwardHeaders(env) {
  const key = env.PHOTOS_BY_ANON_KEY || env.PHOTOS_ANON_KEY || "";
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

export function photosProxyResponse(upstream, cacheMaxAge = 300) {
  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
  );
  const allowOrigin = upstream.headers.get("Access-Control-Allow-Origin");
  if (allowOrigin) headers.set("Access-Control-Allow-Origin", allowOrigin);
  headers.set(
    "Cache-Control",
    `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`,
  );
  return new Response(upstream.body, { status: upstream.status, headers });
}
