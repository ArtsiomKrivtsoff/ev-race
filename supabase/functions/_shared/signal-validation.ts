/**
 * Community Signals validation — v1
 */

export const FORBIDDEN_SIGNAL_PAIRS: [string, string][] = [
  ["power_match", "power_disappointed"],
  ["access_good", "access_bad"],
];

export const MAX_SIGNALS_PER_SUBMISSION = 4;
export const MIN_SIGNALS_PER_SUBMISSION = 1;
export const SIGNAL_EDIT_COOLDOWN_SECONDS = 5 * 60;

export function normalizeSignalSlugs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const slug = item.trim().toLowerCase();
    if (!slug || out.includes(slug)) continue;
    out.push(slug);
  }
  return out;
}

export function hasForbiddenSignalPair(slugs: string[]): boolean {
  const set = new Set(slugs);
  for (const [a, b] of FORBIDDEN_SIGNAL_PAIRS) {
    if (set.has(a) && set.has(b)) return true;
  }
  return false;
}

export function validateSignalSlugs(
  slugs: string[],
  opts?: { allowEmpty?: boolean },
): string | null {
  const min = opts?.allowEmpty ? 0 : MIN_SIGNALS_PER_SUBMISSION;
  if (slugs.length < min) return "empty_selection";
  if (slugs.length > MAX_SIGNALS_PER_SUBMISSION) return "too_many_signals";
  if (hasForbiddenSignalPair(slugs)) return "conflicting_signals";
  return null;
}

export type SignalRow = {
  id: number;
  slug: string;
  label_ru: string;
  sentiment: string;
};

export function mapValidSignals(
  slugs: string[],
  rows: SignalRow[],
): SignalRow[] {
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs.map((s) => bySlug.get(s)).filter((r): r is SignalRow => Boolean(r));
}
