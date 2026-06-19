import {
  photosApiUrl,
  photosForwardHeaders,
  resolvePhotosFingerprintCookie,
} from "../../_lib/photos-proxy.js";

const MAX_IDS = 50;

/** @param {import("@cloudflare/workers-types").EventContext} context */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids") || "";
  const ids = [
    ...new Set(
      idsParam
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ].slice(0, MAX_IDS);

  if (!ids.length) {
    return new Response(JSON.stringify({ counts: {} }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  }

  const apiKey = env.PHOTOS_BY_ANON_KEY || env.PHOTOS_ANON_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const { cookieValue } = resolvePhotosFingerprintCookie(
    request.headers.get("Cookie"),
  );

  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const upstream = await fetch(
          photosApiUrl(
            env,
            "photos-gallery",
            `?location_id=${encodeURIComponent(String(id))}&limit=1`,
          ),
          { headers: photosForwardHeaders(env, cookieValue) },
        );
        if (!upstream.ok) return [String(id), 0];
        const data = await upstream.json();
        const total = parseInt(String(data.total ?? 0), 10);
        return [String(id), Number.isFinite(total) && total > 0 ? total : 0];
      } catch (_err) {
        return [String(id), 0];
      }
    }),
  );

  return new Response(JSON.stringify({ counts: Object.fromEntries(entries) }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
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
