/**
 * Location page SEO-A — canonical templates (Infrastructure Layer).
 * Keep in sync with supabase/functions/get-location/index.ts (buildSeoMeta).
 */

import {
  connectorLegendLabel,
  escapeHtml,
  normalizeConnectorKey,
  stationGunTypes,
} from "./station-badges.js";

const SITE_BRAND = "EV RACE";
const STATIONS_PATH = "/stations.html";

/** @param {string[]} items */
export function joinRuList(items) {
  const list = items.filter(Boolean);
  if (!list.length) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} и ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} и ${list[list.length - 1]}`;
}

/** @param {object} loc */
export function buildH1Text(loc) {
  const name = loc.location_name?.trim();
  if (name) return name;
  const city = String(loc.city ?? "").trim();
  const address = String(loc.address ?? "").trim();
  if (city && address) return `${city}, ${address}`;
  return city || address || "—";
}

/** @param {object} loc @param {string} operatorName */
export function buildJsonLdName(loc, operatorName) {
  const city = String(loc.city ?? "").trim();
  const address = String(loc.address ?? "").trim();
  const place = [city, address].filter(Boolean).join(", ");
  return `Зарядная станция ${operatorName} — ${place}`;
}

/** @param {object} loc @param {string} operatorName */
export function buildPageTitle(loc, operatorName) {
  const city = String(loc.city ?? "").trim();
  const address = String(loc.address ?? "").trim();
  const place = [city, address].filter(Boolean).join(", ");
  return `Зарядная станция ${operatorName} — ${place} | ${SITE_BRAND}`;
}

/** @param {object[]} stations */
function collectConnectorDisplayLabels(stations) {
  const seen = new Map();
  for (const s of stations || []) {
    for (const gun of stationGunTypes(s)) {
      const key = normalizeConnectorKey(gun);
      if (!key || seen.has(key)) continue;
      seen.set(key, String(gun ?? "").trim() || connectorLegendLabel(key));
    }
  }
  const labels = [];
  for (const { key } of [
    { key: "ccs" },
    { key: "gbt" },
    { key: "chademo" },
    { key: "type2" },
    { key: "gbt_ac" },
  ]) {
    if (seen.has(key)) labels.push(seen.get(key));
  }
  for (const [key, label] of seen) {
    if (!["ccs", "gbt", "chademo", "type2", "gbt_ac"].includes(key)) {
      labels.push(label);
    }
  }
  return labels;
}

/** @param {object[]} stations */
export function computeSeoStationStats(stations) {
  let maxDcKw = 0;
  let maxAcKw = 0;
  let stationCount = 0;
  let totalSim = 0;
  const connectorLabels = collectConnectorDisplayLabels(stations);

  for (const s of stations || []) {
    const cnt = s.count || 1;
    stationCount += cnt;
    totalSim += (s.simultaneous_charge || 0) * cnt;
    if (s.dc_power) maxDcKw = Math.max(maxDcKw, s.dc_power);
    if (s.ac_power) maxAcKw = Math.max(maxAcKw, s.ac_power);
  }

  return { maxDcKw, maxAcKw, stationCount, totalSim, connectorLabels };
}

function formatPowerPhrase(maxDcKw, maxAcKw) {
  if (maxDcKw > 0) {
    return `Быстрая зарядка электромобилей до ${maxDcKw} кВт`;
  }
  if (maxAcKw > 0) {
    return `Зарядка электромобилей до ${maxAcKw} кВт`;
  }
  return "";
}

/** @param {object} loc @param {string} operatorName @param {ReturnType<computeSeoStationStats>} stats */
export function buildMetaDescription(loc, operatorName, stats) {
  const city = String(loc.city ?? "").trim();
  const address = String(loc.address ?? "").trim();
  const place = [city, address].filter(Boolean).join(", ");
  const intro = `Зарядная станция ${operatorName} — ${place}.`;
  const power = formatPowerPhrase(stats.maxDcKw, stats.maxAcKw);
  const connectors = stats.connectorLabels.length
    ? `Разъёмы ${joinRuList(stats.connectorLabels)}.`
    : "";
  const tail = "Отзывы, фото и маршрут на EV RACE.";
  return [intro, power, connectors, tail].filter(Boolean).join(" ");
}

/** @param {object} loc @param {ReturnType<computeSeoStationStats>} stats */
export function buildOgDescriptionShort(loc, stats) {
  const city = String(loc.city ?? "").trim();
  const address = String(loc.address ?? "").trim();
  const powerKw = stats.maxDcKw || stats.maxAcKw;
  const parts = [];
  if (powerKw > 0) {
    parts.push(
      stats.maxDcKw > 0
        ? `Быстрая зарядка до ${stats.maxDcKw} кВт`
        : `Зарядка до ${stats.maxAcKw} кВт`,
    );
  }
  if (stats.connectorLabels.length) {
    parts.push(joinRuList(stats.connectorLabels));
  }
  const place = [city, address].filter(Boolean).join(", ");
  if (place) parts.push(place);
  return `${parts.join(". ")}.`;
}

/**
 * @param {object} loc
 * @param {object[]} stations
 * @param {string} operatorName
 */
export function buildLocationSeo(loc, stations, operatorName) {
  const stats = computeSeoStationStats(stations);
  return {
    h1: buildH1Text(loc),
    pageTitle: buildPageTitle(loc, operatorName),
    metaDescription: buildMetaDescription(loc, operatorName, stats),
    ogDescriptionShort: buildOgDescriptionShort(loc, stats),
    jsonLdName: buildJsonLdName(loc, operatorName),
    operatorName,
    stats,
  };
}

/**
 * @param {object} seo from buildLocationSeo
 * @param {object} loc
 * @param {string} canonical
 */
export function buildLocationJsonLd(seo, loc, canonical) {
  const city = String(loc.city ?? "").trim();
  const address = String(loc.address ?? "").trim();
  const stats = seo.stats;

  const evcs = {
    "@context": "https://schema.org",
    "@type": "ElectricVehicleChargingStation",
    name: seo.jsonLdName,
    url: canonical,
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: city,
      addressCountry: "BY",
    },
  };

  if (loc.lat != null && loc.lng != null) {
    evcs.geo = {
      "@type": "GeoCoordinates",
      latitude: Number(loc.lat),
      longitude: Number(loc.lng),
    };
  }

  if (seo.operatorName) {
    evcs.operator = {
      "@type": "Organization",
      name: seo.operatorName,
    };
  }

  const features = [];
  if (stats.maxDcKw > 0) {
    features.push({
      "@type": "LocationFeatureSpecification",
      name: "DC charging",
      value: true,
    });
  }
  if (stats.maxAcKw > 0) {
    features.push({
      "@type": "LocationFeatureSpecification",
      name: "AC charging",
      value: true,
    });
  }
  for (const label of stats.connectorLabels) {
    features.push({
      "@type": "LocationFeatureSpecification",
      name: label,
      value: true,
    });
  }
  if (features.length) evcs.amenityFeature = features;

  const additionalProperty = [];
  if (stats.maxDcKw > 0) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "max_dc_kw",
      value: stats.maxDcKw,
    });
  }
  if (stats.maxAcKw > 0) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "max_ac_kw",
      value: stats.maxAcKw,
    });
  }
  if (stats.stationCount > 0) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "station_count",
      value: stats.stationCount,
    });
  }
  if (stats.totalSim > 0) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "simultaneous_vehicles",
      value: stats.totalSim,
    });
  }
  if (additionalProperty.length) evcs.additionalProperty = additionalProperty;

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Главная",
        item: "https://evrace.by/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Зарядные станции",
        item: `https://evrace.by${STATIONS_PATH}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: city || "—",
      },
      {
        "@type": "ListItem",
        position: 4,
        name: address || seo.h1,
      },
    ],
  };

  return [evcs, breadcrumbs];
}

/** @param {object} seo @param {object} loc @param {string} canonical */
export function renderLocationJsonLd(seo, loc, canonical) {
  const graphs = buildLocationJsonLd(seo, loc, canonical);
  return graphs
    .map(
      (g) =>
        `<script type="application/ld+json">${JSON.stringify(g).replace(/</g, "\\u003c")}</script>`,
    )
    .join("\n");
}

export { escapeHtml };
