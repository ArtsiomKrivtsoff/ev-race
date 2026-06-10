import {
  proxyResponse,
  resolveVoterCookie,
  supabaseForwardHeaders,
  supabaseFunctionUrl,
} from "../_lib/community-signals-proxy.js";

/** @param {import("@cloudflare/workers-types").EventContext} context */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const { cookieValue, setCookie } = resolveVoterCookie(request.headers.get("Cookie"));

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const upstream = await fetch(
    supabaseFunctionUrl(env, "community-signals-status", url.search),
    {
      method: "GET",
      headers: supabaseForwardHeaders(env, cookieValue),
    },
  );

  return proxyResponse(upstream, setCookie);
}

/** @param {import("@cloudflare/workers-types").EventContext} context */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}
