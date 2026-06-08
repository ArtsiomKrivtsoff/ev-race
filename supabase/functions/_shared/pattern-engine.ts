import type { DayActivity, OperatorScope } from './snapshot-adapter.ts';

export const THRESHOLDS = {
  LONG_PAUSE_MAX_STATIONS: 3,
  LONG_PAUSE_MAX_ACTIVE_DAYS: 1,
  SILENCE_BURST_FIRST_HALF_MAX: 0.20,
  SILENCE_BURST_LAST_DAYS_MIN: 0.50,
  SINGLE_OPERATOR_MIN_SHARE: 0.75,
  SINGLE_OPERATOR_MIN_PARTICIPATION: 0.10,
  BACK_AND_FORTH_MAX_OPERATORS: 3,
  BACK_AND_FORTH_MIN_OVERLAP_DAYS: 1,
  BACK_AND_FORTH_MAX_DOMINANT_SHARE: 0.70,
  DISTRIBUTED_MIN_OPERATORS: 3,
  DISTRIBUTED_MIN_ACTIVE_DAYS: 3,
  DISTRIBUTED_MAX_DOMINANT_SHARE: 0.60,
  STEADY_MIN_ACTIVE_DAYS: 4,
  STEADY_MAX_DAY_SHARE: 0.40,
  STEADY_MAX_OPERATOR_SHARE: 0.60,
  RETURN_MIN_VS_AVG: 1.0,
  RETURN_PREV_MAX_VS_AVG: 0.60,
};

export interface PatternResult {
  slug: string;
  confidence: number;
  operator_scope: OperatorScope;
  metrics: {
    totalStations: number;
    activeDays: number;
    firstHalfShare: number;
    lastTwoShare: number;
    dominantShare: number;
    uniqueOps: number;
    overlapDays: number;
  };
}

export function detectPattern(
  activities: DayActivity[],
  scope: OperatorScope = 'all',
  prevRoundStations = 0,
  avgLast4Rounds = 0,
  roundDayCount = 7,
): PatternResult {
  const emptyMetrics = {
    totalStations: 0,
    activeDays: 0,
    firstHalfShare: 0,
    lastTwoShare: 0,
    dominantShare: 0,
    uniqueOps: 0,
    overlapDays: 0,
  };

  if (activities.length === 0) {
    return {
      slug: 'long_pause',
      confidence: 0.95,
      operator_scope: scope,
      metrics: emptyMetrics,
    };
  }

  const byDay = groupByDay(activities);
  const days = Object.keys(byDay).sort();
  const totalStations = activities.reduce((s, d) => s + d.stations_added, 0);
  const activeDays = days.length;
  const totalDays = Math.max(roundDayCount, 1);

  const firstHalfDays = days.slice(0, Math.floor(totalDays / 2));
  const lastTwoDays = days.slice(-2);
  const firstHalfStations = sumDays(byDay, firstHalfDays);
  const lastTwoStations = sumDays(byDay, lastTwoDays);
  const firstHalfShare = totalStations > 0 ? firstHalfStations / totalStations : 0;
  const lastTwoShare = totalStations > 0 ? lastTwoStations / totalStations : 0;

  const operatorTotals = calcOperatorTotals(activities);
  const dominantShare =
    totalStations > 0
      ? Math.max(...Object.values(operatorTotals)) / totalStations
      : 0;
  const uniqueOps = Object.keys(operatorTotals).filter(
    (op) => operatorTotals[op] / totalStations > THRESHOLDS.SINGLE_OPERATOR_MIN_PARTICIPATION,
  ).length;
  const overlapDays = calcOverlapDays(byDay, days);

  const metrics = {
    totalStations,
    activeDays,
    firstHalfShare,
    lastTwoShare,
    dominantShare,
    uniqueOps,
    overlapDays,
  };

  if (
    totalStations <= THRESHOLDS.LONG_PAUSE_MAX_STATIONS ||
    activeDays <= THRESHOLDS.LONG_PAUSE_MAX_ACTIVE_DAYS
  ) {
    return { slug: 'long_pause', confidence: 0.90, operator_scope: scope, metrics };
  }

  if (dominantShare > THRESHOLDS.SINGLE_OPERATOR_MIN_SHARE) {
    return { slug: 'single_operator_week', confidence: 0.85, operator_scope: scope, metrics };
  }

  if (
    firstHalfShare < THRESHOLDS.SILENCE_BURST_FIRST_HALF_MAX &&
    lastTwoShare > THRESHOLDS.SILENCE_BURST_LAST_DAYS_MIN &&
    activeDays >= 2
  ) {
    return { slug: 'silence_then_burst', confidence: 0.85, operator_scope: scope, metrics };
  }

  if (
    avgLast4Rounds > 0 &&
    totalStations >= avgLast4Rounds * THRESHOLDS.RETURN_MIN_VS_AVG &&
    prevRoundStations < avgLast4Rounds * THRESHOLDS.RETURN_PREV_MAX_VS_AVG
  ) {
    return { slug: 'return_of_activity', confidence: 0.75, operator_scope: scope, metrics };
  }

  if (
    uniqueOps <= THRESHOLDS.BACK_AND_FORTH_MAX_OPERATORS &&
    overlapDays >= THRESHOLDS.BACK_AND_FORTH_MIN_OVERLAP_DAYS &&
    dominantShare < THRESHOLDS.BACK_AND_FORTH_MAX_DOMINANT_SHARE
  ) {
    return { slug: 'back_and_forth', confidence: 0.80, operator_scope: scope, metrics };
  }

  if (
    uniqueOps >= THRESHOLDS.DISTRIBUTED_MIN_OPERATORS &&
    activeDays >= THRESHOLDS.DISTRIBUTED_MIN_ACTIVE_DAYS &&
    dominantShare < THRESHOLDS.DISTRIBUTED_MAX_DOMINANT_SHARE
  ) {
    return { slug: 'distributed_activity', confidence: 0.70, operator_scope: scope, metrics };
  }

  if (
    activeDays >= THRESHOLDS.STEADY_MIN_ACTIVE_DAYS &&
    maxDayShare(byDay, days, totalStations) < THRESHOLDS.STEADY_MAX_DAY_SHARE &&
    dominantShare < THRESHOLDS.STEADY_MAX_OPERATOR_SHARE
  ) {
    return { slug: 'steady_progress', confidence: 0.60, operator_scope: scope, metrics };
  }

  return { slug: 'steady_progress', confidence: 0.60, operator_scope: scope, metrics };
}

function groupByDay(data: DayActivity[]): Record<string, DayActivity[]> {
  return data.reduce((acc, d) => {
    if (!acc[d.date]) acc[d.date] = [];
    acc[d.date].push(d);
    return acc;
  }, {} as Record<string, DayActivity[]>);
}

function sumDays(byDay: Record<string, DayActivity[]>, days: string[]): number {
  return days.reduce(
    (s, d) => s + (byDay[d]?.reduce((ss, a) => ss + a.stations_added, 0) || 0),
    0,
  );
}

function calcOperatorTotals(data: DayActivity[]): Record<string, number> {
  return data.reduce((acc, d) => {
    acc[d.operator] = (acc[d.operator] || 0) + d.stations_added;
    return acc;
  }, {} as Record<string, number>);
}

function calcOverlapDays(byDay: Record<string, DayActivity[]>, days: string[]): number {
  return days.filter((d) => {
    const ops = new Set(byDay[d]?.map((a) => a.operator) || []);
    return ops.size >= 2;
  }).length;
}

function maxDayShare(
  byDay: Record<string, DayActivity[]>,
  days: string[],
  total: number,
): number {
  if (total <= 0) return 0;
  let max = 0;
  for (const d of days) {
    const dayTotal = byDay[d]?.reduce((s, a) => s + a.stations_added, 0) || 0;
    max = Math.max(max, dayTotal / total);
  }
  return max;
}
