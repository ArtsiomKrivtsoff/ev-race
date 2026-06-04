/**
 * Infrastructure Platform — location page SSR (Stage 2.2)
 * Route: /{operator_slug}/{slug}
 */

import { renderSiteHeader, renderSiteFooter } from "../_lib/site-chrome.js";
import {
  escapeHtml,
  opClass,
  computeSummary,
  renderStatCards,
  renderRatingBlock,
  renderStationsTable,
  renderStationsMobile,
  renderNearby,
  renderReportBlock,
  renderPhotosPlaceholder,
  renderTagsPlaceholder,
  renderReviewsPlaceholder,
  renderStatusPlaceholder,
} from "../_lib/location-render.js";

const RESERVED_FIRST_SEGMENTS = new Set([
  "css",
  "js",
  "logos",
  "operators",
  "docs",
  "v2",
  "supabase",
  "build",
  ".well-known",
]);

function shouldServeStatic(operatorSlug, slug) {
  if (slug.includes(".")) return true;
  if (RESERVED_FIRST_SEGMENTS.has(operatorSlug)) return true;
  return false;
}

function render404() {
  return new Response(
    `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Локация не найдена — EVRACE.BY</title>
<link rel="stylesheet" href="/CSS/arcade.css?v=5">
</head>
<body>
<div class="container"><div class="page-wrap" style="padding:24px">
<p>Такой локации в нашем реестре нет.</p>
<p><a href="/stations.html">Смотреть все станции</a></p>
</div></div>
</body>
</html>`,
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function renderLocationPage(data, envConfig) {
  const loc = data.location;
  const stations = data.stations || [];
  const meta = data.meta || {};
  const summary = computeSummary(stations);
  const canonical =
    meta.canonical_url || `https://evrace.by/${loc.operator_slug}/${loc.slug}`;
  const ogTitle = meta.og_title || "Зарядная локация";
  const ogDesc = meta.og_description || "";
  const placeTitle = loc.location_name || `${loc.city}, ${loc.address}`;
  const opCls = opClass(loc.operator_slug);
  const lat = loc.lat;
  const lng = loc.lng;
  const hasCoords = lat != null && lng != null;

  const routeYandex = hasCoords
    ? `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`
    : "";
  const routeGoogle = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : "";

  const aggregatorLine =
    loc.aggregator && loc.aggregator !== loc.operator
      ? `<div class="loc-agg-line">Доступ через ${escapeHtml(loc.aggregator)}</div>`
      : "";

  const mapBlock = hasCoords
    ? `<div class="loc-hero-map" id="loc-map"
  data-lat="${escapeHtml(String(lat))}"
  data-lng="${escapeHtml(String(lng))}"
  data-operator="${escapeHtml(loc.operator_slug)}"
  data-aggregator="${escapeHtml(loc.aggregator || "")}"
  role="img"
  aria-label="Карта локации"></div>`
    : `<div class="loc-hero-map loc-hero-map--empty"><span class="loc-soon-text">Координаты не указаны</span></div>`;

  const stationsWithCity = stations.map((s) => ({
    ...s,
    city: loc.city,
    address: loc.address,
    location_name: loc.location_name,
  }));

  const cfgJson = JSON.stringify({
    supabaseUrl: envConfig.supabaseUrl || "",
    supabaseKey: envConfig.supabaseKey || "",
  });

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>${escapeHtml(ogTitle)} | EVRACE.BY</title>
<meta name="description" content="${escapeHtml(ogDesc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="place">
<meta property="og:title" content="${escapeHtml(ogTitle)}">
<meta property="og:description" content="${escapeHtml(ogDesc)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="https://evrace.by/og.png">
<meta property="og:locale" content="ru_BY">
<meta property="og:site_name" content="EVRACE.BY">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<script type="text/javascript">
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=108141830','ym');
ym(108141830,'init',{ssr:true,webvisor:true,clickmap:true,referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
</script>
<link id="theme-css" rel="stylesheet" href="/CSS/arcade.css?v=5">
<link rel="stylesheet" href="/CSS/operator.css?v=5">
<link rel="stylesheet" href="/CSS/home-v2.css?v=5">
<link rel="stylesheet" href="/CSS/location-page.css?v=1">
<link rel="prefetch" href="/CSS/tesla-light.css?v=5">
<link rel="prefetch" href="/CSS/tesla-dark.css?v=5">
${hasCoords ? '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">' : ""}
<script>window.__EVRACE__=${cfgJson};</script>
</head>
<body class="location-page">
<div class="container">
${renderSiteHeader("stations")}

<div class="page-wrap">
<nav class="loc-breadcrumbs" aria-label="Навигация">
<a href="/">Главная</a><span class="loc-bc-sep">›</span>
<a href="/stations.html">Станции 2026</a><span class="loc-bc-sep">›</span>
<span>${escapeHtml(loc.city)}</span><span class="loc-bc-sep">›</span>
<span>${escapeHtml(placeTitle)}</span>
</nav>

<section class="loc-hero" aria-labelledby="loc-title">
<div class="loc-hero-main">
<div class="loc-hero-head">
<span class="op-filter-btn ${opCls}">${escapeHtml(loc.operator)}</span>
</div>
<h1 class="loc-hero-title" id="loc-title">${escapeHtml(placeTitle)}</h1>
<p class="loc-hero-addr">${escapeHtml(loc.city)} · ${escapeHtml(loc.address)}</p>
${aggregatorLine}
<div class="loc-actions">
${routeYandex ? `<a class="loc-btn loc-btn-primary" href="${escapeHtml(routeYandex)}" target="_blank" rel="noopener noreferrer">МАРШРУТ</a>` : ""}
${routeGoogle ? `<a class="loc-btn" href="${escapeHtml(routeGoogle)}" target="_blank" rel="noopener noreferrer">GOOGLE</a>` : ""}
<button class="loc-btn" type="button" onclick="navigator.share&&navigator.share({title:document.title,url:location.href}).catch(function(){})">ПОДЕЛИТЬСЯ</button>
</div>
</div>
${renderRatingBlock(loc)}
${mapBlock}
</section>

${renderStatCards(summary)}

<div class="loc-main-grid">
<div class="loc-main-col">
<div class="blk loc-stations-blk">
<div class="blk-hdr"><span class="blk-title">СТАНЦИИ НА ЛОКАЦИИ</span><span class="blk-link">${stations.length} шт.</span></div>
${renderStationsTable(stationsWithCity)}
<div class="loc-cards-wrap">${renderStationsMobile(stationsWithCity)}</div>
</div>
${renderTagsPlaceholder()}
${renderReviewsPlaceholder()}
</div>

<aside class="loc-sidebar">
${renderPhotosPlaceholder()}
${renderStatusPlaceholder()}
${renderReportBlock()}
<div class="blk loc-nearby-blk">
<div class="blk-hdr"><span class="blk-title">РЯДОМ · ${escapeHtml(loc.city.toUpperCase())}</span></div>
<div class="loc-nearby-list">${renderNearby(data.nearby)}</div>
</div>
</aside>
</div>

${renderSiteFooter()}
</div>
</div>
<script src="/JS/location-page.js?v=1"></script>
${hasCoords ? '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script src="/JS/location-map.js?v=1"></script>' : ""}
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { request, env, params, waitUntil } = context;

  const operatorSlug = String(params.operator_slug || "")
    .trim()
    .toLowerCase();
  const slug = String(params.slug || "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");

  if (shouldServeStatic(operatorSlug, slug)) {
    return env.ASSETS.fetch(request);
  }

  if (!operatorSlug || !slug || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return render404();
  }

  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const apiUrl =
    `${env.SUPABASE_URL}/functions/v1/get-location?operator_slug=${encodeURIComponent(operatorSlug)}&slug=${encodeURIComponent(slug)}`;

  let apiResp;
  try {
    apiResp = await fetch(apiUrl, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    });
  } catch (err) {
    console.error("get-location fetch failed:", err);
    return render404();
  }

  if (!apiResp.ok) return render404();

  let data;
  try {
    data = await apiResp.json();
  } catch {
    return render404();
  }

  if (data.error) return render404();

  const html = renderLocationPage(data, {
    supabaseUrl: env.SUPABASE_URL,
    supabaseKey: env.SUPABASE_ANON_KEY,
  });
  const response = new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=600",
    },
  });

  waitUntil(cache.put(request, response.clone()));
  return response;
}
