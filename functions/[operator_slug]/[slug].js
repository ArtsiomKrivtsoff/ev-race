/**
 * Infrastructure Platform — location page SSR (Stage 2.2 / v2 layout)
 * Route: /{operator_slug}/{slug}
 */

import { renderSiteHeader, renderSiteFooter } from "../_lib/site-chrome.js";
import {
  escapeHtml,
  opClass,
  opDisplayName,
  computeSummary,
  renderHeroRating,
  renderInfrastructureBlock,
  renderStationsBlock,
  renderNearby,
  renderReportBlock,
  renderPhotosPlaceholder,
  renderReviewsBlock,
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
  const addressLine = `${loc.city}, ${loc.address}`;
  const opCls = opClass(loc.operator_slug);
  const opName = opDisplayName(loc.operator, loc.operator_slug);
  const lat = loc.lat;
  const lng = loc.lng;
  const hasCoords = lat != null && lng != null;

  const routeYandex = hasCoords
    ? `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`
    : "";

  const aggName =
    loc.aggregator && loc.aggregator !== loc.operator
      ? opDisplayName(loc.aggregator, loc.aggregator)
      : null;
  const aggregatorLine = aggName
    ? `<div class="loc-hero-agg">в ${escapeHtml(aggName)}</div>`
    : "";

  const mapBlock = hasCoords
    ? `<div class="loc-hero-map" id="loc-map"
  data-lat="${escapeHtml(String(lat))}"
  data-lng="${escapeHtml(String(lng))}"
  data-operator="${escapeHtml(loc.operator_slug)}"
  data-aggregator="${escapeHtml(loc.aggregator || "")}"
  role="img"
  aria-label="Карта локации"></div>`
    : "";

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

  const titleHtml = loc.location_name
    ? `<p class="loc-hero-venue">${escapeHtml(loc.location_name)}</p>
<h1 class="loc-hero-address" id="loc-title">${escapeHtml(addressLine)}</h1>`
    : `<h1 class="loc-hero-address" id="loc-title">${escapeHtml(addressLine)}</h1>`;

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
<link rel="stylesheet" href="/CSS/location-page.css?v=3">
<link rel="prefetch" href="/CSS/tesla-light.css?v=5">
<link rel="prefetch" href="/CSS/tesla-dark.css?v=5">
${hasCoords ? '<link rel="stylesheet" href="/CSS/vendor/leaflet.css?v=1">' : ""}
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
<span>${escapeHtml(loc.location_name || loc.address)}</span>
</nav>

<section class="loc-hero" aria-labelledby="loc-title">
<div class="loc-hero-body">
${renderHeroRating(loc)}
${titleHtml}
<div class="loc-hero-operator">
<span class="loc-hero-op ${opCls}">${escapeHtml(opName)}</span>
${aggregatorLine}
</div>
<div class="loc-actions">
${routeYandex ? `<a class="loc-btn loc-btn-primary" href="${escapeHtml(routeYandex)}" target="_blank" rel="noopener noreferrer">ПРОЛОЖИТЬ МАРШРУТ</a>` : ""}
<button class="loc-btn" type="button" id="loc-share-btn" onclick="shareLocation()">ПОДЕЛИТЬСЯ</button>
</div>
</div>
${mapBlock}
</section>

${renderInfrastructureBlock(stationsWithCity, summary)}

${renderStationsBlock(stationsWithCity)}

<div class="loc-community-grid">
${renderPhotosPlaceholder()}
${renderReviewsBlock()}
</div>

<div class="blk loc-nearby-blk">
<div class="blk-hdr"><span class="blk-title">РЯДОМ · ${escapeHtml(loc.city.toUpperCase())}</span></div>
<div class="loc-nearby-list">${renderNearby(data.nearby)}</div>
</div>

${renderReportBlock()}

${renderStatusPlaceholder()}

${renderSiteFooter()}
</div>
</div>
<button id="scroll-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Наверх" aria-label="Наверх">↑</button>
<script src="/JS/location-page.js?v=2"></script>
${hasCoords ? '<script src="/JS/vendor/leaflet.js?v=1"></script><script src="/JS/location-map.js?v=1"></script>' : ""}
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
