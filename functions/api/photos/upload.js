import {
  photosApiUrl,
  photosClientIpHeaders,
  photosForwardHeaders,
  photosWriteProxyResponse,
  resolvePhotosFingerprintCookie,
} from "../../_lib/photos-proxy.js";

/** @param {import("@cloudflare/workers-types").EventContext} context */
export async function onRequestPost(context) {
  const { request, env } = context;
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

  const forwardHeaders = photosForwardHeaders(
    env,
    cookieValue,
    photosClientIpHeaders(request),
  );
  const contentType = request.headers.get("Content-Type");
  if (contentType) forwardHeaders["Content-Type"] = contentType;

  const upstream = await fetch(photosApiUrl(env, "photos-upload"), {
    method: "POST",
    headers: forwardHeaders,
    body: request.body,
  });

  return photosWriteProxyResponse(upstream, setCookie);
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
