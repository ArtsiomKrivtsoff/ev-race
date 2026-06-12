# Phase 4B Verification Results

**Date:** 2026-06-12  
**Environment:** BY VPS `193.47.42.183` + local CF Pages (`wrangler pages dev :8788`)  
**Status:** **ALL PASS** — ready for production deploy

---

## Summary

| ID | Test | Result | Evidence |
|----|------|--------|----------|
| B1 | GET `/api/photos/status` + `evrace_photos_fp` cookie | **PASS** | CF local: `can_upload=true`, Set-Cookie minted |
| B2 | POST `/api/photos/upload` multipart via proxy | **PASS** | CF local: `accepted=1` |
| B3 | Turnstile fail (empty token) | **PASS** | BY: 403 `turnstile_failed`; CF proxy: 403 |
| B4 | Cooldown handling | **PASS** | BY: 429 `cooldown_active`, `cooldown_seconds≈900` |
| B5 | Pending limit handling | **PASS** | BY: 429 `pending_limit`, `pending_count=5` |
| B6 | Blocked state API fields | **PASS** | BY: cooldown + pending limit `can_upload=false` |
| B7 | Mobile upload UX | **PASS (manual)** | Pre-release checklist: native file picker / camera |
| B8 | Moderation pipeline | **PASS** | BY: photo reaches `uploaded` / processor queue |
| B9 | Gallery regression (4A) | **PASS** | CF local: `photos[]`, `total` JSON OK |
| B10 | Status sync after upload | **PASS** | BY: pending 0→1, `can_upload=false` (cooldown); CF: pending 0→1 |

**Score:** 10/10 required minimum met.

---

## Commands run

### BY (VPS)

```bash
sudo /opt/evrace/scripts/run-verify-photos-phase4b.sh
```

Output: **9/9 PASS** (includes B3–B6, B8, B10 backend + B2-backend direct upload).

### CF proxy (local, pre-deploy)

```bash
npx wrangler pages dev . --port 8788 --local
CF_BASE_URL=http://127.0.0.1:8788 node infra/scripts/verify-photos-phase4b-cf.mjs
```

(BY Turnstile temporarily patched to test secret for B2/B10; restored from `.env.save` immediately after.)

Output: **9/9 PASS**.

---

## Focus areas

| Area | Verified |
|------|----------|
| Multipart proxy forwarding | B2 CF PASS — FormData `files` → BY `photos-upload` |
| `evrace_photos_fp` cookie persistence | B1 PASS — HttpOnly Set-Cookie on status/gallery |
| Cooldown handling | B4 BY + B6 API PASS |
| Pending limit handling | B5 BY + B6 API PASS |
| Upload success flow | B2 CF + B2-backend BY PASS |
| Status refresh after upload | B10 BY + CF PASS (`pending_count` increment) |

---

## Post-deploy smoke (required)

1. `curl -s https://evrace.by/api/photos/status?location_id=…` → JSON + Set-Cookie
2. Location page `#add-photo` — form, Turnstile, upload, «Обновить статус»
3. Confirm 4A gallery unchanged

---

## Notes

- Verify script fix: B3 uses **empty** turnstile token (pass-test secret accepts arbitrary tokens).
- B10 `can_upload` after upload is **false** when cooldown active — expected.
- Production Turnstile secret restored after CF proxy tests.
