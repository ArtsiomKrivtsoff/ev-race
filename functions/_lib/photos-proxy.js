/**
 * First-party proxy — BY Photos API on evrace.by
 */

const PHOTOS_FP_COOKIE = "evrace_photos_fp";
const PHOTOS_FP_MAX_AGE = 31536000;

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    out[key] = decodeURIComponent(trimmed.slice(eq + 1));
  }
  return out;
}

export function resolvePhotosFingerprintCookie(cookieHeader) {
  const cookies = parseCookieHeader(cookieHeader);
  const existing = cookies[PHOTOS_FP_COOKIE];
  if (existing && UUID_V4.test(existing)) {
    return { cookieValue: existing, setCookie: null };
  }
  const cookieValue = crypto.randomUUID();
  const setCookie =
    `${PHOTOS_FP_COOKIE}=${encodeURIComponent(cookieValue)}; Path=/; Max-Age=${PHOTOS_FP_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
  return { cookieValue, setCookie };
}

export function photosApiUrl(env, functionName, search = "") {
  const base = String(
    env.PHOTOS_API_BASE || "https://api.evrace.by/functions/v1",
  ).replace(/\/$/, "");
  return `${base}/${functionName}${search}`;
}

export function photosForwardHeaders(env, fpValue, extra = {}) {
  const key = env.PHOTOS_BY_ANON_KEY || env.PHOTOS_ANON_KEY || "";
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Cookie: `${PHOTOS_FP_COOKIE}=${encodeURIComponent(fpValue)}`,
    ...extra,
  };
}

function appendUpstreamSetCookies(upstream, headers) {
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") headers.append("Set-Cookie", value);
  });
}

/** Read/write endpoints — status, upload */
export function photosWriteProxyResponse(upstream, setCookie) {
  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
  );
  appendUpstreamSetCookies(upstream, headers);
  if (setCookie) headers.append("Set-Cookie", setCookie);
  headers.set("Cache-Control", "private, no-store");
  const allowOrigin = upstream.headers.get("Access-Control-Allow-Origin");
  if (allowOrigin) headers.set("Access-Control-Allow-Origin", allowOrigin);
  return new Response(upstream.body, { status: upstream.status, headers });
}

/** Public read — gallery (cacheable) */
export function photosProxyResponse(upstream, setCookie, cacheMaxAge = 300) {
  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
  );
  appendUpstreamSetCookies(upstream, headers);
  if (setCookie) headers.append("Set-Cookie", setCookie);
  const allowOrigin = upstream.headers.get("Access-Control-Allow-Origin");
  if (allowOrigin) headers.set("Access-Control-Allow-Origin", allowOrigin);
  headers.set(
    "Cache-Control",
    `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`,
  );
  return new Response(upstream.body, { status: upstream.status, headers });
}
