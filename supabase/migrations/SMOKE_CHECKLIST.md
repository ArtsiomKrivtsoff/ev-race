# Stage 1 — Post-APPLY smoke checklist (manual)

Run **after** migrations 001–005 and `post_validation.sql` PASS gate.

No frontend code was deployed in Stage 1. This confirms existing production pages still work.

---

## Database (Supabase Studio)

- [ ] `post_validation.sql` DoD A: `locations_count` = `expected_count`
- [ ] PASS GATE: `dod_c_failures` = 0, `dod_d_failures` = 0, `dod_e_failures` = 0
- [ ] DoD B reviewed: `location_sync_skipped` reasons understood
- [ ] DoD F shortlist reviewed (if any rows)
- [ ] Optional DoD H: trigger smoke in transaction + ROLLBACK

---

## Frontend (browser, production or local against live Supabase)

Open each page; check **no new errors** in DevTools Console (F12).

| Page | URL | Check |
|------|-----|-------|
| Реестр станций | `/stations.html` | Loads; table/cards render; filters work |
| Карта | `/map.html` | Loads; markers/clusters; popup opens |
| Голосование | `/` or `/index.html` | Vote section loads; results fetch OK (if already voted — bars show) |
| Письма | `/letters.html` | List loads; filters work |

### Console rule

- [ ] **No new red errors** introduced by Stage 1 (DB-only change)
- [ ] Pre-existing warnings OK if they were there before APPLY

### Quick functional checks

- [ ] `stations.html` — change operator filter → list updates
- [ ] `map.html` — click marker → popup with route button
- [ ] `index.html` — vote bars / options render (no need to submit new vote)
- [ ] `letters.html` — at least one letter card or empty state loads without error

---

## Explicitly NOT tested in Stage 1

- Location pages (`/{operator}/{slug}`) — Stage 2
- Stars / links to location pages — Stage 2–3
- Reviews / Telegram auth — Stage 3
- Any change to `stations.js` / `map.html` — none expected

---

## Sign-off

Stage 1 complete when:

1. All DB PASS gates green
2. All frontend checkboxes ticked
3. Author reviewed slug shortlist (DoD F) if present
