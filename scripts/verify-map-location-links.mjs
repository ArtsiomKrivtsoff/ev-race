#!/usr/bin/env node
/**
 * SEO-B P1-2 — map.html location link smoke test.
 * Usage: node scripts/verify-map-location-links.mjs [map.html path]
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAP_PATH = process.argv[2] || join(__dirname, "..", "map.html");
const SURL = "https://uvrboxrddqlasgrnnnne.supabase.co";
const SKEY = "sb_publishable_Tmx9z-PHntDW4cZQrhOTHQ_1R1Bns7Y";
const SITE_ORIGIN = "https://evrace.by";
const EXPECTED_MARKERS = 123;

const SPOT_CHECKS = [
  {
    alias: "Malanka DC",
    operator: "malanka",
    city: "Минск",
    address: "К. Туровского, 6",
    url: "https://evrace.by/malanka/minsk-k-turovskogo-6",
  },
  {
    alias: "forEVo mix",
    operator: "forevo",
    city: "Минск",
    address: "Рудобельская, 3",
    url: "https://evrace.by/forevo/minsk-rudobel-skaya-3",
  },
  {
    alias: "Zaryadka ACDC",
    operator: "zaryadka",
    city: "Минск",
    address: "Инженерная, 18",
    url: "https://evrace.by/zaryadka/minsk-inzhenernaya-18",
  },
];

const OP_COLORS = {
  malanka: "#76d275",
  forevo: "#b44fff",
  zaryadka: "#00cfff",
};

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

function escapePopupHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function locationPageUrl(loc) {
  if (!loc?.operator_slug || !loc?.slug) return null;
  return (
    SITE_ORIGIN +
    "/" +
    encodeURIComponent(loc.operator_slug) +
    "/" +
    encodeURIComponent(loc.slug)
  );
}

function renderLocationLinks(stations, locationByKey) {
  const seen = new Set();
  const links = [];
  for (const s of stations) {
    const loc = locationByKey[stationLocationKey(s)];
    if (!loc) continue;
    const href = locationPageUrl(loc);
    if (!href || seen.has(href)) continue;
    seen.add(href);
    const color = OP_COLORS[s.operator] || "#00aa2b";
    links.push(
      `<a class="popup-loc-link" href="${escapePopupHtml(href)}" style="border-color:${color};color:${color}">КАРТОЧКА ЛОКАЦИИ →</a>`,
    );
  }
  if (!links.length) return "";
  return `<div class="popup-loc-links">${links.join("")}</div>`;
}

function groupByCoords(stations) {
  const g = {};
  for (const s of stations) {
    const k = `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`;
    if (!g[k]) g[k] = [];
    g[k].push(s);
  }
  return g;
}

function auditMapSource(html) {
  const required = [
    "renderLocationLinks",
    "buildLocationLookup",
    "popup-loc-link",
    "КАРТОЧКА ЛОКАЦИИ →",
    "locationByKey",
    "/rest/v1/locations",
    'href="${escapePopupHtml(href)}"',
  ];
  const issues = [];
  for (const token of required) {
    if (!html.includes(token)) issues.push(`map.html missing: ${token}`);
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
  const html = readFileSync(MAP_PATH, "utf8");
  issues.push(...auditMapSource(html));

  const stations = await fetchJson(
    "/rest/v1/stations?select=operator,city,address,lat,lng&lat=not.is.null",
  );
  const locations = await fetchJson(
    "/rest/v1/locations?select=operator,city,address,operator_slug,slug&is_active=eq.true",
  );
  const locationByKey = buildLocationLookup(locations);

  const groups = groupByCoords(stations);
  const markerCount = Object.keys(groups).length;
  if (markerCount !== EXPECTED_MARKERS) {
    issues.push(`marker count ${markerCount} !== expected ${EXPECTED_MARKERS}`);
  }

  let pinsWithLink = 0;
  let multiKeyPins = 0;
  for (const group of Object.values(groups)) {
    const linkHtml = renderLocationLinks(group, locationByKey);
    if (linkHtml) pinsWithLink++;
    const keys = new Set(group.map(stationLocationKey));
    if (keys.size > 1) multiKeyPins++;
  }

  if (pinsWithLink < EXPECTED_MARKERS) {
    issues.push(
      `pins with location link ${pinsWithLink} < expected ${EXPECTED_MARKERS}`,
    );
  }

  for (const spot of SPOT_CHECKS) {
    const linkHtml = renderLocationLinks([spot], locationByKey);
    if (!linkHtml.includes(spot.url)) {
      issues.push(`spot-check missing link: ${spot.alias}`);
    }
  }

  // Example 1 — single link (Malanka)
  const singleGroup = stations.filter(
    (s) =>
      s.operator === "malanka" &&
      s.city === "Минск" &&
      s.address === "К. Туровского, 6",
  );
  const exampleSingle = renderLocationLinks(singleGroup, locationByKey);

  // Example 2 — multi link (simulated; prod has 0 multi-key pins)
  const exampleMulti = renderLocationLinks(
    [
      {
        operator: "forevo",
        city: "Минск",
        address: "Рудобельская, 3",
      },
      {
        operator: "zaryadka",
        city: "Минск",
        address: "Инженерная, 18",
      },
    ],
    locationByKey,
  );

  console.log("=== map.html source audit ===");
  console.log(issues.length ? "issues pending" : "PASS");

  console.log("\n=== marker regression ===");
  console.log(`station rows with coords: ${stations.length}`);
  console.log(`unique markers (groupByCoords): ${markerCount}`);
  console.log(`pins with ≥1 location link: ${pinsWithLink}`);
  console.log(`multi-key pins in prod: ${multiKeyPins}`);

  console.log("\n=== example popup fragment (single link) ===");
  console.log(exampleSingle || "(empty)");

  console.log("\n=== example popup fragment (multi link, simulated) ===");
  console.log(exampleMulti || "(empty)");

  if (issues.length) {
    console.error("\nFAIL:");
    for (const i of issues) console.error(`  - ${i}`);
    process.exit(1);
  }

  console.log("\nPASS: map location links OK");
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
