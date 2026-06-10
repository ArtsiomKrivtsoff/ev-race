import {
  proxyResponse,
  resolveVoterCookie,
  supabaseForwardHeaders,
  supabaseFunctionUrl,
} from "../_lib/community-signals-proxy.js";

/** @param {import("@cloudflare/workers-types").EventContext} context */
export async function onRequestPost(context) {
  const { request, env } = context;
  const { cookieValue, setCookie } = resolveVoterCookie(request.headers.get("Cookie"));

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const body = await request.text();

  const upstream = await fetch(supabaseFunctionUrl(env, "submit-community-signals"), {
    method: "POST",
    headers: supabaseForwardHeaders(env, cookieValue),
    body,
  });

  return proxyResponse(upstream, setCookie);
}

/** @param {import("@cloudflare/workers-types").EventContext} context */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}
