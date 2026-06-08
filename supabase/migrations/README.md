# Supabase migrations — Infrastructure Platform Stage 1

Source of truth for DB changes. Apply manually in Supabase Studio (SQL Editor).

---

## Platform model (nationwide)

**Location platform covers ALL charging infrastructure in Belarus** — not only 10 branded networks.

| Field | Meaning |
|-------|---------|
| `stations.operator` | Real owner (any name, Cyrillic OK) |
| `stations.aggregator` | Secondary ecosystem label (UI only in Stage 1) |
| `locations.operator` | Raw owner name (display / identity) |
| `locations.operator_slug` | URL path segment: `/elektrorumosp/minsk-...` |
| `locations.slug` | Address path segment |

**No operator whitelist.** Skip sync **only** if `operator`, `city`, or `address` is missing.

Branded operators (batteryfly, malanka, …) keep latin slugs. Small юрлица get transliterated `operator_slug`.

**Stage 2 note:** Pages Function must use `operator_slug` + drop `validOps` whitelist from spec.

---

## APPLY sequence (Stage 1)

**Prerequisite:** backup or Supabase point-in-time recovery available.

**If you already applied OLD `001` with CHECK whitelist:** do not re-run 001 — use patch SQL from author (DROP CHECK, ADD operator_slug) or rollback first.

### Phase 0 — Preflight (read-only)

| Step | File / action | Expected |
|------|---------------|----------|
| 0.1 | Run `preflight_audit.sql` §1–2 | All operators listed; `ok` count = expected locations |
| 0.2 | Apply `001→003`, run §4 + §5 | Review `operator_slug_preview` for small owners (ИстПал, …) |
| 0.3 | Confirm `ok` = 154 (or your current total with valid identity) | No `unknown_operator` skip anymore |

### Phase 1 — Migrations (in order)

| Step | File | Verify after run |
|------|------|------------------|
| 1 | `001_locations.sql` | Table `locations`; no CHECK on operator; column `operator_slug` |
| 2 | `002_generate_location_key.sql` | Whitespace collapse in key |
| 3 | `003_generate_slug.sql` | `SELECT generate_operator_slug('ЭлектроРумОСП');` → latin slug |
| 4 | `004_sync_trigger.sql` | Trigger + `location_sync_skipped` |
| 4b | `004b_fix_upsert_latlng.sql` | Patch if 004 ran before lat/lng fix (double precision) |
| 5 | `005_backfill.sql` | `locations_count` = preflight `ok` count |

### Phase 2 — Post-validation

See `post_validation.sql` — DoD A + PASS GATE must pass.

### Phase 3 — Frontend smoke

See `SMOKE_CHECKLIST.md`.

---

## File index

| File | Purpose |
|------|---------|
| `preflight_audit.sql` | Audit before migrations |
| `001_locations.sql` | `locations` (any operator + `operator_slug`) |
| `002_generate_location_key.sql` | Canonical key |
| `003_generate_slug.sql` | `generate_slug` + `generate_operator_slug` |
| `004_sync_trigger.sql` | Trigger + skip log (missing fields only) |
| `005_backfill.sql` | Backfill |
| `post_validation.sql` | DoD checks |
| `SMOKE_CHECKLIST.md` | Frontend smoke |

---

## Stage 3.0 Foundation (UGC schema)

Apply **after** Stage 1 migrations (001–005).

| Step | File |
|------|------|
| 6 | `006_stage3_users.sql` |
| 7 | `007_stage3_tags.sql` |
| 8 | `008_stage3_reviews.sql` |
| 9 | `009_stage3_photos.sql` |
| 10 | `010_stage3_user_activity.sql` |
| 11 | `011_stage3_triggers.sql` |

Post-check: `post_validation_stage3.sql` (tags=8, no `is_visible`, `view_count` columns).

Edge Functions:

- `telegram-auth` — POST, validates TG Login → `user_hash`
- `get-location` — extended `community` read path

Secrets (Supabase Dashboard → Edge Functions):

- `TELEGRAM_BOT_TOKEN`
- `USER_HASH_SALT` (random string, never commit)
- `PHOTOS_CDN_BASE` (optional)

Docs: [`STAGE-3-ARCHITECTURE.md`](../docs/STAGE-3-ARCHITECTURE.md), [`STAGE-3-COPYWRITING.md`](../docs/STAGE-3-COPYWRITING.md) (**FROZEN**), [`STAGE-3-PHASE-3.0-SIGNOFF.md`](../docs/STAGE-3-PHASE-3.0-SIGNOFF.md) (apply/deploy + contracts).

---

## Canonical identity

```
location_key = normalize(operator) | normalize(city) | normalize(address)
URL          = /{operator_slug}/{slug}
operator_slug = generate_operator_slug(operator)   -- translit, immutable after insert
slug         = generate_slug(city, address)        -- translit, immutable after insert
```

**Skip sync only when:** missing operator / city / address.

**Not in scope:** address dictionaries, fuzzy match, coordinate merge.

Legacy `locationKey()` in `stations.js` is **not** canonical.

---

## Backfill idempotency / trigger safety

See previous review — unchanged: re-run 005 safe; no trigger recursion.

## Slug fallback

Empty address transliteration → `{operator_slug}-location`, `{operator_slug}-location-1`, …

---

## Rollback (manual, destructive)

```sql
DROP TRIGGER IF EXISTS stations_sync_location ON stations;
DROP FUNCTION IF EXISTS sync_location_from_station();
DROP FUNCTION IF EXISTS upsert_location_from_station(bigint, text, text, text, text, double precision, double precision);
DROP FUNCTION IF EXISTS upsert_location_from_station(bigint, text, text, text, text, numeric, numeric);
DROP FUNCTION IF EXISTS allocate_location_slug(text, text);
DROP TABLE IF EXISTS location_sync_skipped;
DROP TABLE IF EXISTS locations;
DROP FUNCTION IF EXISTS generate_operator_slug(text);
DROP FUNCTION IF EXISTS generate_slug(text, text);
DROP FUNCTION IF EXISTS generate_location_key(text, text, text);
DROP FUNCTION IF EXISTS normalize_identity_part(text);
```
