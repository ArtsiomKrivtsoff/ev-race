#!/usr/bin/env node
/**
 * Production SEO-A verification for location pages.
 * Usage: node scripts/verify-location-seo-production.mjs [url]
 */

const url =
  process.argv[2] || "https://evrace.by/zaryadka/minsk-inzhenernaya-18";

const res = await fetch(url, {
  headers: { "User-Agent": "EVRACE-SEO-A-Verifier/1.0" },
});
if (!res.ok) {
  console.error("FAIL fetch", res.status, url);
  process.exit(1);
}
const html = await res.text();

const report = {
  url,
  checks: {},
};

const h1Matches = [...html.matchAll(/<h1\b[^>]*>/gi)];
report.checks.single_h1 = {
  pass: h1Matches.length === 1,
  count: h1Matches.length,
};

const ldMatch = html.match(
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,
);
let graph = null;
if (ldMatch) {
  try {
    graph = JSON.parse(ldMatch[1]);
  } catch (e) {
    report.checks.json_ld_parse = { pass: false, error: String(e) };
  }
}

if (graph) {
  const nodes = graph["@graph"] || [graph];
  const evcs = nodes.find(
    (n) => n["@type"] === "ElectricVehicleChargingStation",
  );
  const crumbs = nodes.find((n) => n["@type"] === "BreadcrumbList");

  report.checks.evcs_present = {
    pass: Boolean(evcs),
    name: evcs?.name,
    has_address: Boolean(evcs?.address?.streetAddress),
    has_geo: Boolean(evcs?.geo?.latitude && evcs?.geo?.longitude),
    has_url: Boolean(evcs?.url),
    has_operator: Boolean(evcs?.operator?.name),
    connector_types: evcs?.additionalProperty?.find(
      (p) => p.name === "connector_types",
    )?.value,
    max_power_kw: evcs?.additionalProperty?.find(
      (p) => p.name === "max_power_kw",
    )?.value,
  };

  const items = crumbs?.itemListElement || [];
  const crumbValid =
    items.length >= 3 &&
    items.every((it, i) => it.position === i + 1 && it.name) &&
    items.slice(0, -1).every((it) => Boolean(it.item)) &&
    Boolean(items[items.length - 1]?.item);
  report.checks.breadcrumb_list = {
    pass: crumbValid,
    items: items.map((it) => ({
      position: it.position,
      name: it.name,
      item: it.item,
    })),
  };
}

const descMatch = html.match(
  /<meta name="description" content="([^"]*)"/i,
);
const description = descMatch?.[1] || "";
report.checks.description_logic = {
  pass:
    /Быстрая зарядная станция|Зарядная станция переменного тока/.test(
      description,
    ) && /Разъёмы/.test(description),
  description,
};

report.checks.connector_coverage = {
  pass: /Разъёмы (CCS|CCS2|GBT|Type 2|CHAdeMO)/i.test(description),
};

report.checks.open_graph = {
  pass:
    html.includes('property="og:type" content="website"') &&
    html.includes('property="og:site_name" content="EV RACE"'),
  og_image: html.match(/property="og:image" content="([^"]*)"/i)?.[1],
};

const allPass = Object.values(report.checks).every((c) => c.pass !== false);
report.overall = allPass ? "PASS" : "FAIL";

console.log(JSON.stringify(report, null, 2));
process.exit(allPass ? 0 : 1);
