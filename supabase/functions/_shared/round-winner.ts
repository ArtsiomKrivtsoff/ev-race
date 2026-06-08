import { RACE_OPERATORS } from './snapshot-adapter.ts';

export interface RoundActivity {
  operator: string;
  stations: number;
  last_station_time: string | null;
}

export interface RoundHistory {
  round_number: number;
  operator: string;
  stations_count: number;
}

/** Tie-breaker identical to tour.html: stations desc, then earliest station_time. */
export function detectRoundWinner(activities: RoundActivity[]): RoundActivity | null {
  const raceOnly = activities.filter(
    (a) => RACE_OPERATORS.includes(a.operator as typeof RACE_OPERATORS[number]) && a.stations > 0,
  );
  if (raceOnly.length === 0) return null;

  return raceOnly.sort((a, b) => {
    if (b.stations !== a.stations) return b.stations - a.stations;
    if (a.last_station_time && b.last_station_time) {
      return a.last_station_time < b.last_station_time ? -1 : 1;
    }
    if (a.last_station_time) return -1;
    if (b.last_station_time) return 1;
    return 0;
  })[0];
}

export function buildAchievementLine(
  operator: string,
  roundNumber: number,
  stationsCount: number,
  history: RoundHistory[],
): string {
  const prevWins = history.filter(
    (h) => h.operator === operator && h.round_number < roundNumber,
  );

  if (prevWins.length === 0) return 'Первая победа сезона';

  const prevRound = history.find((h) => h.round_number === roundNumber - 1);
  if (prevRound?.operator === operator) {
    const streak = calcStreak(operator, roundNumber, history);
    if (streak >= 2) return `${streak}-я победа подряд`;
  }

  const prevBest = prevWins.sort((a, b) => b.stations_count - a.stations_count)[0];
  if (stationsCount > prevBest.stations_count) return 'Лучший результат в сезоне';

  const lastWin = prevWins.sort((a, b) => b.round_number - a.round_number)[0];
  const pauseLength = roundNumber - lastWin.round_number - 1;
  if (pauseLength >= 3) return `Возвращение после ${pauseLength} кругов`;

  return `Победа в круге ${roundNumber}`;
}

export function buildSubtitle(
  operator: string,
  roundNumber: number,
  _stationsCount: number,
  achievementLine: string,
  history: RoundHistory[],
): string | null {
  if (achievementLine === 'Первая победа сезона') {
    return 'Первый выигранный круг в сезоне';
  }

  if (achievementLine.includes('подряд')) {
    const streak = calcStreak(operator, roundNumber, history);
    return `Победа в ${streak} кругах подряд`;
  }

  if (achievementLine === 'Лучший результат в сезоне') {
    return 'Лучший результат среди всех побед оператора в сезоне';
  }

  if (achievementLine.includes('Возвращение')) {
    const lastWin = history
      .filter((h) => h.operator === operator && h.round_number < roundNumber)
      .sort((a, b) => b.round_number - a.round_number)[0];
    if (lastWin) return `Предыдущая победа была в круге ${lastWin.round_number}`;
  }

  return null;
}

function calcStreak(operator: string, roundNumber: number, history: RoundHistory[]): number {
  let streak = 1;
  let r = roundNumber - 1;
  while (r >= 1) {
    const h = history.find((x) => x.round_number === r);
    if (h?.operator === operator) {
      streak++;
      r--;
    } else break;
  }
  return streak;
}

export interface StationForWinner {
  operator: string;
  station_date: string;
  count?: number | null;
  station_time?: string | null;
  station_type?: string | null;
}

/** Aggregate tournament stations (DC + AC + ACDC) per race operator for one round. */
export function aggregateRoundActivities(stations: StationForWinner[]): RoundActivity[] {
  const byOp: Record<string, RoundActivity> = {};

  for (const s of stations) {
    if (!RACE_OPERATORS.includes(s.operator as typeof RACE_OPERATORS[number])) continue;
    const t = s.station_type || '';
    if (t !== 'DC' && t !== 'AC' && t !== 'ACDC') continue;

    if (!byOp[s.operator]) {
      byOp[s.operator] = { operator: s.operator, stations: 0, last_station_time: null };
    }
    byOp[s.operator].stations += s.count || 1;
    if (s.station_time) {
      if (
        !byOp[s.operator].last_station_time ||
        s.station_time > byOp[s.operator].last_station_time!
      ) {
        byOp[s.operator].last_station_time = s.station_time;
      }
    }
  }

  return Object.values(byOp);
}
