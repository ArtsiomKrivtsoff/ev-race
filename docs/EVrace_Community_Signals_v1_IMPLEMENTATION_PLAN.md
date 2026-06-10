# EVrace Community Signals v1 — Final Implementation Plan

**Дата:** 2026-06-08  
**Статус:** **APPROVED — ready for implementation**  
**Предшественники:**  
- `EVrace_Community_Signals_v1_Cursor_Brief.md`  
- `EVrace_Community_Signals_v1_ARCHITECTURE_AUDIT.md` (принят PO)

**Правило:** код начинаем **только после** прохождения checklist §12 этим документом.

---

## 1. Executive Summary

Реализуем **Community Signals v1** — автономную систему «**Что говорят о локации**»:

- отдельные таблицы и endpoint;
- накопительные счётчики без затухания;
- один финальный вклад на локацию на browser-voter;
- antispam: **Turnstile + HttpOnly cookie + UNIQUE(location_id, voter_key)**;
- forbidden pairs на submit;
- без Telegram, без авторизации.

**На location page Phase A:**

| Показываем | Скрываем |
|------------|----------|
| Area A — aggregated signals | Review **form** |
| Area B — add observation | CTA «Оставить отзыв» после submit |
| Reviews list (**read-only**) | `submit-review` UI, TG widget |
| Photos sidebar, Nearby | Photo upload block (если не Phase B — **скрыть** upload UI, галерея read-only OK) |

> **Note:** в `[slug].js` сейчас есть `renderPhotoUploadBlock()` — для Phase A скрыть upload UI; галерея фото без изменений если уже read-only.

---

## 2. PO Decisions (LOCKED)

| # | Решение | Impl |
|---|---------|------|
| D1 | Отдельная архитектура + таблицы | Migration 013, no FK to reviews |
| D2 | Turnstile + Cookie + UNIQUE | §5 |
| D3 | Forbidden pairs | `power_match`↔`power_disappointed`, `access_good`↔`access_bad` |
| D4 | Отдельный endpoint | `submit-community-signals`, `community-signals-status` |
| D5 | Накопление без decay | Increment counts forever |
| D6 | Empty Area A | RU copy про **первое наблюдение** (§8) |
| D7 | Queue визуально **красный** | CSS class `--warning` maps to red styling per PO |
| D8 | CTA отзыва после submit | **Скрыть** |
| D9 | Already voted | **Server status** endpoint |
| D10 | Reviews | **Read-only** list; form hidden |
| D11 | Заголовок блока | **«Что говорят о локации»** |
| D12 | Rate limits | Dev proposes constants; **PO не фиксирует** — см. §5.4 |

---

## 3. Scope

### In Scope

- DB schema + seed 10 signals  
- Edge Functions: status + submit  
- Extend `get-location` read path for aggregated counts  
- SSR + client JS for Area A + Area B  
- Turnstile on submit  
- Voter cookie lifecycle  
- Forbidden pair validation  
- Hide review form + review CTAs  
- Smoke tests + deploy runbook  

### Out of Scope

- Reviews submit / edit / delete  
- Ratings / stars / X.X  
- Telegram Login  
- Photo upload (hide upload block; existing gallery read OK)  
- Reputation, helpful, dashboard, consent  
- Rate limit values in prod config (dev suggests, PO approves later)  
- Optimistic agg beyond minimal client patch (nice-to-have §10)

---

## 4. Data Model (Final)

**Migration:** `supabase/migrations/013_community_signals.sql`

### 4.1 `community_signals` (dictionary)

```sql
-- sentiment: positive | negative | warning
-- warning row: slug = 'queue', label = 'Очередь'
```

| slug | label_ru | sentiment |
|------|----------|-----------|
| `power_match` | Мощность соответствовала | positive |
| `access_good` | Удобный подъезд и парковка | positive |
| `lighting_good` | Хорошее освещение | positive |
| `shelter` | Есть навес или укрытие | positive |
| `amenities` | Есть кафе/магазин/туалет рядом | positive |
| `power_disappointed` | Мощность разочаровала | negative |
| `charge_failed` | Не удалось зарядиться | negative |
| `ice_at_charger` | ДВС у зарядки | negative |
| `access_bad` | Неудобный подъезд и парковка | negative |
| `queue` | Очередь | warning |

RLS: public SELECT where `is_active = true`.

### 4.2 `community_signal_submissions`

| Column | Type | Notes |
|--------|------|-------|
| id | bigserial PK | |
| location_id | bigint NOT NULL FK → locations | |
| voter_key | text NOT NULL | HMAC-SHA256 hex, 64 chars |
| created_at | timestamptz DEFAULT now() | |

**UNIQUE (location_id, voter_key)** — one submission per voter per location.

Index: `(location_id, created_at DESC)` — optional analytics.

### 4.3 `community_signal_submission_items`

| Column | Type |
|--------|------|
| submission_id | bigint FK → submissions ON DELETE CASCADE |
| signal_id | smallint FK → community_signals |

**PRIMARY KEY (submission_id, signal_id)**

Check enforced in API: **1 ≤ count ≤ 4** items per submission.

### 4.4 `location_signal_counts` (denormalized cache)

| Column | Type |
|--------|------|
| location_id | bigint FK |
| signal_id | smallint FK |
| count | int NOT NULL DEFAULT 0 |

**PRIMARY KEY (location_id, signal_id)**

Updated **in same transaction** as submission insert (trigger or Edge Function).

### 4.5 Relationship to legacy tables

- **No FK** to `reviews`, `review_tags`, `users`.
- Legacy Stage 3 tables **untouched** in Phase A.
- `tags` / `review_tags` remain for future Reviews phase — **not used** by Signals UI.

---

## 5. Antispam & Validation

### 5.1 Voter identity

| Step | Detail |
|------|--------|
| Cookie name | `evrace_voter` |
| Attributes | `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000` |
| Value | UUID v4 (server-generated) |
| Set on | First call to `community-signals-status` **or** submit if missing |
| DB key | `voter_key = HMAC_SHA256(cookie_uuid, VOTER_KEY_SALT)` |
| Secret | `VOTER_KEY_SALT` in Supabase Edge secrets (reuse pattern of `USER_HASH_SALT`) |

### 5.2 Submit pipeline

```
1. Parse Cookie evrace_voter (or issue new)
2. verifyTurnstile(token, cf-connecting-ip)
3. Validate location_id active
4. Validate signal_slugs: 1..4, all active, no duplicates
5. Validate forbidden pairs (§5.3)
6. BEGIN
7.   INSERT submission (catch UNIQUE → 409 already_submitted)
8.   INSERT items
9.   UPSERT location_signal_counts += 1 per signal
10. COMMIT
11. Return success + selected labels for UI
```

### 5.3 Forbidden pairs (server + client)

| Pair | Slugs |
|------|-------|
| A | `power_match` + `power_disappointed` |
| B | `access_good` + `access_bad` |

Error code: `conflicting_signals` · RU: «Эти наблюдения противоречат друг другу — сними одно.»

### 5.4 Rate limits (dev proposal — not PO-fixed)

Implement as **config constants** in Edge Function, easy to tune post-launch:

| Limit | Suggested default | Env override |
|-------|-------------------|--------------|
| Submissions per IP per hour | 30 | `SIGNALS_RATE_IP_HOUR` |
| Submissions per location per hour | 100 | `SIGNALS_RATE_LOC_HOUR` |

Storage: optional `signals_rate_events` table **or** in-memory skip for v1 — **recommend** simple Postgres table with TTL cleanup job later; **v1 minimum:** log-only + manual monitor if skip table.

**PO:** values not locked — ship with constants in code + env, document in README.

### 5.5 Accidental double submit

- Client: disable button, label «Секунду…»
- Server: UNIQUE → idempotent 409 with `already_submitted` + prior selection if lookup possible

---

## 6. API Contracts

### 6.1 `GET /functions/v1/community-signals-status`

**Query:** `location_id` (required)

**Headers:** Cookie `evrace_voter` (optional — server sets if absent)

**Response 200:**

```json
{
  "voter_ready": true,
  "submitted": false,
  "selection": []
}
```

If already submitted:

```json
{
  "voter_ready": true,
  "submitted": true,
  "selection": [
    { "slug": "power_match", "label": "Мощность соответствовала", "sentiment": "positive" }
  ],
  "submitted_at": "2026-06-08T12:00:00Z"
}
```

**Errors:** `400 invalid_location` · `404 location_not_found`

`verify_jwt = false` · CORS for evrace.by

### 6.2 `POST /functions/v1/submit-community-signals`

**Body:**

```json
{
  "location_id": 47,
  "signal_slugs": ["power_match", "queue"],
  "turnstile_token": "..."
}
```

**Response 200:**

```json
{
  "success": true,
  "submission_id": 123,
  "selection": [ ... ],
  "counts_delta": { "power_match": 1, "queue": 1 }
}
```

**Errors:**

| HTTP | error | RU (alert/toast) |
|------|-------|------------------|
| 400 | `invalid_payload` | Проверь выбранные наблюдения |
| 400 | `conflicting_signals` | Эти наблюдения противоречат друг другу |
| 403 | `turnstile_failed` | Проверка не прошла. Обнови страницу |
| 409 | `already_submitted` | Ты уже учёл наблюдение для этой локации |
| 429 | `rate_limited` | Слишком много попыток. Попробуй позже |
| 404 | `location_not_found` | — |

### 6.3 Extend `GET get-location`

Add to `community`:

```json
{
  "signals": [
    {
      "slug": "power_match",
      "label": "Мощность соответствовала",
      "sentiment": "positive",
      "count": 48
    }
  ],
  "signals_total_votes": 120
}
```

- Include **all dictionary signals** with `count: 0` **or** only `count >= 1` for Area A?  
  **Decision:** Area A shows **only count ≥ 1**; empty state when none — PO D6.

Optional: `form_signals` — full active dictionary for Area B chips (all 10 always visible).

---

## 7. Frontend Specification

### 7.1 Block structure (one `<section>`)

**Title:** `Что говорят о локации`

**Area A — aggregated (`#community-signals-agg`)**

- Large chips, horizontal flex-wrap  
- Only signals with `count >= 1`  
- Format: `{label} ×{count}` (× optional, large counter per brief)  
- Empty: **«Станция ждёт первое наблюдение сообщества.»** (PO D6 — Tone of Voice, инфраструктурно)

**Area B — input (`#community-signals-form`)**

- Visible immediately when `submitted === false`  
- All 10 chips, smaller visual weight  
- Counter: **«Выбрано X из 4»**  
- Tags disabled styling until… **brief: no star gate** — chips selectable immediately (unlike old review form)  
- Turnstile widget before submit  
- Button: **«Учесть наблюдение»**  
- Nothing saved until click  

**Area B — success (`submitted === true`)**

- **«✓ Сигнал учтён»**  
- **«Спасибо за вклад в EVrace»**  
- Recap selected chips (read-only, colored + ✓)  
- **No** CTA «Оставить отзыв» (PO D8)  

**Area B — already voted on load**

- Same as success (from status API)

### 7.2 Visual states (chips)

| State | positive | negative | warning (queue) |
|-------|----------|----------|-----------------|
| Default | neutral chip | neutral chip | neutral chip |
| Selected | green + ✓ | red + ✓ | **red** + ✓ (PO D7) |

Area A chips: larger typography, stronger border/glow — **visual hierarchy** vs Area B.

**Layout:** never vertical list — only `flex-wrap` rows.

### 7.3 Desktop / mobile

- Block in **main column** (replace `renderTagsBlock`)  
- Order main col (align with prior PO layout): infra → **Community Signals** → reviews (read-only) → nearby stays sidebar with photos  
- Mobile: single column, same block order  
- Min tap target 44px  

### 7.4 Location page changes

| File | Action |
|------|--------|
| `functions/_lib/location-render.js` | Add `renderCommunitySignalsBlock()`; remove/replace `renderTagsBlock` usage |
| `functions/[operator_slug]/[slug].js` | Swap tags → signals; **remove** `renderReviewFormBlock()`; hide photo upload block; drop `community-auth.js` + `review-form.js` scripts |
| `JS/community-signals.js` | **New** — status fetch, chip UI, submit, success |
| `CSS/location-page.css` | **New** `.cs-*` classes |
| `JS/location-page.js` | Remove review-form anchor handlers if broken; keep reviews pagination/lightbox |

### 7.5 Client flow

```
DOMContentLoaded
  → GET community-signals-status?location_id=
  → if submitted: renderSuccess(selection)
  → else: renderForm(dictionary from loc-page-data JSON)

User toggles chips (max 4, client forbidden pairs)
  → update counter

Submit
  → Turnstile token
  → POST submit-community-signals
  → on success: renderSuccess + patch Area A counts (optimistic or refetch status+counts)
```

Embed in SSR:

```html
<script type="application/json" id="loc-signals-data">{ location_id, form_signals[] }</script>
```

---

## 8. Backend File Manifest

| File | Action |
|------|--------|
| `supabase/migrations/013_community_signals.sql` | **Create** |
| `supabase/functions/_shared/voter.ts` | **Create** — cookie parse, voter_key HMAC |
| `supabase/functions/_shared/signal-validation.ts` | **Create** — slugs, pairs, limits |
| `supabase/functions/community-signals-status/index.ts` | **Create** |
| `supabase/functions/submit-community-signals/index.ts` | **Create** |
| `supabase/functions/submit-community-signals/deno.json` | **Create** |
| `supabase/functions/get-location/index.ts` | **Extend** — `community.signals` |
| `supabase/config.toml` | **Add** verify_jwt = false for new functions |
| `supabase/functions/_shared/turnstile.ts` | Reuse |

---

## 9. Implementation Phases (Execution Order)

### Phase 0 — Prep (0.5 d)

- [ ] Copy PO decisions to this doc ✓  
- [ ] Add `VOTER_KEY_SALT` to Supabase secrets  
- [ ] Confirm Turnstile site/secret on prod  

### Phase 1 — Database (1 d)

- [ ] Write `013_community_signals.sql`  
- [ ] Apply on staging/prod  
- [ ] Verify seed 10 rows + RLS  

### Phase 2 — Edge Functions (1.5 d)

- [ ] `_shared/voter.ts` + `signal-validation.ts`  
- [ ] `community-signals-status`  
- [ ] `submit-community-signals`  
- [ ] Extend `get-location`  
- [ ] Deploy functions  
- [ ] curl smoke (§11)  

### Area A display mode — **LOCKED (PO)**

| Variant | Behavior | Empty state | Status |
|---------|----------|-------------|--------|
| **A** | Only signals with `count > 0` | «Станция ждёт первое наблюдение сообщества.» | **Accepted** |
| B | Full dictionary, show `×0` | Not used — 10 muted chips | **Rejected** |

**PO decision (2026-06-03):** Variant A only. Area A never shows zero-count chips.

**Visual mockup:** `docs/mockups/community-signals-area-a-mockup.html`

**Empty state (FINAL, locked):** `Станция ждёт первое наблюдение сообщества.`

### Phase 3 — SSR + CSS (1 d)

- [ ] `renderCommunitySignalsBlock` Area A shell  
- [ ] Empty state copy D6  
- [ ] `.cs-agg-*` / `.cs-form-*` styles, queue red  
- [ ] Remove tags block, review form, photo upload from `[slug].js`  
- [ ] Bump CSS/JS cache query params  

### Phase 4 — Client JS (1 d)

- [ ] `community-signals.js` — full Area B logic  
- [ ] Forbidden pairs client-side  
- [ ] Turnstile render  
- [ ] Success / already-voted states  
- [ ] Optimistic Area A count patch  

### Phase 5 — Integration & QA (0.5 d)

- [ ] Desktop + mobile visual QA  
- [ ] Double-submit, 409, turnstile fail  
- [ ] CF cache behavior documented  
- [ ] Reviews list still renders read-only  

### Phase 6 — Prod deploy (0.5 d)

- [ ] Migration apply  
- [ ] Functions deploy  
- [ ] Git push → CF Pages  
- [ ] Prod smoke one location  

**Total estimate:** ~5–6 dev-days

---

## 10. Deploy Runbook

```
1. supabase db push / apply 013_community_signals.sql
2. supabase secrets set VOTER_KEY_SALT=...
3. supabase functions deploy community-signals-status submit-community-signals get-location
4. git push main → Cloudflare Pages
5. Smoke (§11)
```

**Rollback:** disable submit function; hide signals block via flag; legacy review form stays hidden.

---

## 11. Smoke Checklist (Definition of Done)

| # | Test | Expected |
|---|------|----------|
| S1 | Location page loads | Block «Что говорят о локации» visible |
| S2 | Area A empty | Copy «Станция ждёт первое наблюдение сообщества.» |
| S3 | Select 4 chips + submit | 200, success UI |
| S4 | Area A updates | Counts visible for selected signals |
| S5 | Reload page | status `submitted: true`, success UI, no form |
| S6 | Second submit attempt | 409 already_submitted |
| S7 | Forbidden pair client | Cannot select both; server rejects if bypass |
| S8 | Turnstile missing | 403 turnstile_failed |
| S9 | Reviews section | List visible if data exists; **no form** |
| S10 | No TG widget on page | — |
| S11 | Queue chip selected | Red + ✓ |

---

## 12. Pre-Code Checklist (sign-off)

- [x] Architecture audit accepted  
- [x] PO decisions locked (§2)  
- [x] Data model finalized (§4)  
- [x] API contracts finalized (§6)  
- [x] UI spec finalized (§7)  
- [x] Out of scope clear (§3)  
- [ ] **`VOTER_KEY_SALT` generated by PO/ops**  
- [ ] **GO to start Phase 1 coding**

---

## 13. Copy Deck (RU — locked)

| Key | Text |
|-----|------|
| Block title | Что говорят о локации |
| Area A empty | Станция ждёт первое наблюдение сообщества. |
| Counter | Выбрано X из 4 |
| Submit button | Учесть наблюдение |
| Success title | ✓ Сигнал учтён |
| Success body | Спасибо за вклад в EVrace |
| Forbidden pair | Эти наблюдения противоречат друг другу — сними одно. |
| Already submitted | Ты уже учёл наблюдение для этой локации |
| Turnstile fail | Проверка не прошла. Обнови страницу и попробуй снова. |
| Min selection | Выбери хотя бы одно наблюдение |
| Rate limited | Слишком много попыток. Попробуй позже. |

---

## 13.1 Mobile UX — collapsed form (PO, 2026-06)

**Scope:** mobile only (`max-width: 899px`). Desktop unchanged — form always expanded.

### Default (mobile)

Compact card:

| Element | Copy |
|---------|------|
| Title | Добавить наблюдение |
| Lead | Поделитесь своим опытом на этой локации |
| CTA | Добавить наблюдение |

Aggregated block fully visible above — primary reading surface.

### Expanded (mobile)

After tap CTA:

- All 10 signal chips
- Hint: «Выберите до 4 наблюдений»
- Counter: «Выбрано X из 4»
- Turnstile + «Учесть наблюдение»

### After submit (mobile)

Form **collapses** to compact success:

| Element | Copy |
|---------|------|
| Title | ✓ Наблюдение учтено |
| Body | Спасибо за вклад в EVrace |
| Recap | Selected chips (read-only) |
| CTA | Оставить отзыв — «Для публикации отзыва потребуется Telegram» |

**Note:** supersedes prior D8 «no review CTA after signals» **on mobile only**.

### Implementation status

| Layer | Status |
|-------|--------|
| Chip typography (Isabel trial, flex wrap, 2-line clamp) | CSS v33 |
| Mobile collapse / expand / success compact | **Planned** — requires SSR shell + JS |
| Mockup | Update `docs/mockups/` when implementing mobile |

### UX risks (desktop vs mobile split)

| Risk | Mitigation |
|------|------------|
| User on mobile doesn’t discover input | Clear teaser card + single CTA; agg block first |
| Different success copy desktop/mobile | Accept intentional; document in copy deck |
| Review CTA only on mobile re-opens TG scope | Link to `#reviews-list` or future review form; label Telegram requirement |
| Already-voted on load shows expanded form on desktop, collapsed success on mobile | JS reads `submitted` + `matchMedia` |
| Turnstile inside collapsed panel — widget init on expand | Render Turnstile only after expand (lazy) |
| CF HTML cache hides fresh agg counts | Client refresh via `/api/community-signals-status` (done) |

---

## 14. Future Phases (reference only)

| Phase | System |
|-------|--------|
| B | Photos v1 |
| C | Reviews & Ratings v1 |

Community Signals tables **не мигрируют** в reviews — cumulative counts остаются.

---

**END OF IMPLEMENTATION PLAN**
