#!/usr/bin/env node
/** Final SEO-A page audit. Usage: node scripts/audit-seo-a-page.mjs [url] */
const url =
  process.argv[2] || "https://evrace.by/malanka/minsk-k-turovskogo-6";

const FORBIDDEN = String.fromCharCode(
  0x041c, 0x0415, 0x0414, 0x041b, 0x0415, 0x041d, 0x041d,
);

const res = await fetch(url, {
  headers: { "User-Agent": "EVRACE-Final-SEO-A/1.0" },
});
const html = await res.text();

const h1Blocks = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
const h1Texts = h1Blocks.map((m) =>
  m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
);

const ldMatch = html.match(
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,
);
let graph = null;
if (ldMatch) {
  try {
    graph = JSON.parse(ldMatch[1]);
  } catch (e) {
    graph = { parseError: String(e) };
  }
}

const nodes = graph?.["@graph"] || (graph?.parseError ? [] : graph ? [graph] : []);
const webPage = nodes.find((n) => n["@type"] === "WebPage");
const breadcrumbs = nodes.find((n) => n["@type"] === "BreadcrumbList");
const localBusiness = nodes.find((n) => n["@type"] === "LocalBusiness");
const organization = nodes.find((n) => n["@type"] === "Organization");

const canonical = html.match(/<link rel="canonical" href="([^"]*)"/i)?.[1];
const title = html.match(/<title>([^<]*)<\/title>/i)?.[1];
const description = html.match(/<meta name="description" content="([^"]*)"/i)?.[1];
const robots = html.match(/<meta name="robots" content="([^"]*)"/i)?.[1];

const report = {
  url,
  http: { status: res.status, ok: res.ok },
  head: {
    title,
    description,
    canonical,
    robots,
    canonical_matches_url: canonical === url,
    og: {
      type: html.match(/property="og:type" content="([^"]*)"/i)?.[1],
      title: html.match(/property="og:title" content="([^"]*)"/i)?.[1],
      url: html.match(/property="og:url" content="([^"]*)"/i)?.[1],
      image: html.match(/property="og:image" content="([^"]*)"/i)?.[1],
      site_name: html.match(/property="og:site_name" content="([^"]*)"/i)?.[1],
      locale: html.match(/property="og:locale" content="([^"]*)"/i)?.[1],
    },
  },
  h1: {
    count: h1Texts.length,
    texts: h1Texts,
    single: h1Texts.length === 1,
    describes_location:
      h1Texts.length === 1 &&
      /минск|туров|,/i.test(h1Texts[0]) &&
      !/^malanka$/i.test(h1Texts[0].trim()),
  },
  json_ld: {
    script_count: (html.match(/type="application\/ld\+json"/gi) || []).length,
    graph_types: nodes.map((n) => n["@type"]),
    has_evcs: html.includes("ElectricVehicleChargingStation"),
    has_provider_property: Boolean(localBusiness?.provider),
    localBusiness: localBusiness
      ? {
          id: localBusiness["@id"],
          name: localBusiness.name,
          mainEntityOfPage: localBusiness.mainEntityOfPage,
          parentOrganization: localBusiness.parentOrganization,
          provider: localBusiness.provider ?? null,
        }
      : null,
    organization: organization
      ? {
          id: organization["@id"],
          name: organization.name,
          url: organization.url,
        }
      : null,
    breadcrumb_items: breadcrumbs?.itemListElement?.length ?? 0,
    webpage_mainEntity: webPage?.mainEntity ?? null,
  },
  seo_a: {
    ac_legend_ok: html.includes("AC — ЗАРЯДКА ПЕРЕМЕННЫМ ТОКОМ"),
    forbidden_term: new RegExp(FORBIDDEN, "i").test(html),
    deploy_markers: html.includes("@graph") && html.includes("loc-hero-shell"),
    rating_placeholder: html.includes("loc-rating-val--placeholder") && html.includes("X.X"),
  },
  issues: [],
};

function issue(priority, msg) {
  report.issues.push({ priority, message: msg });
}

if (!res.ok) issue("P0", `HTTP ${res.status}`);
if (report.h1.count !== 1) issue("P0", `H1 count = ${report.h1.count}, expected 1`);
if (!report.h1.describes_location) issue("P1", `H1 may not describe location: ${JSON.stringify(h1Texts)}`);
if (canonical !== url) issue("P0", `Canonical mismatch: ${canonical}`);
if (robots !== "index, follow") issue("P1", `robots = ${robots}`);
if (!description) issue("P0", "Missing meta description");
if (!title) issue("P0", "Missing title");
if (!report.head.og.type) issue("P1", "Missing og:type");
if (report.json_ld.has_evcs) issue("P0", "Legacy EVCS in HTML");
if (report.json_ld.has_provider_property) issue("P0", "provider still present on LocalBusiness");
if (!localBusiness) issue("P0", "LocalBusiness missing from @graph");
if (!organization) issue("P0", "Organization missing from @graph");
if (!breadcrumbs) issue("P0", "BreadcrumbList missing");
if (!webPage) issue("P0", "WebPage missing");
if (webPage?.mainEntity) issue("P0", "WebPage.mainEntity present");
if (
  localBusiness?.parentOrganization?.["@id"] !== organization?.["@id"]
) {
  issue("P0", "parentOrganization link broken");
}
if (report.seo_a.forbidden_term) issue("P0", "Forbidden AC terminology in HTML");
if (report.json_ld.script_count !== 1) {
  issue("P1", `JSON-LD script count = ${report.json_ld.script_count}`);
}

report.overall =
  report.issues.filter((i) => i.priority === "P0").length === 0
    ? "SEO-A PASS (automated)"
    : "SEO-A FAIL";

console.log(JSON.stringify(report, null, 2));
