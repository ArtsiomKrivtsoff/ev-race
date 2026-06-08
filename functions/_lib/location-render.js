/**
 * Location page — SSR fragments (Infrastructure Platform polish v3).
 * Design tokens: home-v2.css + location-page.css
 */

import {
  escapeHtml,
  expandStationsByCount,
  formatConnectorLegendLines,
  formatStationPower,
  normalizeConnectorKey,
  renderStationDcAcLegend,
  renderStationGuns,
  renderTypeBadge,
  stationGunTypes,
} from "./station-badges.js";

export const OP_NAMES = {
  batteryfly: "BatteryFly",
  forevo: "forEVo",
  zaryadka: "Zaryadka",
  united: "United Company",
  csms: "ЦСМС",
  malanka: "Malanka",
  evika: "Evika!",
  orange: "Orange",
  prizma: "Prizma",
  gto: "Белтехосмотр",
  istpal: "ИстПал",
};

export const OP_CLASS = {
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
  istpal: "op-other",
};

const NEGATIVE_TAG_HINTS = [
  "медлен",
  "занят",
  "ice",
  "двс",
  "сломан",
  "не работ",
  "очеред",
];

export { escapeHtml };

export function opClass(slug) {
  return OP_CLASS[slug] || "op-other";
}

export function opDisplayName(operator, operatorSlug) {
  if (operatorSlug && OP_NAMES[operatorSlug]) return OP_NAMES[operatorSlug];
  return operator || "—";
}

export function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const p = dateStr.split("-");
  if (p.length < 3) return escapeHtml(dateStr);
  return `${p[2]}.${p[1]}.${p[0].slice(2)}`;
}

/** @deprecated use computeLocationMetrics */
export function computeSummary(stations) {
  const m = computeLocationMetrics(stations);
  return {
    dc: 0,
    ac: 0,
    guns: 0,
    maxDc: 0,
    maxAc: 0,
    maxSim: m.totalSim,
    totalPower: m.totalPower,
  };
}

export function computeLocationMetrics(stations) {
  let stationCount = 0;
  let totalPower = 0;
  let totalSim = 0;
  const connectorCounts = new Map();
  const dcBreakdown = new Map();
  const acBreakdown = new Map();
  let hasDc = false;
  let hasAc = false;
  let latestDate = "";

  for (const s of stations) {
    const cnt = s.count || 1;
    stationCount += cnt;
    totalPower += ((s.dc_power || 0) + (s.ac_power || 0)) * cnt;
    totalSim += (s.simultaneous_charge || 0) * cnt;

    for (const c of stationGunTypes(s)) {
      if (!c) continue;
      const key = normalizeConnectorKey(c);
      if (!key) continue;
      connectorCounts.set(key, (connectorCounts.get(key) || 0) + cnt);
    }
    if (s.dc_power) {
      hasDc = true;
      dcBreakdown.set(s.dc_power, (dcBreakdown.get(s.dc_power) || 0) + cnt);
    }
    if (s.ac_power) {
      hasAc = true;
      acBreakdown.set(s.ac_power, (acBreakdown.get(s.ac_power) || 0) + cnt);
    }
    if (s.station_date && s.station_date > latestDate) latestDate = s.station_date;
  }

  return {
    stationCount,
    totalPower,
    totalSim,
    connectorCounts,
    dcBreakdown,
    acBreakdown,
    hasDc,
    hasAc,
    latestDate,
  };
}

function renderBadge(n) {
  const num = Number(n) || 0;
  if (num <= 0) return "";
  return `<span class="loc-blk-badge">${escapeHtml(String(num))}</span>`;
}

function renderReviewCta(className, label = "ОЦЕНИТЬ ЛОКАЦИЮ", style = "community") {
  const extra = className ? ` ${className}` : "";
  const btnCls =
    style === "plain"
      ? "loc-btn loc-btn-community"
      : style === "primary"
        ? "loc-btn loc-btn-primary"
        : "loc-btn loc-btn-community";
  return `<a class="${btnCls} loc-review-cta${extra}" href="#review-form">${escapeHtml(label)}</a>`;
}

function formatRatingDisplay(rating) {
  const n = Number(rating);
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

function starsHtml(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = Math.floor(r);
  const half = r - full >= 0.25 && r - full < 0.75 ? 1 : 0;
  const extraFull = r - full >= 0.75 ? 1 : 0;
  const f = full + extraFull;
  const h = half && !extraFull ? 1 : 0;
  let s = "★".repeat(f) + (h ? "⯨" : "") + "☆".repeat(Math.max(0, 5 - f - h));
  return s.replace(/⯨/g, "★");
}

function formatConnectorsStack(counts) {
  const lines = formatConnectorLegendLines(counts);
  if (!lines.length) {
    return `<span class="loc-infra-val loc-infra-val--center">—</span>`;
  }
  const html = lines
    .map(
      ({ label, count }) =>
        `<span class="loc-conn-line">${escapeHtml(label)} ×${count}</span>`,
    )
    .join("");
  return `<span class="loc-infra-val-stack loc-infra-val--center">${html}</span>`;
}

function tagPolarity(tag) {
  const t = String(tag).toLowerCase();
  return NEGATIVE_TAG_HINTS.some((h) => t.includes(h)) ? "negative" : "positive";
}

const ICON_POWER = `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
const ICON_CONN = `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M6 8h12v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/></svg>`;
const ICON_CAR = `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;

function renderInfraKpiCell(icon, valueHtml, cellMod = "") {
  const modCls = cellMod ? ` ${cellMod}` : "";
  return `<div class="loc-infra-cell${modCls}">
<span class="loc-infra-ico">${icon}</span>
<div class="loc-infra-copy">${valueHtml}</div>
</div>`;
}

function renderStationRow(station, index) {
  const power = formatStationPower(station);
  return `<div class="loc-st-row">
<span class="loc-st-num" aria-hidden="true">${index}</span>
<span class="loc-st-type">${renderTypeBadge(station.station_type)}</span>
<div class="loc-st-guns">${renderStationGuns(station)}</div>
<span class="loc-st-power">${escapeHtml(power.toUpperCase())}</span>
</div>`;
}

function renderStationList(stations) {
  const rows = expandStationsByCount(stations);
  if (!rows.length) return "";
  const html = rows.map((s, i) => renderStationRow(s, i + 1)).join("");
  return `<div class="loc-st-list">${html}</div>${renderStationDcAcLegend()}`;
}

function renderRatingMeta(loc, community) {
  const rc = loc.cached_review_count || 0;
  const pc = community?.photo_count ?? 0;
  if (rc <= 0 && pc <= 0) return `<span class="loc-rating-meta">ОТЗЫВОВ ПОКА НЕТ</span>`;
  const parts = [];
  if (rc > 0) {
    parts.push(
      `${rc} ${rc === 1 ? "ОТЗЫВ" : rc < 5 ? "ОТЗЫВА" : "ОТЗЫВОВ"}`,
    );
  }
  if (pc > 0) parts.push(`${pc} ФОТО`);
  return `<span class="loc-rating-meta">${escapeHtml(parts.join(" • "))}</span>`;
}

function renderRatingCard(loc, community, { compact, linkHref }) {
  const hasRating = loc.cached_review_count > 0 && loc.cached_avg_rating;
  const cls = `loc-hero-inset loc-hero-rating${hasRating ? "" : " loc-hero-rating--empty"}${compact ? " loc-hero-rating--compact" : ""}`;

  let inner;
  if (!hasRating) {
    const cta = compact
      ? `<div class="loc-rating-cta">${renderReviewCta("", "ОЦЕНИТЬ", "plain")}</div>`
      : "";
    inner = `<span class="loc-inset-lbl">РЕЙТИНГ ЛОКАЦИИ</span>
<span class="loc-rating-val loc-rating-val--placeholder" aria-hidden="true">X.X</span>
<span class="loc-rating-stars loc-rating-stars--empty" aria-hidden="true">☆☆☆☆☆</span>
<span class="loc-rating-meta">ОТЗЫВОВ ПОКА НЕТ</span>
${cta}`;
  } else {
    const cta = compact
      ? `<div class="loc-rating-cta">${renderReviewCta("", "ОЦЕНИТЬ", "plain")}</div>`
      : "";
    inner = `<span class="loc-inset-lbl">РЕЙТИНГ ЛОКАЦИИ</span>
<span class="loc-rating-val">${escapeHtml(formatRatingDisplay(loc.cached_avg_rating))}</span>
<span class="loc-rating-stars" aria-hidden="true">${starsHtml(loc.cached_avg_rating)}</span>
${renderRatingMeta(loc, community)}
${cta}`;
  }

  if (linkHref && !compact && hasRating) {
    return `<a class="${cls}" href="${linkHref}">${inner}</a>`;
  }
  return `<div class="${cls}">${inner}</div>`;
}

function renderMapInset(mapBlock) {
  if (!mapBlock) return "";
  return `<div class="loc-hero-inset loc-hero-map-wrap">
${mapBlock}
</div>`;
}

function renderHeroTitleBlock(loc) {
  const idAttr = ' id="loc-title"';
  const city = escapeHtml(String(loc.city ?? "").trim());
  const address = escapeHtml(String(loc.address ?? "").trim());
  const name = loc.location_name?.trim();

  if (name) {
    return `<h1 class="loc-hero-name"${idAttr}><span class="loc-hero-city">${city}</span><span class="loc-hero-street" data-fit-line>${address}</span><span class="loc-hero-venue">${escapeHtml(name)}</span></h1>`;
  }
  if (city && address) {
    return `<h1 class="loc-hero-name"${idAttr}><span class="loc-hero-city">${city}</span><span class="loc-hero-street" data-fit-line>${address}</span></h1>`;
  }
  const fallback = escapeHtml(city || address || "—");
  return `<h1 class="loc-hero-name"${idAttr}><span class="loc-hero-city">${fallback}</span></h1>`;
}

function renderHeroIdentity(
  loc,
  opCls,
  opName,
  aggregatorLine,
  { showDesktopReviewCta = true } = {},
) {
  const titleBlock = renderHeroTitleBlock(loc);
  const lat = loc.lat;
  const lng = loc.lng;
  const hasCoords = lat != null && lng != null;
  const routeLabel = [loc.city, loc.address].filter(Boolean).join(", ")
    || loc.location_name?.trim()
    || opName;

  const routeBtn = hasCoords
    ? `<button class="loc-btn loc-btn-primary route-nav-btn" type="button" data-route-lat="${escapeHtml(String(lat))}" data-route-lng="${escapeHtml(String(lng))}" data-route-label="${escapeHtml(routeLabel)}">МАРШРУТ</button>`
    : "";

  const desktopCta = showDesktopReviewCta
    ? `<span class="loc-hero-actions-desktop">${renderReviewCta("", "ОЦЕНИТЬ", "plain")}</span>`
    : "";

  return `<div class="loc-hero-identity">
<div class="loc-hero-operator"><span class="loc-hero-op ${opCls}">${escapeHtml(opName)}</span></div>
${titleBlock}
${aggregatorLine}
<div class="loc-hero-actions">
${routeBtn}
<button class="loc-btn loc-btn-secondary" type="button" id="loc-share-btn" onclick="shareLocation()">ПОДЕЛИТЬСЯ</button>
${desktopCta}
</div>
</div>`;
}

export function renderHero(loc, community, opts) {
  const {
    opCls,
    opName,
    aggregatorLine,
    mapBlock,
    h1Text,
  } = opts;
  const identity = renderHeroIdentity(
    loc,
    opCls,
    opName,
    aggregatorLine,
    { showDesktopReviewCta: true },
  );
  const ratingDesktop = renderRatingCard(loc, community, {
    compact: false,
    linkHref: "#reviews-list",
  });
  const ratingMobile = renderRatingCard(loc, community, {
    compact: true,
    linkHref: null,
  });
  const mapInset = renderMapInset(mapBlock);

  return `<section class="loc-hero" aria-labelledby="loc-title">
<div class="loc-hero-shell">
${identity}
${ratingDesktop}
${mapInset}
</div>
<div class="loc-hero-mobile-row">
<div class="loc-hero-mobile-rating">${ratingMobile}</div>
</div>
</section>`;
}

export function renderInfrastructureBlock(stations, metrics) {
  if (!stations.length) {
    return `<div class="blk loc-infra-blk loc-grid-main">
<div class="blk-hdr"><span class="blk-title">СТАНЦИЙ В ЛОКАЦИИ</span></div>
<p class="loc-empty">Данных о зарядных постах на этой локации пока нет.</p>
</div>`;
  }

  const powerVal = metrics.totalPower
    ? `<span class="loc-infra-val loc-infra-val--edge">${escapeHtml(`${metrics.totalPower.toLocaleString("ru")} кВт`.toUpperCase())}</span>`
    : `<span class="loc-infra-val loc-infra-val--edge">—</span>`;
  const connVal = formatConnectorsStack(metrics.connectorCounts);
  const simVal = metrics.totalSim
    ? `<span class="loc-infra-val loc-infra-val--edge">${escapeHtml(`${metrics.totalSim} АВТО`)}</span>`
    : `<span class="loc-infra-val loc-infra-val--edge">—</span>`;

  return `<div class="blk loc-infra-blk loc-grid-main">
<div class="blk-hdr"><span class="blk-title">СТАНЦИЙ В ЛОКАЦИИ</span>${renderBadge(metrics.stationCount)}</div>
<div class="loc-infra-grid">
${renderInfraKpiCell(ICON_POWER, powerVal)}
${renderInfraKpiCell(ICON_CONN, connVal, "loc-infra-cell--conn")}
${renderInfraKpiCell(ICON_CAR, simVal)}
</div>
${renderStationList(stations)}
</div>`;
}

export function renderPhotosBlock(community) {
  const photos = community?.photos || [];
  const count = community?.photo_count ?? photos.length ?? 0;

  if (!count) {
    return `<div class="blk loc-photos-blk loc-grid-side" id="photos">
<div class="blk-hdr"><span class="blk-title">ФОТО ЛОКАЦИИ</span></div>
<div class="loc-photos-empty">
<p class="loc-empty-lead">Фото появляются в отзывах</p>
${renderReviewCta("loc-review-cta--block")}
</div>
</div>`;
  }

  const visible = photos.slice(0, 4);
  const rest = count - visible.length;
  const thumbs = visible
    .map((p, i) => {
      const overlay =
        i === visible.length - 1 && rest > 0
          ? `<span class="loc-photo-more">+${rest}</span>`
          : "";
      return `<button type="button" class="loc-photo-thumb" data-photo-index="${i}" aria-label="Фото ${i + 1}">
<img src="${escapeHtml(p.url || "")}" alt="" loading="lazy">${overlay}
</button>`;
    })
    .join("");

  return `<div class="blk loc-photos-blk loc-grid-side" id="photos">
<div class="blk-hdr"><span class="blk-title">ФОТО ЛОКАЦИИ</span>${renderBadge(count)}</div>
<div class="loc-photo-panel">
<div class="loc-photo-grid">${thumbs}</div>
</div>
</div>`;
}

export function renderTagsBlock(community) {
  const raw = community?.tags || [];
  const tags = raw.filter((t) => (t.count || 0) > 0);

  if (!tags.length) {
    return `<div class="blk loc-tags-blk loc-grid-main">
<div class="blk-hdr"><span class="blk-title">ТЕГИ (НА ОСНОВЕ ОТЗЫВОВ)</span></div>
<div class="loc-tags-empty">
<p class="loc-empty-lead">Теги появятся после отзывов сообщества</p>
${renderReviewCta("loc-review-cta--block")}
</div>
</div>`;
  }

  const cells = tags
    .map((t) => {
      const pol = t.polarity || tagPolarity(t.tag || t.label || "");
      const label = escapeHtml(t.tag || t.label || "");
      const c = t.count || 0;
      return `<div class="loc-tag-agg-cell loc-tag-agg-cell--${pol}">
<span class="loc-tag-agg-label">${label}</span>
<span class="loc-tag-agg-count">${escapeHtml(String(c))}</span>
</div>`;
    })
    .join("");

  return `<div class="blk loc-tags-blk loc-grid-main">
<div class="blk-hdr"><span class="blk-title">ТЕГИ (НА ОСНОВЕ ОТЗЫВОВ)</span>${renderBadge(tags.length)}</div>
<div class="loc-tag-agg-grid">${cells}</div>
</div>`;
}

export function renderReviewFormBlock() {
  return `<div class="blk loc-review-form-blk loc-grid-side" id="review-form">
<div class="blk-hdr"><span class="blk-title">ОЦЕНИ ЭТУ СТАНЦИЮ</span></div>
<p class="loc-form-lead">Что скажешь о станции?</p>
<p class="loc-form-sub-lead">Помоги другим электромобилистам — пару тапов, без простыней текста.</p>
<div id="review-form-root" class="loc-review-form-body" aria-live="polite"></div>
</div>`;
}

function renderReviewCard(review, index) {
  const photoN = review.photo_count || (review.photos?.length ?? 0);
  const photoMark =
    photoN > 0
      ? `<button type="button" class="loc-review-photo-mark" data-review-photo="${index}" aria-label="Фото в отзыве: ${photoN}">📷 ${photoN}</button>`
      : "";
  const tags = (review.tags || [])
    .map((t) => {
      const pol = tagPolarity(t);
      return `<span class="loc-review-tag loc-review-tag--${pol}">${escapeHtml(t)}</span>`;
    })
    .join("");

  return `<article class="loc-review-card" data-review-index="${index}">
<header class="loc-review-head">
<span class="loc-review-avatar" aria-hidden="true">🤖</span>
<div class="loc-review-who">
<span class="loc-review-author">${escapeHtml(review.author || "Гость")}</span>
<span class="loc-review-time">${escapeHtml(review.time_ago || "")}</span>
${photoMark}
</div>
<span class="loc-review-stars" aria-label="Оценка ${escapeHtml(String(review.rating || ""))}">${starsHtml(review.rating)}</span>
</header>
${tags ? `<div class="loc-review-tags">${tags}</div>` : ""}
<p class="loc-review-text">${escapeHtml(review.comment || review.text || "")}</p>
<footer class="loc-review-foot">
<button type="button" class="loc-review-helpful" disabled title="Скоро">ПОЛЕЗНО ${review.helpful_count ? escapeHtml(String(review.helpful_count)) : ""}</button>
<button type="button" class="loc-review-more" disabled title="Скоро" aria-label="Ещё">⋯</button>
</footer>
</article>`;
}

export function renderReviewsBlock(community) {
  const reviews = community?.reviews || [];
  const count = community?.review_count ?? reviews.length ?? 0;

  if (!reviews.length) {
    return `<div class="blk loc-reviews-blk loc-grid-main" id="reviews-list">
<div class="blk-hdr"><span class="blk-title">ОТЗЫВЫ</span>${renderBadge(count)}</div>
<p class="loc-empty">Пока нет отзывов</p>
</div>`;
  }

  const cards = reviews.map((r, i) => renderReviewCard(r, i)).join("");

  return `<div class="blk loc-reviews-blk loc-grid-main" id="reviews-list">
<div class="blk-hdr"><span class="blk-title">ОТЗЫВЫ</span>${renderBadge(count)}</div>
<div class="loc-reviews-list" data-page-size="3">${cards}</div>
<button type="button" class="loc-reviews-more" hidden>ПОКАЗАТЬ ЕЩЁ ОТЗЫВЫ ▾</button>
</div>`;
}

export function renderNearbyBlock(nearby, city) {
  const cityLabel = escapeHtml((city || "").toUpperCase());
  return `<div class="blk loc-nearby-blk loc-grid-side">
<div class="blk-hdr"><span class="blk-title">РЯДОМ · ${cityLabel}</span></div>
<div class="loc-nearby-list">${renderNearby(nearby)}</div>
</div>`;
}

/** Title + optional subtitle; без названия — одна строка (адрес), без дубля. */
function nearbyDisplayLines(item) {
  const name = (item.location_name || "").trim();
  const addr = (item.address || "").trim();
  if (name && name.toLowerCase() !== addr.toLowerCase()) {
    return { title: name, sub: addr || null };
  }
  return { title: addr || "—", sub: null };
}

export function renderNearby(nearby) {
  if (!nearby?.length) {
    return `<p class="loc-nearby-empty">Других локаций в этом городе пока нет в реестре.</p>`;
  }
  return nearby
    .slice(0, 8)
    .map((n) => {
      const { title, sub } = nearbyDisplayLines(n);
      const href = `/${escapeHtml(n.operator_slug)}/${escapeHtml(n.slug)}`;
      const rating =
        n.cached_review_count > 0 && n.cached_avg_rating
          ? `<span class="loc-nearby-rating">★ ${escapeHtml(formatRatingDisplay(n.cached_avg_rating))}</span>`
          : "";
      const dist = `<span class="loc-nearby-dist">${escapeHtml(String(n.distance_km))} км</span>`;
      const subLine = sub
        ? `<span class="loc-nearby-addr">${escapeHtml(sub)}</span>`
        : "";
      return `<a class="loc-nearby-item" href="${href}">
<span class="op-filter-btn ${opClass(n.operator_slug)}">${escapeHtml(n.operator)}</span>
<span class="loc-nearby-body${sub ? "" : " loc-nearby-body--solo"}">
<span class="loc-nearby-title">${escapeHtml(title)}</span>
${subLine}
</span>
<span class="loc-nearby-meta">${rating}${dist}</span>
</a>`;
    })
    .join("");
}
