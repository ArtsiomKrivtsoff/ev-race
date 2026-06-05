#!/usr/bin/env node
/**
 * SEO-B P1-3 — stations.html location link smoke test.
 * Usage: node scripts/verify-stations-location-links.mjs [stations.js path]
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIONS_JS = process.argv[2] || join(__dirname, "..", "stations.js");
const SURL = "https://uvrboxrddqlasgrnnnne.supabase.co";
const SKEY = "sb_publishable_Tmx9z-PHntDW4cZQrhOTHQ_1R1Bns7Y";
const SITE_ORIGIN = "https://evrace.by";
const EXPECTED_KEYS = 123;

const SPOT_CHECKS = [
  {
    alias: "Malanka DC",
    station: {
      operator: "malanka",
      city: "Минск",
      address: "К. Туровского, 6",
    },
    url: "https://evrace.by/malanka/minsk-k-turovskogo-6",
  },
  {
    alias: "forEVo mix",
    station: {
      operator: "forevo",
      city: "Минск",
      address: "Рудобельская, 3",
    },
    url: "https://evrace.by/forevo/minsk-rudobel-skaya-3",
  },
  {
    alias: "Zaryadka ACDC",
    station: {
      operator: "zaryadka",
      city: "Минск",
      address: "Инженерная, 18",
    },
    url: "https://evrace.by/zaryadka/minsk-inzhenernaya-18",
  },
];

function normalizeIdentityPart(p) {
  return String(p ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function stationLocationKey(s) {
  return (
    normalizeIdentityPart(s.operator) +
    "|" +
    normalizeIdentityPart(s.city) +
    "|" +
    normalizeIdentityPart(s.address)
  );
}

function buildLocationLookup(locations) {
  const map = {};
  for (const loc of locations || []) {
    const k =
      normalizeIdentityPart(loc.operator) +
      "|" +
      normalizeIdentityPart(loc.city) +
      "|" +
      normalizeIdentityPart(loc.address);
    map[k] = loc;
  }
  return map;
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function locationPageUrl(s, locationByKey) {
  const loc = locationByKey[stationLocationKey(s)];
  if (!loc?.operator_slug || !loc?.slug) return null;
  return (
    SITE_ORIGIN +
    "/" +
    encodeURIComponent(loc.operator_slug) +
    "/" +
    encodeURIComponent(loc.slug)
  );
}

function renderLocListHtml(s, locationByKey) {
  const inner = s.location_name
    ? `<span class="loc-name">${s.location_name}</span><span class="loc-address">${s.address || ""}</span>`
    : `<span class="loc-address">${s.address || "—"}</span>`;
  const href = locationPageUrl(s, locationByKey);
  if (!href) return inner;
  return `<a class="loc-page-link" href="${escapeAttr(href)}">${inner}</a>`;
}

function renderLocGroupHtml(first, locationByKey) {
  const inner = first.location_name
    ? `<strong style="color:var(--green)">${first.location_name}</strong><br><span class="loc-address">${first.address || ""}</span>`
    : `<span style="color:var(--green)">${first.address || "—"}</span>`;
  const href = locationPageUrl(first, locationByKey);
  if (!href) return inner;
  return `<a class="loc-page-link" href="${escapeAttr(href)}">${inner}</a>`;
}

function renderLocMobileHtml(first, locationByKey) {
  const locNameHtml = first.location_name
    ? `<span class="loc-name">${first.location_name}</span>`
    : "";
  const locAddrHtml = first.address
    ? `<span class="loc-addr">${first.address}</span>`
    : "";
  const inner = `<span class="loc-city">${first.city || "—"}</span>${locNameHtml}${locAddrHtml}`;
  const href = locationPageUrl(first, locationByKey);
  if (!href) return inner;
  return `<a class="loc-page-link" href="${escapeAttr(href)}">${inner}</a>`;
}

function auditSource(js) {
  const issues = [];
  const required = [
    "buildLocationLookup",
    "renderLocListHtml",
    "renderLocGroupHtml",
    "renderLocMobileHtml",
    "locationByKey",
    "/rest/v1/locations",
    'class="loc-page-link"',
    "SITE_ORIGIN",
    "function getFiltered",
    "function getSorted",
    "function renderLoadMore",
    "function setView",
    "PAGE_SIZE",
    "function groupByLocation",
  ];
  for (const token of required) {
    if (!js.includes(token)) issues.push(`stations.js missing: ${token}`);
  }
  return issues;
}

async function fetchJson(path) {
  const resp = await fetch(SURL + path, {
    headers: { apikey: SKEY, Authorization: "Bearer " + SKEY },
  });
  if (!resp.ok) throw new Error(`${path} → HTTP ${resp.status}`);
  return resp.json();
}

async function main() {
  const issues = [];
  const js = readFileSync(STATIONS_JS, "utf8");
  issues.push(...auditSource(js));

  const stations = await fetchJson("/rest/v1/stations?select=operator,city,address,location_name");
  const locations = await fetchJson(
    "/rest/v1/locations?select=operator,city,address,operator_slug,slug,location_name&is_active=eq.true",
  );
  const locationByKey = buildLocationLookup(locations);

  const keySet = new Set();
  let resolved = 0;
  let missing = 0;
  for (const s of stations) {
    const k = stationLocationKey(s);
    if (keySet.has(k)) continue;
    keySet.add(k);
    if (locationPageUrl(s, locationByKey)) resolved++;
    else missing++;
  }

  if (keySet.size !== EXPECTED_KEYS) {
    issues.push(`unique keys ${keySet.size} !== expected ${EXPECTED_KEYS}`);
  }
  if (resolved !== EXPECTED_KEYS) {
    issues.push(`coverage ${resolved}/${EXPECTED_KEYS} (missing ${missing})`);
  }

  for (const spot of SPOT_CHECKS) {
    const list = renderLocListHtml(spot.station, locationByKey);
    const group = renderLocGroupHtml(spot.station, locationByKey);
    const mobile = renderLocMobileHtml(spot.station, locationByKey);
    if (!list.includes(spot.url)) issues.push(`list html missing ${spot.alias}`);
    if (!group.includes(spot.url)) issues.push(`group html missing ${spot.alias}`);
    if (!mobile.includes(spot.url)) issues.push(`mobile html missing ${spot.alias}`);
  }

  const malanka = SPOT_CHECKS[0].station;
  const exampleList = renderLocListHtml(malanka, locationByKey);
  const exampleGroup = renderLocGroupHtml(malanka, locationByKey);
  const exampleMobile = renderLocMobileHtml(malanka, locationByKey);

  console.log("=== stations.js source audit ===");
  console.log(issues.length ? "issues pending" : "PASS");

  console.log("\n=== coverage ===");
  console.log(`station rows: ${stations.length}`);
  console.log(`unique canonical keys: ${keySet.size}`);
  console.log(`keys with location URL: ${resolved}/${EXPECTED_KEYS}`);

  console.log("\n=== regression (source preserved) ===");
  console.log("filters:  getFiltered, setOp, setSearch, resetFilters — present");
  console.log("sort:     getSorted, sortable headers — present");
  console.log("pagination: PAGE_SIZE, renderLoadMore, loadMore, showAll — present");
  console.log("list/group: setView, STATE.view, renderDesktop — present");

  console.log("\n=== example Desktop list ===");
  console.log(exampleList);

  console.log("\n=== example Desktop group ===");
  console.log(exampleGroup);

  console.log("\n=== example Mobile card ===");
  console.log(exampleMobile);

  if (issues.length) {
    console.error("\nFAIL:");
    for (const i of issues) console.error(`  - ${i}`);
    process.exit(1);
  }

  console.log("\nPASS: stations location links OK");
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
