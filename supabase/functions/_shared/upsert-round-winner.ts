import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getRoundDates } from './rounds.ts';
import {
  aggregateRoundActivities,
  buildAchievementLine,
  buildSubtitle,
  detectRoundWinner,
  type RoundHistory,
} from './round-winner.ts';
import type { StationRow } from './snapshot-adapter.ts';

async function fetchRoundStations(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<StationRow[]> {
  const { data, error } = await supabase
    .from('stations')
    .select('station_date, operator, count, station_type, station_time')
    .gte('station_date', startDate)
    .lte('station_date', endDate)
    .order('station_date', { ascending: true });

  if (error) throw error;
  return (data || []) as StationRow[];
}

async function getRoundHistory(supabase: SupabaseClient): Promise<RoundHistory[]> {
  const { data, error } = await supabase
    .from('round_winners')
    .select('round_number, operator, stations_count')
    .order('round_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

export interface RoundWinnerResult {
  operator: string;
  stations: number;
}

/** Deterministic round winner from stations — no GPT. */
export async function upsertRoundWinnerForRound(
  supabase: SupabaseClient,
  roundNumber: number,
  isBackfill = false,
): Promise<RoundWinnerResult | null> {
  const { startDate, endDate } = getRoundDates(roundNumber);
  const stations = await fetchRoundStations(supabase, startDate, endDate);
  const raceStations = stations.filter((s) =>
    ['batteryfly', 'forevo', 'zaryadka', 'united', 'csms'].includes(s.operator)
  );
  const winnerActivity = detectRoundWinner(aggregateRoundActivities(raceStations));

  if (!winnerActivity) {
    await supabase.from('round_winners').delete().eq('round_number', roundNumber);
    return null;
  }

  const history = (await getRoundHistory(supabase)).filter(
    (h) => h.round_number < roundNumber,
  );
  const achievementLine = buildAchievementLine(
    winnerActivity.operator,
    roundNumber,
    winnerActivity.stations,
    history,
  );
  const subtitle = buildSubtitle(
    winnerActivity.operator,
    roundNumber,
    winnerActivity.stations,
    achievementLine,
    history,
  );

  const { error } = await supabase.from('round_winners').upsert(
    {
      round_number: roundNumber,
      operator: winnerActivity.operator,
      stations_count: winnerActivity.stations,
      achievement_line: achievementLine,
      subtitle,
      round_start_date: startDate,
      round_end_date: endDate,
      is_backfill: isBackfill,
    },
    { onConflict: 'round_number' },
  );
  if (error) throw error;

  return { operator: winnerActivity.operator, stations: winnerActivity.stations };
}
