/**
 * Shared station type / gun markup — same classes as stations.html table.
 */

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

/** Canonical KPI connector legend — order and labels (location infra middle cell). */
export const CONNECTOR_LEGEND = [
  { key: "ccs", label: "CCS" },
  { key: "gbt", label: "GBT" },
  { key: "type2", label: "Type 2" },
  { key: "gbt_ac", label: "GBT AC" },
];

/** Map raw gun1/2/3 value → legend key. Unknown types sort after legend. */
export function normalizeConnectorKey(raw) {
  const norm = String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  if (!norm) return null;
  if (norm === "GBT AC" || norm === "GBT-AC" || norm === "GBTAC") return "gbt_ac";
  if (norm === "TYPE2" || norm === "TYPE-2" || norm === "TYPE 2") return "type2";
  if (norm.startsWith("CCS")) return "ccs";
  if (norm === "GBT") return "gbt";
  return `_other:${norm}`;
}

export function connectorLegendLabel(key) {
  const row = CONNECTOR_LEGEND.find((r) => r.key === key);
  if (row) return row.label;
  if (key.startsWith("_other:")) {
    return key.slice(7).replace(/\bTYPE 2\b/i, "Type 2");
  }
  return key;
}

export function connectorLegendSortIndex(key) {
  const idx = CONNECTOR_LEGEND.findIndex((r) => r.key === key);
  return idx >= 0 ? idx : CONNECTOR_LEGEND.length + 1;
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
  return [...counts.entries()]
    .sort((a, b) => {
      const ai = connectorLegendSortIndex(a[0]);
      const bi = connectorLegendSortIndex(b[0]);
      if (ai !== bi) return ai - bi;
      return a[0].localeCompare(b[0]);
    })
    .map(([key, n]) => ({ label: connectorLegendLabel(key), count: n }));
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

export function renderGunPill(gunType) {
  if (!gunType) return "";
  return `<span class="gun-pill"><span class="gun-dot"></span>${escapeHtml(gunType)}</span>`;
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
