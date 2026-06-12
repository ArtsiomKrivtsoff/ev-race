import {
  photosApiUrl,
  photosForwardHeaders,
  photosWriteProxyResponse,
  resolvePhotosFingerprintCookie,
} from "../../_lib/photos-proxy.js";

/** @param {import("@cloudflare/workers-types").EventContext} context */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const { cookieValue, setCookie } = resolvePhotosFingerprintCookie(
    request.headers.get("Cookie"),
  );

  const apiKey = env.PHOTOS_BY_ANON_KEY || env.PHOTOS_ANON_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const upstream = await fetch(
    photosApiUrl(env, "photos-status", url.search),
    {
      method: "GET",
      headers: photosForwardHeaders(env, cookieValue),
    },
  );

  return photosWriteProxyResponse(upstream, setCookie);
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
