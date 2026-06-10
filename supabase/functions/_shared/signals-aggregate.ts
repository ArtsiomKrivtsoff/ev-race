/**
 * Aggregated community signals for a location (count > 0 only).
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";

export type AggregatedSignal = {
  slug: string;
  label: string;
  sentiment: string;
  count: number;
};

export async function fetchAggregatedSignals(
  supabase: SupabaseClient,
  locationId: number,
): Promise<AggregatedSignal[]> {
  const { data: dictRows, error: dictErr } = await supabase
    .from("community_signals")
    .select("id, slug, label_ru, sentiment, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (dictErr || !dictRows?.length) return [];

  const { data: countRows, error: countErr } = await supabase
    .from("location_signal_counts")
    .select("signal_id, count")
    .eq("location_id", locationId);

  if (countErr) {
    console.error("location_signal_counts:", countErr.message);
  }

  const countMap = new Map<number, number>();
  for (const row of countRows || []) {
    countMap.set(row.signal_id, row.count ?? 0);
  }

  return dictRows
    .map((s) => ({
      slug: s.slug,
      label: s.label_ru,
      sentiment: s.sentiment,
      count: countMap.get(s.id) ?? 0,
      sort_order: s.sort_order ?? 0,
    }))
    .filter((s) => s.count > 0)
    .sort(
      (a, b) =>
        b.count - a.count ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        a.slug.localeCompare(b.slug),
    )
    .map(({ slug, label, sentiment, count }) => ({
      slug,
      label,
      sentiment,
      count,
    }));
}
