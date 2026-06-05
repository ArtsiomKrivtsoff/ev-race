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

function buildOgTitle(location: LocationRow): string {
  const place = location.location_name?.trim() ||
    `${location.city}, ${location.address}`;
  return `${place} — зарядка`;
}

function buildOgDescription(
  location: LocationRow,
  stations: StationDto[],
): string {
  const parts: string[] = [];
  let maxDc = 0;
  let maxAc = 0;
  const connectorSet = new Set<string>();

  for (const s of stations) {
    const cnt = s.count || 1;
    if (s.dc_power) maxDc = Math.max(maxDc, s.dc_power * cnt);
    if (s.ac_power) maxAc = Math.max(maxAc, s.ac_power * cnt);
    s.connectors.forEach((c) => connectorSet.add(c));
  }

  if (maxDc) parts.push(`DC ${maxDc} кВт`);
  if (maxAc) parts.push(`AC ${maxAc} кВт`);
  if (connectorSet.size) parts.push([...connectorSet].slice(0, 4).join(", "));

  const rating = location.cached_avg_rating;
  const reviews = location.cached_review_count ?? 0;
  if (rating && reviews > 0) {
    parts.push(`★ ${rating} (${reviews} отзывов)`);
  }

  parts.push(`${location.city}, ${location.address}`);
  return parts.join(". ");
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
      og_title: buildOgTitle(location),
      og_description: buildOgDescription(location, stations),
      station_count: stations.length,
      is_single_station: stations.length === 1,
    },
  };

  return jsonResponse(response);
});
