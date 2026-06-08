# get-location — Stage 3.0

`GET /functions/v1/get-location?operator_slug={slug}&slug={slug}`

Single aggregate endpoint for location page SSR.

## Response `community` (Stage 3.0+)

```json
{
  "review_count": 0,
  "photo_count": 0,
  "reviews": [],
  "photos": [],
  "tags": []
}
```

- **reviews:** last 20 published, non-deleted; includes `tags[]`, `time_ago`, `helpful_count`
- **photos:** last 12 approved; `thumb_url` / `main_url` from `PHOTOS_CDN_BASE`
- **tags:** aggregation from review_tags, sorted by count DESC

## Env

| Variable | Required | Default |
|----------|----------|---------|
| `SUPABASE_URL` | yes | — |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | — |
| `PHOTOS_CDN_BASE` | no | `https://photos.evrace.by` |

## Prerequisites

Apply migrations `006_stage3_users.sql` … `011_stage3_triggers.sql` before deploy.

Run `post_validation_stage3.sql` after apply.
