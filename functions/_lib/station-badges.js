/**
 * Shared station type / gun markup — same classes as stations.html table.
 */

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
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
