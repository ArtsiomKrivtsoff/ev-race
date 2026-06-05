/**
 * Dynamic sitemap — SEO-B P1-1
 * Route: /sitemap.xml
 */

import { buildSitemapXml, STATIC_SITEMAP_ENTRIES } from "./_lib/sitemap-build.js";

const PAGE_SIZE = 1000;

/**
 * @param {string} supabaseUrl
 * @param {string} supabaseKey
 */
async function fetchActiveLocations(supabaseUrl, supabaseKey) {
  const rows = [];
  let offset = 0;

  while (true) {
    const url =
      `${supabaseUrl}/rest/v1/locations` +
      `?select=operator_slug,slug,updated_at` +
      `&is_active=eq.true` +
      `&order=operator_slug.asc,slug.asc` +
      `&limit=${PAGE_SIZE}&offset=${offset}`;

    const resp = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`locations fetch ${resp.status}: ${body.slice(0, 200)}`);
    }

    const batch = await resp.json();
    if (!Array.isArray(batch)) {
      throw new Error("locations fetch: expected JSON array");
    }

    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export async function onRequestGet(context) {
  const { request, env, waitUntil } = context;

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return new Response("Sitemap misconfigured", { status: 500 });
  }

  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  let locations = [];
  let degraded = false;

  try {
    locations = await fetchActiveLocations(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
    );
  } catch (err) {
    console.error("sitemap locations fetch failed:", err);
    degraded = true;
  }

  const xml = buildSitemapXml(locations);
  const response = new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": degraded
        ? "public, max-age=300, s-maxage=300"
        : "public, max-age=3600, s-maxage=3600",
      ...(degraded ? { "x-sitemap-degraded": "static-only" } : {}),
    },
  });

  if (!degraded) {
    waitUntil(cache.put(request, response.clone()));
  }

  return response;
}

/** Exported for tests — static URL count baseline */
export const staticUrlCount = STATIC_SITEMAP_ENTRIES.length;
