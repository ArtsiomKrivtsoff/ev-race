#!/usr/bin/env node
/**
 * Local smoke for sitemap XML builder (no network).
 * Usage: node scripts/verify-sitemap-build-local.mjs
 */
import {
  buildSitemapXml,
  STATIC_SITEMAP_ENTRIES,
  formatLastmod,
} from "../functions/_lib/sitemap-build.js";

const sampleLocations = [
  {
    operator_slug: "malanka",
    slug: "minsk-k-turovskogo-6",
    updated_at: "2026-06-05T12:00:00.000Z",
  },
  {
    operator_slug: "forevo",
    slug: "minsk-rudobel-skaya-3",
    updated_at: "2026-06-05T11:00:00.000Z",
  },
];

const issues = [];

if (STATIC_SITEMAP_ENTRIES.length !== 10) {
  issues.push(`static count ${STATIC_SITEMAP_ENTRIES.length} !== 10`);
}

if (formatLastmod("2026-06-05T12:00:00.000Z") !== "2026-06-05") {
  issues.push("formatLastmod failed");
}

const xml = buildSitemapXml(sampleLocations);

if (!xml.includes("<urlset")) issues.push("missing urlset");
if (!xml.includes("https://evrace.by/stations.html")) {
  issues.push("missing stations.html");
}
if (!xml.includes("https://evrace.by/malanka/minsk-k-turovskogo-6")) {
  issues.push("missing sample location");
}
if (!xml.includes("<lastmod>2026-06-05</lastmod>")) {
  issues.push("missing lastmod");
}
if (!xml.includes("<priority>0.8</priority>")) {
  issues.push("missing location priority");
}
if (!xml.includes("<priority>0.5</priority>")) {
  issues.push("missing tour priority 0.5");
}

const degraded = buildSitemapXml([]);
const degradedLocs = (degraded.match(/<loc>/g) || []).length;
if (degradedLocs !== 10) {
  issues.push(`degraded url count ${degradedLocs} !== 10`);
}

if (issues.length) {
  console.error("FAIL:");
  for (const i of issues) console.error(`  - ${i}`);
  process.exit(1);
}

console.log("PASS: sitemap-build local smoke");
console.log(`  static entries: ${STATIC_SITEMAP_ENTRIES.length}`);
console.log(`  sample xml length: ${xml.length} bytes`);
