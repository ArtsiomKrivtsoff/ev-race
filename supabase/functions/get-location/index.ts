/**
 * get-location — Infrastructure Platform aggregate (Stage 2.1)
 * GET /functions/v1/get-location?operator_slug={slug}&slug={slug}
 *
 * Structured JSON only. No reviews/auth/R2/race layer.
 * HTML escaping happens in Pages Function renderer — not here.
 */

import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const NEARBY_LIMIT = 8;
const SITE_ORIGIN = "https://evrace.by";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type LocationRow = {
  id: number;
  operator: string;
  operator_slug: string;
  city: string;
  address: string;
  location_name: string | null;
  lat: number | null;
  lng: number | null;
  slug: string;
  cached_avg_rating: number | null;
  cached_review_count: number | null;
};

type StationRow = {
  operator: string;
  aggregator: string | null;
  station_type: string | null;
  dc_power: number | null;
  ac_power: number | null;
  count: number | null;
  gun1_type: string | null;
  gun2_type: string | null;
  gun3_type: string | null;
  simultaneous_charge: number | null;
  lat: number | null;
  lng: number | null;
  station_date: string | null;
};

type StationDto = {
  operator: string;
  aggregator: string | null;
  station_type: string | null;
  dc_power: number | null;
  ac_power: number | null;
  count: number;
  connectors: string[];
  gun1_type: string | null;
  gun2_type: string | null;
  gun3_type: string | null;
  simultaneous_charge: number | null;
  lat: number | null;
  lng: number | null;
  station_date: string | null;
};

type NearbyDto = {
  operator: string;
  operator_slug: string;
  city: string;
  address: string;
  location_name: string | null;
  slug: string;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  cached_avg_rating: number | null;
  cached_review_count: number;
  path: string;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function normalizePart(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapStation(row: StationRow): StationDto {
  const connectors = [row.gun1_type, row.gun2_type, row.gun3_type].filter(
    (g): g is string => Boolean(g),
  );
  return {
    operator: row.operator,
    aggregator: row.aggregator ?? null,
    station_type: row.station_type ?? null,
    dc_power: parseNum(row.dc_power),
    ac_power: parseNum(row.ac_power),
    count: row.count ?? 1,
    connectors,
    gun1_type: row.gun1_type ?? null,
    gun2_type: row.gun2_type ?? null,
    gun3_type: row.gun3_type ?? null,
    simultaneous_charge: parseNum(row.simultaneous_charge),
    lat: parseNum(row.lat),
    lng: parseNum(row.lng),
    station_date: row.station_date ?? null,
  };
}

function buildCanonicalUrl(operatorSlug: string, slug: string): string {
  return `${SITE_ORIGIN}/${operatorSlug}/${slug}`;
}

const CONNECTOR_KPI_KEYS = ["ccs", "gbt", "chademo", "type2", "gbt_ac"] as const;

function normalizeConnectorKey(raw: string | null | undefined): string | null {
  const norm = String(raw ?? "")
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase();
  if (!norm) return null;
  const compact = norm.replace(/\s/g, "");
  if (compact === "GBTAC" || norm === "GBT AC") return "gbt_ac";
  if (compact === "TYPE2" || norm === "TYPE 2") return "type2";
  if (compact === "CCS" || compact === "CCS2" || compact.startsWith("CCS")) {
    return "ccs";
  }
  if (compact === "GBT" || norm === "GBT") return "gbt";
  if (compact === "CHADEMO" || norm.startsWith("CHADEMO")) return "chademo";
  return `_other:${norm}`;
}

function connectorLabel(key: string, raw: string): string {
  const fixed: Record<string, string> = {
    ccs: "CCS",
    gbt: "GBT",
    chademo: "CHAdeMO",
    type2: "Type 2",
    gbt_ac: "GBT AC",
  };
  if (fixed[key]) return fixed[key];
  return raw.trim() || key;
}

function collectConnectorLabels(stations: StationDto[]): string[] {
  const seen = new Map<string, string>();
  for (const s of stations) {
    for (const gun of s.connectors) {
      const key = normalizeConnectorKey(gun);
      if (!key || seen.has(key)) continue;
      seen.set(key, gun.trim() || connectorLabel(key, gun));
    }
  }
  const labels: string[] = [];
  for (const key of CONNECTOR_KPI_KEYS) {
    if (seen.has(key)) labels.push(seen.get(key)!);
  }
  for (const [key, label] of seen) {
    if (!CONNECTOR_KPI_KEYS.includes(key as (typeof CONNECTOR_KPI_KEYS)[number])) {
      labels.push(label);
    }
  }
  return labels;
}

function getLocationChargeKind(stations: StationDto[]): "fast" | "ac" {
  let hasFast = false;
  let hasAc = false;
  for (const s of stations) {
    const t = String(s.station_type ?? "").trim().toUpperCase();
    if (t === "DC" || t === "ACDC") hasFast = true;
    else if (t === "AC") hasAc = true;
  }
  if (hasFast) return "fast";
  if (hasAc) return "ac";
  return "fast";
}

function buildDescriptionIntro(
  kind: "fast" | "ac",
  operatorName: string,
  place: string,
): string {
  if (kind === "ac") {
    return `Зарядная станция переменного тока ${operatorName} — ${place}.`;
  }
  return `Быстрая зарядная станция ${operatorName} — ${place}.`;
}

function formatPowerPhrase(
  kind: "fast" | "ac",
  maxDcKw: number,
  maxAcKw: number,
): string {
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

function computeSeoStationStats(stations: StationDto[]) {
  let maxDcKw = 0;
  let maxAcKw = 0;
  let stationCount = 0;
  let totalSim = 0;
  for (const s of stations) {
    const cnt = s.count || 1;
    stationCount += cnt;
    totalSim += (s.simultaneous_charge || 0) * cnt;
    if (s.dc_power) maxDcKw = Math.max(maxDcKw, s.dc_power);
    if (s.ac_power) maxAcKw = Math.max(maxAcKw, s.ac_power);
  }
  return {
    maxDcKw,
    maxAcKw,
    stationCount,
    totalSim,
    connectorLabels: collectConnectorLabels(stations),
    chargeKind: getLocationChargeKind(stations),
  };
}

function joinRuList(items: string[]): string {
  const list = items.filter(Boolean);
  if (!list.length) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} и ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} и ${list[list.length - 1]}`;
}

function buildH1Text(location: LocationRow): string {
  const name = location.location_name?.trim();
  if (name) return name;
  const city = location.city?.trim() ?? "";
  const address = location.address?.trim() ?? "";
  if (city && address) return `${city}, ${address}`;
  return city || address || "—";
}

function buildSeoMeta(location: LocationRow, stations: StationDto[]) {
  const operatorName = location.operator?.trim() || location.operator_slug;
  const city = location.city?.trim() ?? "";
  const address = location.address?.trim() ?? "";
  const place = [city, address].filter(Boolean).join(", ");
  const stats = computeSeoStationStats(stations);

  const intro = buildDescriptionIntro(stats.chargeKind, operatorName, place);
  const power = formatPowerPhrase(
    stats.chargeKind,
    stats.maxDcKw,
    stats.maxAcKw,
  );
  const connectors = stats.connectorLabels.length
    ? `Разъёмы ${joinRuList(stats.connectorLabels)}.`
    : "";
  const tail = "Отзывы, фото и маршрут на EV RACE";
  const parts = [intro];
  if (power) parts.push(`${power}.`);
  if (connectors) parts.push(connectors);
  parts.push(`${tail}.`);
  const metaDescription = parts.join(" ");

  const ogParts: string[] = [];
  const ogPower = formatPowerPhrase(
    stats.chargeKind,
    stats.maxDcKw,
    stats.maxAcKw,
  );
  if (ogPower) ogParts.push(`${ogPower}.`);
  if (stats.connectorLabels.length) {
    ogParts.push(`Разъёмы ${joinRuList(stats.connectorLabels)}`);
  }
  if (place) ogParts.push(place);
  const ogDescriptionShort = `${ogParts.join(". ")}.`;

  const pageTitle =
    `Зарядная станция ${operatorName} — ${place} | EV RACE`;

  return {
    h1: buildH1Text(location),
    page_title: pageTitle,
    meta_description: metaDescription,
    og_description_short: ogDescriptionShort,
    json_ld_name: `Зарядная станция ${operatorName} — ${place}`,
    charge_kind: stats.chargeKind,
    og_title: pageTitle,
    og_description: metaDescription,
  };
}

/** @deprecated use buildSeoMeta */
function buildOgTitle(location: LocationRow): string {
  return buildSeoMeta(location, []).page_title;
}

/** @deprecated use buildSeoMeta */
function buildOgDescription(
  location: LocationRow,
  stations: StationDto[],
): string {
  return buildSeoMeta(location, stations).meta_description;
}

function pickPrimaryAggregator(stations: StationDto[]): string | null {
  for (const s of stations) {
    if (s.aggregator && s.aggregator !== s.operator) return s.aggregator;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const url = new URL(req.url);
  const operatorSlug = (url.searchParams.get("operator_slug") ||
    url.searchParams.get("operator") ||
    "")
    .trim()
    .toLowerCase();
  const slug = (url.searchParams.get("slug") || "")
    .trim()
    .toLowerCase()
    .replace(/\/+/g, "")
    .replace(/\/$/, "");

  if (!operatorSlug || !slug) {
    return jsonResponse({ error: "missing_params" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse({ error: "server_misconfigured" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: locRow, error: locError } = await supabase
    .from("locations")
    .select(
      "id, operator, operator_slug, city, address, location_name, lat, lng, slug, cached_avg_rating, cached_review_count",
    )
    .eq("operator_slug", operatorSlug)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (locError) {
    console.error("location query:", locError.message);
    return jsonResponse({ error: "query_failed" }, 500);
  }

  if (!locRow) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const location = locRow as LocationRow;

  const { data: stationRows, error: stError } = await supabase
    .from("stations")
    .select(
      "operator, aggregator, station_type, dc_power, ac_power, count, gun1_type, gun2_type, gun3_type, simultaneous_charge, lat, lng, station_date",
    )
    .eq("operator", location.operator)
    .eq("city", location.city)
    .eq("address", location.address);

  if (stError) {
    console.error("stations query:", stError.message);
    return jsonResponse({ error: "query_failed" }, 500);
  }

  const stations = (stationRows as StationRow[] || []).map(mapStation);

  const cityNorm = normalizePart(location.city);
  const originLat = parseNum(location.lat);
  const originLng = parseNum(location.lng);

  const { data: nearbyRows, error: nearError } = await supabase
    .from("locations")
    .select(
      "id, operator, operator_slug, city, address, location_name, slug, lat, lng, cached_avg_rating, cached_review_count",
    )
    .eq("is_active", true)
    .neq("id", location.id);

  if (nearError) {
    console.error("nearby query:", nearError.message);
    return jsonResponse({ error: "query_failed" }, 500);
  }

  const nearbyCandidates = (nearbyRows as LocationRow[] || []).filter(
    (row) => normalizePart(row.city) === cityNorm,
  );

  const nearby: NearbyDto[] = nearbyCandidates
    .map((row) => {
      const lat = parseNum(row.lat);
      const lng = parseNum(row.lng);
      let distance_km: number | null = null;

      if (
        originLat !== null &&
        originLng !== null &&
        lat !== null &&
        lng !== null
      ) {
        distance_km = Math.round(haversineKm(originLat, originLng, lat, lng) * 10) /
          10;
      }

      return {
        operator: row.operator,
        operator_slug: row.operator_slug,
        city: row.city,
        address: row.address,
        location_name: row.location_name,
        slug: row.slug,
        lat,
        lng,
        distance_km,
        cached_avg_rating: parseNum(row.cached_avg_rating),
        cached_review_count: row.cached_review_count ?? 0,
        path: `${row.operator_slug}/${row.slug}`,
      };
    })
    .sort((a, b) => {
      if (a.distance_km !== null && b.distance_km !== null) {
        if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
      } else if (a.distance_km !== null) return -1;
      else if (b.distance_km !== null) return 1;

      const ra = a.cached_avg_rating ?? -1;
      const rb = b.cached_avg_rating ?? -1;
      if (ra !== rb) return rb - ra;
      return a.path.localeCompare(b.path);
    })
    .slice(0, NEARBY_LIMIT);

  const canonicalSlug = location.operator_slug.toLowerCase();
  const canonicalPathSlug = location.slug.toLowerCase();
  const canonical_url = buildCanonicalUrl(canonicalSlug, canonicalPathSlug);

  const seo = buildSeoMeta(location, stations);

  const response = {
    location: {
      id: location.id,
      operator: location.operator,
      operator_slug: canonicalSlug,
      city: location.city,
      address: location.address,
      location_name: location.location_name,
      lat: originLat,
      lng: originLng,
      slug: canonicalPathSlug,
      cached_avg_rating: parseNum(location.cached_avg_rating),
      cached_review_count: location.cached_review_count ?? 0,
      aggregator: pickPrimaryAggregator(stations),
    },
    stations,
    nearby,
    community: {
      reviews: [],
      photos: [],
      tags: [],
      review_count: location.cached_review_count ?? 0,
      photo_count: 0,
    },
    meta: {
      canonical_url,
      page_title: seo.page_title,
      meta_description: seo.meta_description,
      og_description_short: seo.og_description_short,
      seo_h1: seo.h1,
      json_ld_name: seo.json_ld_name,
      og_title: seo.og_title,
      og_description: seo.og_description,
      station_count: stations.length,
      is_single_station: stations.length === 1,
    },
  };

  return jsonResponse(response);
});
