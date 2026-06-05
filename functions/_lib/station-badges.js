/**
 * Shared station type / gun markup — same classes as stations.html table.
 */

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

/** Fixed KPI order: slots 1–5 strict; slot 6+ = any other, alphabetically. */
export const CONNECTOR_KPI_FIXED = [
  { key: "ccs", label: "CCS" },
  { key: "gbt", label: "GBT" },
  { key: "chademo", label: "CHAdeMO" },
  { key: "type2", label: "Type 2" },
  { key: "gbt_ac", label: "GBT AC" },
];

/** @deprecated use CONNECTOR_KPI_FIXED */
export const CONNECTOR_LEGEND = [...CONNECTOR_KPI_FIXED];

function normalizeGunToken(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

/** Map raw gun1/2/3 → stable bucket key. */
export function normalizeConnectorKey(raw) {
  const norm = normalizeGunToken(raw);
  if (!norm) return null;
  const compact = norm.replace(/\s/g, "");

  // AC before bare GBT (GBT AC must not become gbt)
  if (compact === "GBTAC" || norm === "GBT AC") return "gbt_ac";
  if (compact === "TYPE2" || norm === "TYPE 2") return "type2";
  if (compact === "CCS" || compact === "CCS2" || compact.startsWith("CCS")) {
    return "ccs";
  }
  if (compact === "GBT" || norm === "GBT") return "gbt";
  if (compact === "CHADEMO" || norm === "CHA DEMO" || norm.startsWith("CHADEMO")) {
    return "chademo";
  }

  return `_other:${norm}`;
}

export function connectorLegendLabel(key) {
  const row = CONNECTOR_KPI_FIXED.find((r) => r.key === key);
  if (row) return row.label;
  if (key.startsWith("_other:")) {
    const raw = key.slice(7);
    if (raw === "TYPE 2" || raw === "TYPE2") return "Type 2";
    if (raw.startsWith("CCS")) return "CCS";
    if (raw === "GBT") return "GBT";
    if (raw === "GBT AC" || raw === "GBTAC") return "GBT AC";
    if (raw === "CHADEMO" || raw.startsWith("CHADEMO")) return "CHAdeMO";
    return raw;
  }
  return key;
}

/** Aggregate gun counts by legend key × station count. */
export function aggregateConnectorLegendCounts(stations) {
  const counts = new Map();
  for (const s of stations) {
    const cnt = s.count || 1;
    for (const gun of stationGunTypes(s)) {
      const key = normalizeConnectorKey(gun);
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + cnt);
    }
  }
  return counts;
}

export function formatConnectorLegendLines(counts) {
  if (!counts?.size) return [];

  const lines = [];
  const used = new Set();

  for (const { key, label } of CONNECTOR_KPI_FIXED) {
    const n = counts.get(key);
    if (!n) continue;
    lines.push({ label, count: n });
    used.add(key);
  }

  const rest = [...counts.entries()]
    .filter(([key]) => !used.has(key))
    .map(([key, count]) => ({ label: connectorLegendLabel(key), count, key }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, "ru", { sensitivity: "base" }),
    );

  for (const { label, count } of rest) {
    lines.push({ label, count });
  }

  return lines;
}

export function powerSum(station) {
  return (station.dc_power || 0) + (station.ac_power || 0);
}

export function formatStationPower(station) {
  const dc = station.dc_power || 0;
  const ac = station.ac_power || 0;
  if (!dc && !ac) return "—";
  if (dc && ac) return `${dc}+${ac} кВт`;
  return `${dc || ac} кВт`;
}

export function renderTypeBadge(stationType) {
  const t = stationType || "";
  if (t === "DC") return '<span class="badge-dc">DC</span>';
  if (t === "AC") return '<span class="badge-ac">AC</span>';
  if (t === "ACDC") return '<span class="badge-acdc">AC+DC</span>';
  return "";
}

/** DC: CCS, GBT · AC: Type 2, GBT AC (same as home dc-ac-leg). */
export function connectorGunKind(gunType) {
  const key = normalizeConnectorKey(gunType);
  if (key === "type2" || key === "gbt_ac") return "ac";
  return "dc";
}

export function renderGunPill(gunType) {
  if (!gunType) return "";
  const kind = connectorGunKind(gunType);
  return `<span class="gun-pill"><span class="gun-dot gun-dot--${kind}"></span>${escapeHtml(gunType)}</span>`;
}

export function renderStationDcAcLegend() {
  return `<div class="dc-ac-leg loc-st-dc-ac-leg">
<div class="leg-item"><span class="leg-dot leg-dot--dc" aria-hidden="true"></span>DC — БЫСТРЫЕ СТАНЦИИ</div>
<div class="leg-item"><span class="leg-dot leg-dot--ac" aria-hidden="true"></span>AC — ЗАРЯДКА ПЕРЕМЕННЫМ ТОКОМ</div>
</div>`;
}

export function stationGunTypes(station) {
  const g1 = station.gun1_type;
  const g2 = station.gun2_type;
  const g3 = station.gun3_type;
  if (g1 || g2 || g3) {
    return [g1, g2, g3].filter(Boolean);
  }
  return station.connectors || [];
}

export function renderStationGuns(station) {
  const guns = stationGunTypes(station);
  if (!guns.length) return '<span class="st-no-gun">—</span>';
  return guns.map((g) => renderGunPill(g)).join("");
}

/** One physical row per unit (count expanded). Sorted by power descending. */
export function expandStationsByCount(stations) {
  const rows = [];
  for (const s of stations) {
    const n = Math.max(1, s.count || 1);
    for (let i = 0; i < n; i++) {
      rows.push({ ...s, count: 1 });
    }
  }
  return rows.sort((a, b) => powerSum(b) - powerSum(a));
}
