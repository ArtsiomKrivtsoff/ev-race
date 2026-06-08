/**
 * snapshot-adapter — converts ai_snapshots history into DayActivity series
 * for Pattern Engine. Falls back to stations when snapshot coverage is low.
 *
 * ai_snapshots → snapshot-adapter → Pattern Engine
 */

import { dayBefore, listRoundDates } from './rounds.ts';

export const RACE_OPERATORS = [
  'batteryfly',
  'forevo',
  'zaryadka',
  'united',
  'csms',
] as const;

export type OperatorScope = 'all' | 'race';

export interface SnapshotRow {
  snapshot_date: string;
  operator: string;
  payload: {
    total_stations?: number;
    dc_stations?: number;
    ac_stations?: number;
    last_station_date?: string;
    [key: string]: unknown;
  };
}

export interface StationRow {
  station_date: string;
  operator: string;
  count?: number | null;
  station_type?: string | null;
}

export interface DayActivity {
  date: string;
  operator: string;
  stations_added: number;
}

export type AdapterSource = 'snapshots' | 'stations_reconstructed';

export interface AdapterResult {
  activities: DayActivity[];
  source: AdapterSource;
  /** Share of round calendar days with at least one snapshot row (any operator). */
  coverage: number;
  snapshotDays: number;
  roundDays: number;
}

const MIN_SNAPSHOT_COVERAGE = 0.35;

function inScope(operator: string, scope: OperatorScope): boolean {
  if (scope === 'race') return RACE_OPERATORS.includes(operator as typeof RACE_OPERATORS[number]);
  return true;
}

function totalFromPayload(payload: SnapshotRow['payload']): number {
  if (typeof payload.total_stations === 'number') return payload.total_stations;
  const dc = payload.dc_stations ?? 0;
  const ac = payload.ac_stations ?? 0;
  return dc + ac;
}

/** Build daily deltas from cumulative total_stations in snapshots. */
export function adaptSnapshotsToDayActivity(
  snapshots: SnapshotRow[],
  startDate: string,
  endDate: string,
  scope: OperatorScope = 'all',
): AdapterResult {
  const roundDays = listRoundDates(startDate, endDate);
  const baselineDate = dayBefore(startDate);
  const allDates = [baselineDate, ...roundDays];

  const byOp: Record<string, Record<string, number>> = {};
  for (const row of snapshots) {
    if (!inScope(row.operator, scope)) continue;
    const total = totalFromPayload(row.payload);
    if (!byOp[row.operator]) byOp[row.operator] = {};
    byOp[row.operator][row.snapshot_date] = total;
  }

  const daysWithData = new Set<string>();
  for (const row of snapshots) {
    if (roundDays.includes(row.snapshot_date)) daysWithData.add(row.snapshot_date);
  }

  const activities: DayActivity[] = [];

  for (const operator of Object.keys(byOp)) {
    const series = byOp[operator];
    let prev = series[baselineDate];
    if (prev === undefined) {
      const first = allDates.find((d) => series[d] !== undefined);
      prev = first ? series[first] : 0;
    }

    for (const date of roundDays) {
      const cur = series[date];
      if (cur === undefined) continue;
      const delta = cur - prev;
      if (delta > 0) {
        activities.push({ date, operator, stations_added: delta });
      }
      prev = cur;
    }
  }

  const coverage = roundDays.length > 0 ? daysWithData.size / roundDays.length : 0;

  return {
    activities,
    source: 'snapshots',
    coverage,
    snapshotDays: daysWithData.size,
    roundDays: roundDays.length,
  };
}

/** Reconstruct daily activity from stations (tournament types: DC + AC + ACDC). */
export function adaptStationsToDayActivity(
  stations: StationRow[],
  startDate: string,
  endDate: string,
  scope: OperatorScope = 'all',
): AdapterResult {
  const roundDays = listRoundDates(startDate, endDate);
  const daySet = new Set(roundDays);
  const byKey: Record<string, DayActivity> = {};

  for (const s of stations) {
    if (!daySet.has(s.station_date)) continue;
    if (!inScope(s.operator, scope)) continue;
    const t = s.station_type || '';
    if (t !== 'DC' && t !== 'AC' && t !== 'ACDC') continue;
    const key = `${s.station_date}|${s.operator}`;
    if (!byKey[key]) {
      byKey[key] = { date: s.station_date, operator: s.operator, stations_added: 0 };
    }
    byKey[key].stations_added += s.count || 1;
  }

  const activities = Object.values(byKey).filter((a) => a.stations_added > 0);

  return {
    activities,
    source: 'stations_reconstructed',
    coverage: 1,
    snapshotDays: 0,
    roundDays: roundDays.length,
  };
}

/**
 * Primary entry: snapshots first; stations fallback when coverage is insufficient.
 */
export function buildDayActivity(
  snapshots: SnapshotRow[],
  stations: StationRow[],
  startDate: string,
  endDate: string,
  scope: OperatorScope = 'all',
): AdapterResult {
  const fromSnapshots = adaptSnapshotsToDayActivity(snapshots, startDate, endDate, scope);
  if (
    fromSnapshots.coverage >= MIN_SNAPSHOT_COVERAGE &&
    fromSnapshots.activities.length > 0
  ) {
    return fromSnapshots;
  }
  return adaptStationsToDayActivity(stations, startDate, endDate, scope);
}

/** Sum stations_added in activities (for return_of_activity context). */
export function sumActivities(activities: DayActivity[]): number {
  return activities.reduce((s, a) => s + a.stations_added, 0);
}
