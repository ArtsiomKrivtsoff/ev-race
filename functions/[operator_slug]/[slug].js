/**
 * Infrastructure Platform — location page SSR (Stage 2.2)
 * Route: /{operator_slug}/{slug}
 * NOT Race Layer — no tournament / AI / vote content.
 */

const OP_CLASS = {
  batteryfly: "op-bf",
  forevo: "op-fo",
  zaryadka: "op-za",
  united: "op-uc",
  csms: "op-cs",
  malanka: "op-ma",
  evika: "op-ev",
  orange: "op-or",
  prizma: "op-pr",
  gto: "op-gt",
};

/** Paths like /CSS/arcade.css must not hit get-location (2 URL segments). */
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

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
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

function opClass(operatorSlug) {
  return OP_CLASS[operatorSlug] || "op-unknown";
}

function formatPower(w) {
  if (w == null || !Number.isFinite(Number(w))) return "—";
  return `${Number(w)} кВт`;
}

function computeSummary(stations) {
  let dc = 0;
  let ac = 0;
  let guns = 0;
  let maxDc = 0;
  let maxAc = 0;
  let maxSim = 0;

  for (const s of stations) {
    const cnt = s.count || 1;
    guns += (s.connectors?.length || 0) * cnt;
    if (s.dc_power) {
      dc += cnt;
      maxDc = Math.max(maxDc, s.dc_power);
    }
    if (s.ac_power) {
      ac += cnt;
      maxAc = Math.max(maxAc, s.ac_power);
    }
    if (s.simultaneous_charge) {
      maxSim = Math.max(maxSim, s.simultaneous_charge);
    }
  }

  return { dc, ac, guns, maxDc, maxAc, maxSim };
}

function renderStationRows(stations) {
  return stations
    .map((s) => {
      const connectors = (s.connectors || []).map(escapeHtml).join(", ") || "—";
      const agg =
        s.aggregator && s.aggregator !== s.operator
          ? `<span class="loc-st-agg">в ${escapeHtml(s.aggregator)}</span>`
          : "";
      return `<tr>
<td>${escapeHtml(s.station_type || "—")}</td>
<td>${formatPower(s.dc_power)}</td>
<td>${formatPower(s.ac_power)}</td>
<td>${connectors}</td>
<td>${escapeHtml(String(s.count ?? 1))}</td>
<td>${s.simultaneous_charge != null ? escapeHtml(String(s.simultaneous_charge)) : "—"}</td>
<td>${escapeHtml(s.operator)}${agg}</td>
</tr>`;
    })
    .join("");
}

function renderNearby(nearby) {
  if (!nearby?.length) {
    return `<p class="loc-nearby-empty">Других локаций в этом городе пока нет в реестре.</p>`;
  }
  return nearby
    .slice(0, 8)
    .map((n) => {
      const title = n.location_name || `${n.city}, ${n.address}`;
      const dist =
        n.distance_km != null
          ? `<span class="loc-nearby-dist">${escapeHtml(String(n.distance_km))} км</span>`
          : "";
      const href = `/${escapeHtml(n.operator_slug)}/${escapeHtml(n.slug)}`;
      return `<a class="loc-nearby-item" href="${href}">
<span class="op-filter-btn ${opClass(n.operator_slug)}">${escapeHtml(n.operator)}</span>
<span class="loc-nearby-title">${escapeHtml(title)}</span>
${dist}
</a>`;
    })
    .join("");
}

function renderLocationPage(data) {
  const loc = data.location;
  const stations = data.stations || [];
  const meta = data.meta || {};
  const summary = computeSummary(stations);
  const canonical = meta.canonical_url || `https://evrace.by/${loc.operator_slug}/${loc.slug}`;
  const ogTitle = meta.og_title || "Зарядная локация";
  const ogDesc = meta.og_description || "";
  const isSingle = meta.is_single_station === true;
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

  const mapEmbed = hasCoords
    ? `<iframe class="loc-map-embed" title="Карта" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
src="https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.012}%2C${lat - 0.008}%2C${lng + 0.012}%2C${lat + 0.008}&layer=mapnik&marker=${lat}%2C${lng}"></iframe>`
    : "";

  const ratingBlock =
    loc.cached_review_count > 0 && loc.cached_avg_rating
      ? `<div class="location-rating-big">★ ${escapeHtml(String(loc.cached_avg_rating))}</div>
<span class="location-rating-count">${escapeHtml(String(loc.cached_review_count))} отзывов</span>`
      : `<div class="loc-rating"><span class="loc-rating-stars">★★★★★</span><span class="loc-rating-soon">СКОРО</span></div>`;

  const aggregatorLine =
    loc.aggregator && loc.aggregator !== loc.operator
      ? `<div class="loc-agg-line">Доступ через ${escapeHtml(loc.aggregator)}</div>`
      : "";

  const summaryGrid = isSingle
    ? ""
    : `<div class="stations-summary">
<div class="stations-summary-cell"><span class="ss-val">${summary.dc}</span><span class="ss-lbl">DC</span></div>
<div class="stations-summary-cell"><span class="ss-val">${summary.ac}</span><span class="ss-lbl">AC</span></div>
<div class="stations-summary-cell"><span class="ss-val">${summary.guns}</span><span class="ss-lbl">коннект.</span></div>
<div class="stations-summary-cell"><span class="ss-val">${summary.maxDc || "—"}</span><span class="ss-lbl">макс DC кВт</span></div>
<div class="stations-summary-cell"><span class="ss-val">${summary.maxSim || "—"}</span><span class="ss-lbl">авто сразу</span></div>
</div>`;

  const stationsBlock = isSingle
    ? `<div class="loc-single-tech">
<span>${escapeHtml(stations[0]?.station_type || "—")}</span>
<span>${formatPower(stations[0]?.dc_power)} DC</span>
<span>${(stations[0]?.connectors || []).map(escapeHtml).join(", ") || "—"}</span>
</div>`
    : `${summaryGrid}
<div class="loc-table-wrap">
<table class="reg loc-stations-table">
<thead><tr>
<th>ТИП</th><th>DC</th><th>AC</th><th>РАЗЪЁМЫ</th><th>КОЛ-ВО</th><th>СРАЗУ</th><th>ОПЕРАТОР</th>
</tr></thead>
<tbody>${renderStationRows(stations)}</tbody>
</table>
</div>`;

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
<link rel="prefetch" href="/CSS/tesla-light.css?v=5">
<link rel="prefetch" href="/CSS/tesla-dark.css?v=5">
</head>
<body class="location-page">
<div class="container">
<div class="statusbar" id="statusbar">
<button class="burger-btn" id="burgerBtn" onclick="toggleBurger()" aria-label="Меню"><span></span><span></span><span></span></button>
<div class="nav-desktop">
<a class="nav-link" href="/">ГЛАВНАЯ</a>
<a class="nav-link" href="/tour.html">ТУРНИРНАЯ ТАБЛИЦА</a>
<a class="nav-link" href="/stations.html">СТАНЦИИ 2026</a>
<a class="nav-link" href="/letters.html">ПИСЬМА</a>
<a class="nav-link active" href="/map.html">КАРТА</a>
</div>
<div class="theme-seg">
<button class="theme-seg-btn active" id="btn-arcade" onclick="setTheme('arcade')">⬡ ARCADE</button>
<button class="theme-seg-btn" id="btn-tesla-light" onclick="setTheme('tesla-light')">☀ TESLA</button>
<button class="theme-seg-btn" id="btn-tesla-dark" onclick="setTheme('tesla-dark')">◑ TESLA</button>
</div>
<button class="fx-toggle" id="fxToggle" onclick="toggleFx()" title="Эффекты">
<span class="fx-seg fx-on active" data-state="on">ЭФФЕКТЫ</span>
<span class="fx-seg fx-off" data-state="off">ЧЁТКО</span>
</button>
</div>
<div class="nav-mobile-drop" id="mobileMenu">
<a class="nav-mobile-link" href="/" onclick="closeBurger()">ГЛАВНАЯ</a>
<a class="nav-mobile-link" href="/tour.html" onclick="closeBurger()">ТУРНИРНАЯ ТАБЛИЦА</a>
<a class="nav-mobile-link" href="/stations.html" onclick="closeBurger()">СТАНЦИИ 2026</a>
<a class="nav-mobile-link" href="/letters.html" onclick="closeBurger()">ПИСЬМА</a>
<a class="nav-mobile-link" href="/map.html" onclick="closeBurger()">КАРТА</a>
</div>

<div class="page-wrap">
<nav class="loc-breadcrumbs" aria-label="Навигация">
<a href="/">Главная</a><span>›</span>
<a href="/stations.html">Станции</a><span>›</span>
<span>${escapeHtml(loc.city)}</span><span>›</span>
<span>${escapeHtml(placeTitle)}</span>
</nav>

<section class="location-card loc-identity">
<div class="loc-identity-main">
<div class="loc-identity-head">
<span class="op-filter-btn ${opCls}">${escapeHtml(loc.operator)}</span>
${ratingBlock}
</div>
<h1 class="loc-identity-title">${escapeHtml(placeTitle)}</h1>
<p class="loc-identity-addr">${escapeHtml(loc.city)} · ${escapeHtml(loc.address)}</p>
${aggregatorLine}
${isSingle ? stationsBlock : ""}
<div class="loc-actions">
${routeYandex ? `<a class="loc-btn loc-btn-primary" href="${escapeHtml(routeYandex)}" target="_blank" rel="noopener noreferrer">МАРШРУТ</a>` : ""}
${routeGoogle ? `<a class="loc-btn" href="${escapeHtml(routeGoogle)}" target="_blank" rel="noopener noreferrer">GOOGLE</a>` : ""}
<button class="loc-btn" type="button" onclick="navigator.share&&navigator.share({title:document.title,url:location.href}).catch(function(){})">ПОДЕЛИТЬСЯ</button>
</div>
</div>
<div class="loc-identity-map">${mapEmbed}</div>
</section>

${isSingle ? "" : `<section class="location-card loc-stations-section"><h2 class="loc-section-title">Станции на локации</h2>${stationsBlock}</section>`}

<section class="location-card loc-nearby-section">
<h2 class="loc-section-title">Рядом в ${escapeHtml(loc.city)}</h2>
<div class="loc-nearby-list">${renderNearby(data.nearby)}</div>
</section>

<section class="location-card loc-community-soon">
<h2 class="loc-section-title">Отзывы и фото</h2>
<p class="loc-soon-text">Скоро: полевые отчёты и рейтинг сообщества.</p>
</section>

<div class="footer">
<div class="footer-disclaimer">Данные об установленных станциях носят информационный характер и не являются официальной статистикой операторов.</div>
<div class="footer-copy">© 2026 ARTSIOM KRIVTSOFF | EVRACE.BY</div>
</div>
</div>
</div>
<script src="/JS/location-theme.js?v=1"></script>
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

  const html = renderLocationPage(data);
  const response = new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=600",
    },
  });

  waitUntil(cache.put(request, response.clone()));
  return response;
}
