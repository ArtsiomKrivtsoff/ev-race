#!/usr/bin/env node
/**
 * SEO-B P1-1 — dynamic sitemap smoke test.
 * Usage: node scripts/verify-sitemap-production.mjs [sitemapUrl] [minLocations]
 */
const SITEMAP_URL =
  process.argv[2] || "https://evrace.by/sitemap.xml";
const MIN_LOCATIONS = Number(process.argv[3] || 123);
const STATIC_COUNT = 10;

const REQUIRED_STATIC = [
  "https://evrace.by/",
  "https://evrace.by/stations.html",
  "https://evrace.by/map.html",
];

const SPOT_CHECK_LOCATIONS = [
  "https://evrace.by/malanka/minsk-k-turovskogo-6",
  "https://evrace.by/forevo/minsk-rudobel-skaya-3",
  "https://evrace.by/zaryadka/minsk-inzhenernaya-18",
];

function extractLocs(xml) {
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    locs.push(m[1].trim());
  }
  return locs;
}

function extractLastmods(xml) {
  const mods = [];
  const re = /<lastmod>([^<]+)<\/lastmod>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    mods.push(m[1].trim());
  }
  return mods;
}

async function main() {
  const issues = [];
  let xml = "";
  let headers = {};

  try {
    const resp = await fetch(SITEMAP_URL, {
      headers: { Accept: "application/xml, text/xml, */*" },
    });
    headers = Object.fromEntries(resp.headers.entries());
    xml = await resp.text();

    if (!resp.ok) {
      issues.push(`HTTP ${resp.status}`);
    }
  } catch (err) {
    console.error("FAIL: fetch failed:", err.message);
    process.exit(1);
  }

  if (!xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    issues.push("missing sitemap xmlns");
  }
  if (!xml.includes("<urlset")) {
    issues.push("missing urlset");
  }

  const locs = extractLocs(xml);
  const unique = new Set(locs);
  const locationUrls = locs.filter(
    (u) =>
      u.startsWith("https://evrace.by/") &&
      !u.includes(".html") &&
      u.split("/").length === 5,
  );

  if (locs.length !== unique.size) {
    issues.push(`duplicate loc entries: ${locs.length - unique.size}`);
  }

  const minTotal = STATIC_COUNT + MIN_LOCATIONS;
  if (locs.length < minTotal) {
    issues.push(
      `url count ${locs.length} < expected ${minTotal} (${STATIC_COUNT} static + ${MIN_LOCATIONS} locations)`,
    );
  }

  if (locationUrls.length < MIN_LOCATIONS) {
    issues.push(
      `location urls ${locationUrls.length} < min ${MIN_LOCATIONS}`,
    );
  }

  for (const url of REQUIRED_STATIC) {
    if (!locs.includes(url)) {
      issues.push(`missing static url: ${url}`);
    }
  }

  for (const url of SPOT_CHECK_LOCATIONS) {
    if (!locs.includes(url)) {
      issues.push(`missing spot-check location: ${url}`);
    }
  }

  const lastmods = extractLastmods(xml);
  const badLastmod = lastmods.filter((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d));
  if (badLastmod.length) {
    issues.push(`invalid lastmod format: ${badLastmod.slice(0, 3).join(", ")}`);
  }

  const degraded = headers["x-sitemap-degraded"] === "static-only";

  console.log(`Sitemap: ${SITEMAP_URL}`);
  console.log(`Total URLs: ${locs.length}`);
  console.log(`Location URLs: ${locationUrls.length}`);
  console.log(`Static URLs: ${locs.length - locationUrls.length}`);
  console.log(`lastmod entries: ${lastmods.length}`);
  if (degraded) {
    console.log("WARN: x-sitemap-degraded=static-only (Supabase fetch failed)");
  }

  if (issues.length) {
    console.error("\nFAIL:");
    for (const i of issues) console.error(`  - ${i}`);
    process.exit(1);
  }

  console.log("\nPASS: dynamic sitemap OK");
}

main();
