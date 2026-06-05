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

const SITE_ORIGIN = "https://evrace.by";
const SITE_BRAND = "EV RACE";
const STATIONS_PATH = "/stations.html";
const OG_IMAGE_LOCATION = `${SITE_ORIGIN}/og-map.png`;
const OG_IMAGE_FALLBACK = `${SITE_ORIGIN}/og.png`;

/**
 * Stable Organization @id for JSON-LD (immutable after Phase A launch).
 * Canonical pattern: /operator/{slug}
 * @param {string} operatorSlug
 */
export function buildOperatorOrganizationId(operatorSlug) {
  const slug = String(operatorSlug ?? "").trim().toLowerCase();
  if (!slug) return null;
  return `${SITE_ORIGIN}/operator/${slug}`;
}

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

/**
 * DC / ACDC → fast intro; pure AC location → ac intro.
 * Mixed DC+AC → fast (any DC/ACDC wins).
 * @param {object[]} stations
 * @returns {"fast"|"ac"}
 */
export function getLocationChargeKind(stations) {
  let hasFast = false;
  let hasAc = false;
  for (const s of stations || []) {
    const t = String(s.station_type ?? "").trim().toUpperCase();
    if (t === "DC" || t === "ACDC") hasFast = true;
    else if (t === "AC") hasAc = true;
  }
  if (hasFast) return "fast";
  if (hasAc) return "ac";
  return "fast";
}

/** @param {"fast"|"ac"} kind @param {string} operatorName @param {string} place */
export function buildDescriptionIntro(kind, operatorName, place) {
  if (kind === "ac") {
    return `Зарядная станция переменного тока ${operatorName} — ${place}.`;
  }
  return `Быстрая зарядная станция ${operatorName} — ${place}.`;
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
  for (const key of ["ccs", "gbt", "chademo", "type2", "gbt_ac"]) {
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
  let totalInstalledKw = 0;
  const connectorLabels = collectConnectorDisplayLabels(stations);
  const chargeKind = getLocationChargeKind(stations);

  for (const s of stations || []) {
    const cnt = s.count || 1;
    stationCount += cnt;
    totalSim += (s.simultaneous_charge || 0) * cnt;
    totalInstalledKw += ((s.dc_power || 0) + (s.ac_power || 0)) * cnt;
    if (s.dc_power) maxDcKw = Math.max(maxDcKw, s.dc_power);
    if (s.ac_power) maxAcKw = Math.max(maxAcKw, s.ac_power);
  }

  return {
    maxDcKw,
    maxAcKw,
    stationCount,
    totalSim,
    totalInstalledKw,
    connectorLabels,
    chargeKind,
  };
}

/** @param {"fast"|"ac"} kind @param {number} maxDcKw @param {number} maxAcKw */
function formatPowerPhrase(kind, maxDcKw, maxAcKw) {
  if (kind === "ac" && maxAcKw > 0) {
    return `Зарядка электромобилей до ${maxAcKw} кВт`;
  }
  if (maxDcKw > 0) {
    return `Зарядка электромобилей до ${maxDcKw} кВт`;
  }
  if (maxAcKw > 0) {
    return `Зарядка электромобилей до ${maxAcKw} кВт`;
  }
  return "";
}

/** @param {ReturnType<computeSeoStationStats>} stats */
export function computeSeoMaxPostKw(stats) {
  if (stats.chargeKind === "ac" && stats.maxAcKw > 0) return stats.maxAcKw;
  if (stats.maxDcKw > 0) return stats.maxDcKw;
  if (stats.maxAcKw > 0) return stats.maxAcKw;
  return 0;
}

/** @param {object} loc @param {string} operatorName @param {ReturnType<computeSeoStationStats>} stats */
export function buildMetaDescription(loc, operatorName, stats) {
  const city = String(loc.city ?? "").trim();
  const address = String(loc.address ?? "").trim();
  const place = [city, address].filter(Boolean).join(", ");
  const intro = buildDescriptionIntro(stats.chargeKind, operatorName, place);
  const power = formatPowerPhrase(stats.chargeKind, stats.maxDcKw, stats.maxAcKw);
  const connectors = stats.connectorLabels.length
    ? `Разъёмы ${joinRuList(stats.connectorLabels)}.`
    : "";
  const tail = "Отзывы, фото и маршрут на EV RACE";
  const parts = [intro];
  if (power) parts.push(`${power}.`);
  if (connectors) parts.push(connectors);
  parts.push(`${tail}.`);
  return parts.join(" ");
}

/** @param {object} loc @param {ReturnType<computeSeoStationStats>} stats */
export function buildOgDescriptionShort(loc, stats) {
  const city = String(loc.city ?? "").trim();
  const address = String(loc.address ?? "").trim();
  const parts = [];
  const power = formatPowerPhrase(stats.chargeKind, stats.maxDcKw, stats.maxAcKw);
  if (power) parts.push(power);
  if (stats.connectorLabels.length) {
    parts.push(`Разъёмы ${joinRuList(stats.connectorLabels)}`);
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
    ogImage: OG_IMAGE_LOCATION,
    stats,
  };
}

/**
 * @param {ReturnType<computeSeoStationStats>} stats
 */
function buildLocationAmenityFeatures(stats) {
  const amenityFeature = [];
  if (stats.maxDcKw > 0) {
    amenityFeature.push({
      "@type": "LocationFeatureSpecification",
      name: "DC charging",
      value: true,
    });
  }
  if (stats.maxAcKw > 0) {
    amenityFeature.push({
      "@type": "LocationFeatureSpecification",
      name: "AC charging",
      value: true,
    });
  }
  for (const label of stats.connectorLabels) {
    amenityFeature.push({
      "@type": "LocationFeatureSpecification",
      name: label,
      value: true,
    });
  }
  return amenityFeature;
}

/**
 * @param {ReturnType<computeSeoStationStats>} stats
 */
function buildLocationAdditionalProperties(stats) {
  const maxPowerKw = stats.maxDcKw || stats.maxAcKw || null;
  const connectorTypes = stats.connectorLabels.join(", ");
  const additionalProperty = [];
  if (connectorTypes) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "connector_types",
      value: connectorTypes,
    });
  }
  if (maxPowerKw) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "max_power_kw",
      value: maxPowerKw,
    });
  }
  if (stats.totalInstalledKw > 0) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "total_installed_kw",
      value: stats.totalInstalledKw,
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
      name: "simultaneous_charging_count",
      value: stats.totalSim,
    });
  }
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
  return additionalProperty;
}

/**
 * @param {object} seo
 * @param {object} loc
 * @param {string} canonical
 */
export function buildLocationJsonLdGraph(seo, loc, canonical) {
  const city = String(loc.city ?? "").trim();
  const address = String(loc.address ?? "").trim();
  const stats = seo.stats;
  const breadcrumbLabel =
    [city, address].filter(Boolean).join(", ") || seo.h1;

  const businessId = `${canonical}#business`;
  const breadcrumbId = `${canonical}#breadcrumb`;
  const operatorOrgId = buildOperatorOrganizationId(loc.operator_slug);

  const localBusiness = {
    "@type": "LocalBusiness",
    "@id": businessId,
    mainEntityOfPage: { "@id": canonical },
    name: seo.jsonLdName,
    description: seo.metaDescription,
    url: canonical,
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: city,
      addressCountry: "BY",
    },
  };

  if (loc.lat != null && loc.lng != null) {
    localBusiness.geo = {
      "@type": "GeoCoordinates",
      latitude: Number(loc.lat),
      longitude: Number(loc.lng),
    };
  }

  if (operatorOrgId && seo.operatorName) {
    localBusiness.parentOrganization = { "@id": operatorOrgId };
  }

  const amenityFeature = buildLocationAmenityFeatures(stats);
  if (amenityFeature.length) localBusiness.amenityFeature = amenityFeature;

  const additionalProperty = buildLocationAdditionalProperties(stats);
  if (additionalProperty.length) {
    localBusiness.additionalProperty = additionalProperty;
  }

  const breadcrumbs = {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Главная",
        item: `${SITE_ORIGIN}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Зарядные станции",
        item: `${SITE_ORIGIN}${STATIONS_PATH}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: breadcrumbLabel,
        item: canonical,
      },
    ],
  };

  const webPage = {
    "@type": "WebPage",
    "@id": canonical,
    url: canonical,
    name: seo.pageTitle,
    description: seo.metaDescription,
    inLanguage: "ru-BY",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_BRAND,
      url: `${SITE_ORIGIN}/`,
    },
    breadcrumb: { "@id": breadcrumbId },
  };

  /** @type {object[]} */
  const graph = [webPage, breadcrumbs, localBusiness];

  if (operatorOrgId && seo.operatorName) {
    graph.splice(2, 0, {
      "@type": "Organization",
      "@id": operatorOrgId,
      name: seo.operatorName,
      url: operatorOrgId,
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

/** @param {object} seo @param {object} loc @param {string} canonical */
export function renderLocationJsonLd(seo, loc, canonical) {
  const graph = buildLocationJsonLdGraph(seo, loc, canonical);
  return `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, "\\u003c")}</script>`;
}

export { escapeHtml, OG_IMAGE_LOCATION, OG_IMAGE_FALLBACK };
