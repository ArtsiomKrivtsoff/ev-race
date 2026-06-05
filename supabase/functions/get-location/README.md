# get-location (Stage 2.1)

Infrastructure aggregate endpoint — **read-only**, structured JSON for location page SSR.

## Request

```
GET /functions/v1/get-location?operator_slug={operator_slug}&slug={slug}
```

Legacy alias: `operator=` accepted as `operator_slug`.

Params must be **lowercase** (normalize before call).

## Response shape

```json
{
  "location": { },
  "stations": [ ],
  "nearby": [ ],
  "community": {
    "reviews": [],
    "photos": [],
    "tags": [],
    "review_count": 0,
    "photo_count": 0
  },
  "meta": {
    "canonical_url": "https://evrace.by/istpal/mozyr-neftestroiteley-26k1",
    "og_title": "...",
    "og_description": "...",
    "station_count": 4,
    "is_single_station": false
  }
}
```

### `stations[]` fields (Stage 2 UI only)

- `operator`, `aggregator`, `station_type`
- `dc_power`, `ac_power`, `count`
- `connectors[]` (from gun1–3)
- `simultaneous_charge`, `lat`, `lng`, `station_date`

No station `id`, no race fields, no review fields.

### `nearby[]`

- Location-level cards only (deduped by `locations.id`)
- Excludes current location
- Same city (normalized trim + lowercase)
- Sort: `distance_km ASC`, then rating
- Limit: **8**

## Errors

| Status | `{ "error": "..." }` |
|--------|----------------------|
| 400 | `missing_params` |
| 404 | `not_found` |
| 405 | `method_not_allowed` |
| 500 | `query_failed` / `server_misconfigured` |

## Deploy

```bash
supabase functions deploy get-location --no-verify-jwt
```

Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (auto in Supabase).

## Smoke test (after deploy)

```bash
curl -s "https://uvrboxrddqlasgrnnnne.supabase.co/functions/v1/get-location?operator_slug=istpal&slug=mozyr-neftestroiteley-26k1" \
  -H "apikey: YOUR_ANON_KEY" | head -c 2000
```

Expect: `"is_single_station": false`, `"nearby"` array, empty `community.reviews`.

## HTML escaping

**Not in this function.** All DB strings are raw JSON.  
Pages Function renderer **must** `escapeHtml()` every value before HTML (Stage 2.2).
