/**
 * Location page middle — HTML fragments (SSR).
 * Patterns aligned with stations.js / map.html.
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

export function renderStationsTable(stations) {
  if (!stations.length) {
    return `<p class="loc-empty">Станций в реестре для этой локации пока нет.</p>`;
  }

  if (stations.length === 1) {
    return `<div class="table-wrap loc-table-wrap">
<table class="reg loc-stations-table">
<thead><tr>
<th>ОПЕРАТОР</th><th>ТИП</th><th class="center">РАЗЪЁМ 1</th><th class="center">РАЗЪЁМ 2</th><th class="center">РАЗЪЁМ 3</th><th class="right">МОЩНОСТЬ</th><th class="right">ДАТА</th>
</tr></thead>
<tbody>${renderStationRow(stations[0], false)}</tbody>
</table>
</div>`;
  }

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

export function renderStationsMobile(stations) {
  if (!stations.length) return "";

  const summary = computeSummary(stations);
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

  const locNameHtml = first.location_name
    ? `<span class="loc-name">${escapeHtml(first.location_name)}</span>`
    : "";
  const locAddrHtml = first.address
    ? `<span class="loc-addr">${escapeHtml(first.address)}</span>`
    : "";

  return `<div class="loc-card loc-card--page">
<div class="loc-head">
<div class="loc-head-left">${opBadge(first.operator, first.aggregator)}<span class="loc-city">${escapeHtml(first.city || "—")}</span>${locNameHtml}${locAddrHtml}</div>
<div class="loc-head-right">
<div class="loc-total-power">${summary.totalPower ? summary.totalPower.toLocaleString("ru") + " кВт" : "—"}</div>
<div class="loc-total-label">ВСЕГО</div>
${summary.guns ? `<div class="loc-total-label">${summary.guns} пист.</div>` : ""}
</div>
</div>
${stationsHtml}
<div class="loc-footer"><span class="loc-date">${fmtDate(latestDate)}</span></div>
</div>`;
}

export function renderStatCards(summary) {
  const dcVal =
    summary.dc > 0
      ? `${summary.dc} <span class="stat-val-unit">| ${summary.maxDc} кВт</span>`
      : "—";
  const acVal =
    summary.ac > 0
      ? `${summary.ac} <span class="stat-val-unit">| ${summary.maxAc} кВт</span>`
      : "—";

  return `<div class="loc-stats stats-row">
<div class="stat-card"><div class="stat-label">DC СТАНЦИЙ <span class="stat-val-unit">| КВТ</span></div><div class="stat-val stat-val--compound">${dcVal}</div></div>
<div class="stat-card"><div class="stat-label">AC СТАНЦИЙ <span class="stat-val-unit">| КВТ</span></div><div class="stat-val stat-val--compound">${acVal}</div></div>
<div class="stat-card"><div class="stat-label">КОННЕКТ.</div><div class="stat-val">${summary.guns || "—"}</div></div>
<div class="stat-card"><div class="stat-label">МОЩНОСТЬ Σ</div><div class="stat-val">${summary.totalPower ? summary.totalPower.toLocaleString("ru") : "—"}</div></div>
<div class="stat-card"><div class="stat-label">АВТО СРАЗУ</div><div class="stat-val" style="color:var(--cyan)">${summary.maxSim || "—"}</div></div>
</div>`;
}

export function renderRatingBlock(loc) {
  if (loc.cached_review_count > 0 && loc.cached_avg_rating) {
    return `<div class="loc-rating-box">
<div class="loc-rating-score">★ ${escapeHtml(String(loc.cached_avg_rating))}</div>
<div class="loc-rating-meta">${escapeHtml(String(loc.cached_review_count))} отзывов</div>
</div>`;
  }
  return `<div class="loc-rating-box loc-rating-box--soon">
<span class="loc-rating-stars">☆☆☆☆☆</span>
<span class="loc-rating-soon">СКОРО</span>
<p class="loc-rating-hint">Народный рейтинг и полевые отчёты</p>
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

export function renderTagsPlaceholder() {
  return `<div class="blk loc-tags-blk">
<div class="blk-hdr"><span class="blk-title">ТЕГИ ЛОКАЦИИ</span></div>
<div class="loc-tag-chips">
<span class="loc-tag loc-tag--soon">#скоро</span>
<span class="loc-tag loc-tag--soon">#полевойотчёт</span>
</div>
<p class="loc-soon-text">Теги появятся вместе с отзывами сообщества.</p>
</div>`;
}

export function renderReviewsPlaceholder() {
  return `<div class="blk loc-reviews-blk">
<div class="blk-hdr"><span class="blk-title">ОТЗЫВЫ</span></div>
<div class="loc-reviews-empty">
<span class="loc-rating-stars">☆☆☆☆☆</span>
<p class="loc-soon-text">Пока нет отзывов. Будьте первым — блок отчёта справа.</p>
</div>
</div>`;
}

export function renderStatusPlaceholder() {
  return `<div class="blk loc-status-blk">
<div class="blk-hdr"><span class="blk-title">СТАТУС СЕЙЧАС</span></div>
<div class="loc-status-body">
<span class="loc-status-dot"></span>
<span class="loc-status-label">LIVE — СКОРО</span>
<p class="loc-soon-text">Онлайн-статус и очередь — в следующих обновлениях.</p>
</div>
</div>`;
}
