/**
 * Location page middle — HTML fragments (SSR).
 * Layout contract: Location Page v2 (place-first hierarchy).
 */

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

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

export function opClass(slug) {
  return OP_CLASS[slug] || "op-other";
}

export function opDisplayName(operator, operatorSlug) {
  if (operatorSlug && OP_NAMES[operatorSlug]) return OP_NAMES[operatorSlug];
  return operator || "—";
}

export function opBadge(op, agg) {
  const cls = OP_CLASS[op] || "op-other";
  const name = OP_NAMES[op] || op;
  const showVia = agg && agg !== op;
  const viaName = showVia ? OP_NAMES[agg] || agg : null;
  const badge = `<span class="op-badge ${cls}">${escapeHtml(name)}</span>`;
  if (!showVia) return badge;
  return `<span class="op-cell">${badge}<span class="op-via">в ${escapeHtml(viaName)}</span></span>`;
}

export function typeBadge(t) {
  if (!t) return "";
  if (t === "DC") return '<span class="badge-dc">DC</span>';
  if (t === "AC") return '<span class="badge-ac">AC</span>';
  if (t === "ACDC") return '<span class="badge-acdc">AC+DC</span>';
  return "";
}

export function gunCell(type) {
  if (!type) return '<span class="no-gun">—</span>';
  return `<span class="gun-pill"><span class="gun-dot"></span>${escapeHtml(type)}</span>`;
}

export function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const p = dateStr.split("-");
  if (p.length < 3) return escapeHtml(dateStr);
  return `${p[2]}.${p[1]}.${p[0].slice(2)}`;
}

export function gunAt(connectors, idx) {
  return connectors?.[idx] ?? null;
}

export function powerHtml(s) {
  const dc = s.dc_power || 0;
  const ac = s.ac_power || 0;
  const cnt = s.count || 1;
  const pwrStr =
    dc && ac ? `${dc}+${ac} кВт` : dc || ac ? `${dc || ac} кВт` : "—";
  if (pwrStr === "—") return "—";
  if (cnt > 1) {
    return `${escapeHtml(pwrStr)} <span class="loc-pwr-mult">×${escapeHtml(String(cnt))}</span>`;
  }
  return escapeHtml(pwrStr);
}

export function computeSummary(stations) {
  let dc = 0;
  let ac = 0;
  let guns = 0;
  let maxDc = 0;
  let maxAc = 0;
  let maxSim = 0;
  let totalPower = 0;

  for (const s of stations) {
    const cnt = s.count || 1;
    guns += (s.connectors?.length || 0) * cnt;
    totalPower += ((s.dc_power || 0) + (s.ac_power || 0)) * cnt;
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

  return { dc, ac, guns, maxDc, maxAc, maxSim, totalPower };
}

export function collectConnectorTypes(stations) {
  const set = new Set();
  for (const s of stations) {
    for (const c of s.connectors || []) {
      if (c) set.add(c);
    }
  }
  return [...set];
}

function renderStationRow(s, indent) {
  const prefix = indent
    ? `<span class="loc-st-indent">↳ ${escapeHtml(OP_NAMES[s.operator] || s.operator)}</span>`
    : opBadge(s.operator, s.aggregator);
  return `<tr class="loc-st-row">
<td>${prefix}</td>
<td>${typeBadge(s.station_type)}</td>
<td class="center">${gunCell(gunAt(s.connectors, 0))}</td>
<td class="center">${gunCell(gunAt(s.connectors, 1))}</td>
<td class="center">${gunCell(gunAt(s.connectors, 2))}</td>
<td class="power right">${powerHtml(s)}</td>
<td class="date right">${fmtDate(s.station_date)}</td>
</tr>`;
}

function renderStationsTableMulti(stations) {
  const summary = computeSummary(stations);
  const totalStCount = stations.reduce((n, s) => n + (s.count || 1), 0);
  const latestDate = stations.reduce(
    (d, s) => (s.station_date && s.station_date > d ? s.station_date : d),
    "",
  );
  const seenOps = new Set();
  const opBadges = stations
    .filter((s) => {
      const key = `${s.operator}|${s.aggregator || ""}`;
      if (seenOps.has(key)) return false;
      seenOps.add(key);
      return true;
    })
    .map((s) => opBadge(s.operator, s.aggregator))
    .join(" ");

  const headerRow = `<tr class="loc-st-summary">
<td>${opBadges}</td>
<td><span class="loc-st-count">📍 ${totalStCount} СТ.</span></td>
<td colspan="3" class="center loc-st-meta">${summary.guns} пист.</td>
<td class="power right">${summary.totalPower ? summary.totalPower.toLocaleString("ru") + " кВт" : "—"}</td>
<td class="date right">${fmtDate(latestDate)}</td>
</tr>`;

  const subRows = stations.map((s) => renderStationRow(s, true)).join("");

  return `<div class="table-wrap loc-table-wrap">
<table class="reg loc-stations-table">
<thead><tr>
<th>ОПЕРАТОР</th><th>ТИП</th><th class="center">РАЗЪЁМ 1</th><th class="center">РАЗЪЁМ 2</th><th class="center">РАЗЪЁМ 3</th><th class="right">МОЩНОСТЬ</th><th class="right">ДАТА</th>
</tr></thead>
<tbody>${headerRow}${subRows}</tbody>
</table>
</div>`;
}

export function renderStationsBlock(stations) {
  if (stations.length <= 1) return "";

  return `<div class="blk loc-stations-blk">
<div class="blk-hdr"><span class="blk-title">СТАНЦИИ НА ЛОКАЦИИ</span><span class="blk-link">${stations.length} шт.</span></div>
${renderStationsTableMulti(stations)}
<div class="loc-cards-wrap">${renderStationsMobile(stations)}</div>
</div>`;
}

export function renderStationsMobile(stations) {
  if (stations.length <= 1) return "";

  const first = stations[0];
  const latestDate = stations.reduce(
    (d, s) => (s.station_date && s.station_date > d ? s.station_date : d),
    "",
  );

  const stationsHtml = stations
    .map((s) => {
      const guns = (s.connectors || [])
        .map(
          (x) =>
            `<span class="gun-pill"><span class="gun-dot"></span>${escapeHtml(x)}</span>`,
        )
        .join("");
      return `<div class="station-row">
<div class="st-left">${typeBadge(s.station_type)}<div class="st-guns">${guns || '<span class="st-no-gun">—</span>'}</div></div>
<div class="st-right"><span class="st-power">${powerHtml(s)}</span></div>
</div>`;
    })
    .join("");

  return `<div class="loc-card loc-card--page">
<div class="loc-head">
<div class="loc-head-left">${opBadge(first.operator, first.aggregator)}<span class="loc-city">${escapeHtml(first.city || "—")}</span></div>
</div>
${stationsHtml}
<div class="loc-footer"><span class="loc-date">${fmtDate(latestDate)}</span></div>
</div>`;
}

export function renderHeroRating(loc) {
  if (loc.cached_review_count > 0 && loc.cached_avg_rating) {
    return `<div class="loc-hero-rating">
<span class="loc-hero-rating-stars" aria-hidden="true">★★★★☆</span>
<span class="loc-hero-rating-val">${escapeHtml(String(loc.cached_avg_rating))}</span>
<span class="loc-hero-rating-count">(${escapeHtml(String(loc.cached_review_count))} ${loc.cached_review_count === 1 ? "отзыв" : loc.cached_review_count < 5 ? "отзыва" : "отзывов"})</span>
</div>`;
  }
  return `<div class="loc-hero-rating loc-hero-rating--soon">
<span class="loc-hero-rating-stars" aria-hidden="true">☆☆☆☆☆</span>
<span class="loc-hero-rating-soon">рейтинг скоро</span>
</div>`;
}

export function renderInfrastructureBlock(stations, summary) {
  if (!stations.length) {
    return `<div class="blk loc-infra-blk">
<div class="blk-hdr"><span class="blk-title">⚡ ИНФРАСТРУКТУРА</span></div>
<p class="loc-empty">Данных о зарядных постах на этой локации пока нет.</p>
</div>`;
  }

  const connectors = collectConnectorTypes(stations);
  const connStr = connectors.length ? connectors.map((c) => escapeHtml(c)).join(" · ") : "—";
  const powerVal = summary.totalPower
    ? `${summary.totalPower.toLocaleString("ru")} кВт`
    : "—";
  const simVal = summary.maxSim
    ? `до ${summary.maxSim} ${summary.maxSim === 1 ? "автомобиля" : summary.maxSim < 5 ? "автомобилей" : "автомобилей"}`
    : "—";

  const dcLine =
    summary.dc > 0
      ? `DC зарядок: ${summary.dc}${summary.maxDc ? ` · до ${summary.maxDc} кВт` : ""}`
      : "";
  const acLine =
    summary.ac > 0
      ? `AC зарядок: ${summary.ac}${summary.maxAc ? ` · до ${summary.maxAc} кВт` : ""}`
      : "";
  const countLines = [dcLine, acLine].filter(Boolean).join("<br>");

  let singleDetail = "";
  if (stations.length === 1) {
    const s = stations[0];
    singleDetail = `<div class="loc-infra-single">
${typeBadge(s.station_type)}
<span class="loc-infra-single-pwr">${powerHtml(s)}</span>
<span class="loc-infra-single-date">запуск ${fmtDate(s.station_date)}</span>
</div>`;
  }

  return `<div class="blk loc-infra-blk">
<div class="blk-hdr"><span class="blk-title">⚡ ИНФРАСТРУКТУРА</span></div>
<div class="loc-infra-grid">
<div class="loc-infra-item loc-infra-item--primary">
<div class="loc-infra-label">Максимальная мощность</div>
<div class="loc-infra-val">${powerVal}</div>
</div>
<div class="loc-infra-item">
<div class="loc-infra-label">Разъёмы</div>
<div class="loc-infra-val loc-infra-val--connectors">${connStr}</div>
</div>
<div class="loc-infra-item">
<div class="loc-infra-label">Одновременно</div>
<div class="loc-infra-val">${simVal}</div>
</div>
</div>
${countLines ? `<div class="loc-infra-counts">${countLines}</div>` : ""}
${singleDetail}
</div>`;
}

export function renderNearby(nearby) {
  if (!nearby?.length) {
    return `<p class="loc-nearby-empty">Других локаций в этом городе пока нет в реестре.</p>`;
  }
  return nearby
    .slice(0, 8)
    .map((n) => {
      const title = n.location_name || n.address;
      const dist =
        n.distance_km != null
          ? `<span class="loc-nearby-dist">${escapeHtml(String(n.distance_km))} км</span>`
          : "";
      const href = `/${escapeHtml(n.operator_slug)}/${escapeHtml(n.slug)}`;
      const rating =
        n.cached_review_count > 0 && n.cached_avg_rating
          ? `<span class="loc-nearby-rating">★ ${escapeHtml(String(n.cached_avg_rating))}</span>`
          : "";
      return `<a class="loc-nearby-item" href="${href}">
<span class="op-filter-btn ${opClass(n.operator_slug)}">${escapeHtml(n.operator)}</span>
<span class="loc-nearby-body">
<span class="loc-nearby-title">${escapeHtml(title)}</span>
<span class="loc-nearby-addr">${escapeHtml(n.address)}</span>
</span>
${rating}${dist}
</a>`;
    })
    .join("");
}

export function renderReportBlock() {
  return `<div class="blk loc-report-blk">
<div class="blk-hdr"><span class="blk-title">ОТПРАВИТЬ ОТЧЁТ</span></div>
<div class="loc-report-body">
<p class="loc-report-lead">Поделитесь опытом зарядки на этой локации — фото, очередь, работоспособность.</p>
<button type="button" class="loc-report-btn loc-report-btn-tg" disabled title="Скоро">СКОРО · TELEGRAM</button>
<div class="loc-report-or">или</div>
<button type="button" class="loc-report-btn loc-report-btn-anon" disabled title="Скоро">ОСТАВИТЬ АНОНИМНО</button>
<p class="loc-privacy-note">Мы не храним персональные данные. Вход через Telegram даёт только анонимный hash; анонимный отзыв — без имени и аккаунта.</p>
</div>
</div>`;
}

export function renderPhotosPlaceholder() {
  return `<div class="blk loc-photos-blk">
<div class="blk-hdr"><span class="blk-title">ФОТО С ЛОКАЦИИ</span></div>
<div class="loc-photo-grid">
${Array.from({ length: 6 }, (_, i) => `<div class="loc-photo-slot" aria-hidden="true"><span>ФОТО ${i + 1}</span></div>`).join("")}
</div>
<p class="loc-soon-text">Скоро: фото от сообщества после модерации.</p>
</div>`;
}

export function renderReviewsBlock() {
  return `<div class="blk loc-reviews-blk">
<div class="blk-hdr"><span class="blk-title">ОТЗЫВЫ</span></div>
<div class="loc-review-tags">
<span class="loc-tag loc-tag--soon">#скоро</span>
<span class="loc-tag loc-tag--soon">#полевойотчёт</span>
</div>
<p class="loc-soon-text loc-review-tags-hint">Теги появятся из отзывов сообщества.</p>
<div class="loc-reviews-empty">
<p class="loc-soon-text">Пока нет отзывов. Будьте первым — отправьте полевой отчёт ниже.</p>
</div>
</div>`;
}

export function renderStatusPlaceholder() {
  return `<div class="blk loc-status-blk loc-status-blk--muted">
<div class="blk-hdr"><span class="blk-title">СТАТУС СЕЙЧАС</span></div>
<div class="loc-status-body">
<span class="loc-status-dot"></span>
<span class="loc-status-label">LIVE — СКОРО</span>
<p class="loc-soon-text">Онлайн-статус и очередь — в следующих обновлениях.</p>
</div>
</div>`;
}
