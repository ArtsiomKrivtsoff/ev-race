# Phase 4B Deployment Verification — Upload UI (Type A)

**Scope:** CF proxy status/upload, upload form, Turnstile, pending/cooldown UX.  
**Not in scope:** report UI, Type B, orphan, TG attribution.

**Automated (BY):** `infra/scripts/verify-photos-phase4b.mjs`

---

## BY API (automated)

| # | Test | Expected |
|---|------|----------|
| A1 | `photos-status` | 200, `can_upload` boolean |
| B1 | `photos-upload` | 200, `accepted ≥ 1` |
| B10 | Status after upload | `pending_count` increases; `can_upload` consistent |
| B10 | `fingerprint_ready` | `true` with same cookie |
| C1 | Bad upload | 400/403 |

Run: `sudo /opt/evrace/scripts/run-verify-photos-phase4b.sh`

---

## CF Pages (manual after deploy)

| # | Test | Expected |
|---|------|----------|
| F1 | `GET /api/photos/status` | 200; `Set-Cookie: evrace_photos_fp` on first visit |
| F2 | Block `#add-photo` visible | §15 copy + file picker + Turnstile |
| F3 | Upload 1 photo | Success «Фото отправлены на модерацию» |
| F4 | «Обновить статус» | Updates pending/cooldown without auto-poll |
| F5 | Empty gallery link | «Добавить фото ↓» → `#add-photo` |
| F6 | B10 manual | Upload → refresh page → pending count reflected |
| F7 | Mobile | File picker / camera opens |
| F8 | Regression | 4A gallery still works |

---

## Deploy

1. Push CF changes (proxy + JS + CSS + `[slug].js`)
2. Cloudflare Production deploy **Success**
3. Optional BY verify script (API unchanged — confirm still deployed)
4. Manual smoke on `https://evrace.by/.../...#add-photo`

**No new CF env vars** (reuse `PHOTOS_API_BASE`, `PHOTOS_BY_ANON_KEY`).

---

## Rollback

Remove upload block + proxy routes + `photos-upload.js` from `[slug].js`. Gallery (4A) unaffected.
