/** Cron auth: accept any configured project secret (GitHub may use SNAPSHOT_CRON_SECRET). */
export function validateCronSecret(header: string | null): boolean {
  if (!header) return false;
  const keys = ['WEEKLY_LETTER_SECRET', 'SNAPSHOT_CRON_SECRET', 'CRON_SECRET'];
  for (const key of keys) {
    const expected = Deno.env.get(key);
    if (expected && header === expected) return true;
  }
  return false;
}
