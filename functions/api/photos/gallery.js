import {
  photosApiUrl,
  photosForwardHeaders,
  photosProxyResponse,
} from "../../_lib/photos-proxy.js";

/** @param {import("@cloudflare/workers-types").EventContext} context */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const apiKey = env.PHOTOS_BY_ANON_KEY || env.PHOTOS_ANON_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const upstream = await fetch(
    photosApiUrl(env, "photos-gallery", url.search),
    {
      method: "GET",
      headers: photosForwardHeaders(env),
    },
  );

  return photosProxyResponse(upstream, 300);
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
