/**
 * First-party proxy helpers — Community Signals voter cookie on evrace.by
 */

const VOTER_COOKIE_NAME = "evrace_voter";
const VOTER_COOKIE_MAX_AGE = 31536000;

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

export function resolveVoterCookie(cookieHeader) {
  const cookies = parseCookieHeader(cookieHeader);
  const existing = cookies[VOTER_COOKIE_NAME];
  if (existing && UUID_V4.test(existing)) {
    return { cookieValue: existing, setCookie: null };
  }
  const cookieValue = crypto.randomUUID();
  const setCookie =
    `${VOTER_COOKIE_NAME}=${encodeURIComponent(cookieValue)}; Path=/; Max-Age=${VOTER_COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
  return { cookieValue, setCookie };
}

export function supabaseFunctionUrl(env, functionName, search = "") {
  const base = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  return `${base}/functions/v1/${functionName}${search}`;
}

export function supabaseForwardHeaders(env, voterValue) {
  const key = env.SUPABASE_ANON_KEY || "";
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Cookie: `${VOTER_COOKIE_NAME}=${encodeURIComponent(voterValue)}`,
  };
}

export function proxyResponse(upstream, setCookie) {
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/json; charset=utf-8");
  const allowOrigin = upstream.headers.get("Access-Control-Allow-Origin");
  if (allowOrigin) headers.set("Access-Control-Allow-Origin", allowOrigin);
  if (setCookie) headers.append("Set-Cookie", setCookie);
  headers.set("Cache-Control", "private, no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
}
