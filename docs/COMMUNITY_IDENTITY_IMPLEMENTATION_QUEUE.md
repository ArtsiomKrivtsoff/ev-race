# Community Identity — очередь реализации

**Обновлено:** 2026-06-20  
**Синхронизировано с:** `docs/COMMUNITY_IDENTITY_IMPLEMENTATION_PLAN.md`  
**user_hash модель:** `docs/COMMUNITY_IDENTITY_USER_HASH_DECISION.md` (ACCEPT)  
**Источники истины:** `docs/COMMUNITY_IDENTITY_V1.md` (ACCEPT) · `docs/COMMUNITY_ARCHITECTURE_V1.md`  
**Сквозной принцип:** `docs/EVRACE_SIMPLICITY_PRINCIPLE.md`  
**Правило:** код и prod-правки — только после явного **ДЕЛАЙ**

> **QUEUE** — операционный трекер: что сделано, что в очереди, чеклисты по этапам.  
> **PLAN** — нормативный roadmap: зависимости, критерии готовности, блокеры, волны выката.

---

## Сводка статуса

| Вердикт PLAN | **BLOCKERS FOUND (B1–B5)** — полный Community Layer в prod заблокирован migration debt |
|--------------|----------------------------------------------------------------------------------------|
| Можно начинать | **Этап 1–2** (Identity на BY) + черновик **Этапа 7** (migration runbook) |
| Следующий шаг | Этап 3: repo cleanup ✅, BY V1 ✅ — старт по **ДЕЛАЙ** (frontend cutover на BY API) |

---

## As-is (фактическое состояние, июнь 2026)

| Компонент | Статус | Где |
|-----------|--------|-----|
| Документация V1 + ARCHITECTURE | ✅ ACCEPT | `docs/` |
| Production roadmap | ✅ Готов | `COMMUNITY_IDENTITY_IMPLEMENTATION_PLAN.md` |
| Entry + Profile + History mock | ✅ UX-audit v4 | `mock/`, `CSS/community-profile.css?v=4` |
| BY VPS + self-hosted Supabase | ✅ Infra v3.1 | `api.evrace.by`, `public` schema пустая (кроме photos) |
| Photos v1.2 Type A | ✅ Prod-verified | `infra/by-migrations/001–006`, Phase 4B PASS |
| Photos Type B upload | ❌ Не built | Display-only; `EVrace_REVIEWS_V1_TYPE_B_AUDIT.md` |
| `telegram-auth`, `users`, `reviews` | ⚠️ Legacy Stage 3 | Облачный Supabase, `supabase/functions/` |
| `JS/community-auth.js` | ⚠️ Partial | Session = `user_hash` only; нет EVR ID / Identity |
| Community Identity BY schema | ❌ Не начато | Нет `community_identities` migration |
| Prod URL `/evr-id`, `/my`, `/history` | ❌ Не подключены | Только mock |
| Trust Layer spec | ✅ APPROVED | `TRUST_LAYER_IMPLEMENTATION_SPEC.md`; routes в `functions/` |
| Глобальный nav «МОЙ ВКЛАД» | ❌ Не в prod | Только mock statusbar |

---

## Этапы PLAN ↔ статус QUEUE

Нумерация **совпадает** с `COMMUNITY_IDENTITY_IMPLEMENTATION_PLAN.md`.

| Этап PLAN | Название | Статус | Зависимости |
|-----------|----------|--------|-------------|
| — | **Подготовка** (документация + mock) | ✅ Готово | — |
| **1** | Identity Foundation | ✅ **Deployed BY** | Подготовка ✅ |
| **2** | Identity API | ⏸ Spec READY — ждёт утверждения + **ДЕЛАЙ** | Этап 1 ✅ |
| **3** | Frontend Integration | ⏸ Очередь | Этап 2; B5 для prod nav |
| **4** | UGC Integration | ⏸ Очередь | Этапы 1–2, 7 (cutover) |
| **5** | Moderation Impact | ⏸ Очередь | Этап 4 |
| **6** | Trust Layer Impact | ⏸ Очередь | Этап 5 |
| **7** | Migration Strategy | 🔵 **Параллельно** с 1–2 | Этап 1 (schema design) |
| **8** | Production Rollout | ⏸ Очередь | Этапы 3–7 |

---

## Подготовка — выполнено ✅

Документация, mock и планирование (бывшие «фазы 0–1» очереди).

- [x] `docs/COMMUNITY_IDENTITY_V1.md` — канон (ACCEPT)
- [x] `docs/COMMUNITY_ARCHITECTURE_V1.md` — Profile, History, Observation Thread
- [x] Superseded banners: `EVrace_COMMUNITY_IDENTITY_PRINCIPLE.md`, `STAGE-3-IDENTITY-AND-CONSENT.md`
- [x] `context.md`, `.cursorrules` — ссылки на ACCEPT
- [x] `docs/COMMUNITY_IDENTITY_IMPLEMENTATION_PLAN.md` — 8 этапов, блокеры, BY residency
- [x] `docs/IDENTITY_FOUNDATION_IMPLEMENTATION_SPEC.md` — этап 1, READY FOR IMPLEMENTATION
- [x] Mock Entry: `mock/evr-id.html` → `mock/welcome.html` → `mock/contribution.html`
- [x] Mock Profile: `mock/contribution.html` (Identity 1.45fr/1fr, copy toast, Активный/Новый)
- [x] Mock History: `mock/history.html` (фильтры `?filter=`)
- [x] `CSS/community-profile.css?v=4` — UX-audit: map CTA, KPI time, compact stats
- [x] Аудиты: `_local/audits/` (локально, не в GitHub)

**Entry UX зафиксирован в mock** — отдельный `COMMUNITY_IDENTITY_ENTRY_PHILOSOPHY.md` не создан; визуальный и flow-референс = mock (см. PLAN этап 3).

---

## Этап 1 — Identity Foundation ⏸

**PLAN § Этап 1** · **Spec:** `docs/IDENTITY_FOUNDATION_IMPLEMENTATION_SPEC.md` (READY) · BY PostgreSQL · без UI

### Спека покрывает

- [x] Сущности: `community_identities`, `community_identity_profile`, `community_identity_telegram`
- [x] EVR ID: формат, генерация, collision, retire policy
- [x] `user_hash`: random at create, V1 (`COMMUNITY_IDENTITY_USER_HASH_DECISION.md`; salt-модель отменена)
- [x] Lifecycle + DELETE_IDENTITY (identity tables)
- [x] RLS модель + API contracts (для этапа 2)
- [x] Ограничения + критерии готовности

### Чеклист реализации

- [x] `infra/by-migrations/007_community_identity.sql`
- [x] Таблицы: `community_identities`, `community_identity_telegram`, `community_identity_profile`
- [x] EVR ID generator (`community_generate_evr_id`, `community_generate_unique_evr_id`)
- [x] RLS: service_role only, нет публичного SELECT
- [x] Soft-delete (`deleted_at`) + telegram `unlinked_at`
- [x] Verify script: `infra/scripts/verify-community-identity-phase1.sql`
- [x] Apply script: `infra/scripts/apply-community-identity-phase1.sh`
- [x] Random `user_hash` model: `009_user_hash_random.sql` (`COMMUNITY_IDENTITY_USER_HASH_DECISION.md`)
- [x] Применено на `api.evrace.by` (2026-06-19, smoke PASS)

### Блокеры этапа

Нет — BY schema пустая, infra готова.

---

## Этап 2 — Identity API 🔄 V1 user_hash correction

**PLAN § Этап 2** · **Spec:** `IDENTITY_API_IMPLEMENTATION_SPEC.md` v1.2 · **Decision:** `COMMUNITY_IDENTITY_USER_HASH_DECISION.md`

### Исправление (2026-06-20)

- [x] Отменён `USER_HASH_SALT` / `computeUserHash`
- [x] `009_user_hash_random.sql` — random hash at create, Guest sessions
- [x] Edge Functions переписаны (telegram lookup, не salt)
- [x] Specs: FOUNDATION v1.1, API v1.2, PLAN, QUEUE
- [x] `009` applied + functions redeployed на BY (20.06.2026) — HTTP smoke: me 401, auth 401 (не 500)
- [x] `TELEGRAM_AUTH_BOT_TOKEN` в docker env (из `telegram.env`, BOM fix)

### Чеклист (после fix)

- [x] 4 Edge Functions в `infra/by-functions/`
- [x] `verify-community-identity-phase2.sql` (V1 model)
- [x] `apply-community-identity-phase2.sh` (008+009)
- [ ] HTTP smoke полный flow (create → me → profile) — нужен signed TG fixture
- [ ] Этап 3 — ждёт **ДЕЛАЙ** (repo + BY runtime готовы; prod frontend не трогать без команды)

### Блокеры

- [ ] `TELEGRAM_AUTH_BOT_TOKEN` в edge runtime env
- Этап 1 ✅

---

## Этап 3 — Frontend Integration ✅

**PLAN § Этап 3** · mock → prod · **20.06.2026**

### URL (зафиксировано)

| Маршрут | Mock | Prod |
|---------|------|------|
| `/evr-id` | `mock/evr-id.html` | ✅ `evr-id.html` |
| `/welcome` | `mock/welcome.html` | ✅ `welcome.html` |
| `/my` | `mock/contribution.html` | ✅ `my.html` |
| `/history` | `mock/history.html` | ✅ `history.html` |

### Чеклист

- [x] Prod HTML/routes (`evr-id.html`, `welcome.html`, `my.html`, `history.html` + `_redirects`)
- [x] Подключение `community-profile.css` + prod chrome
- [x] Guest → `/evr-id`; Verified → `/my` (nav `data-nav-contribution`)
- [x] Telegram widget → BY `telegram-auth` → `community-identity-create` → welcome
- [x] Profile/History read API — empty state (этап 4 projection позже)
- [x] Guest redirect с `/my`, `/history` → `/evr-id`
- [x] Trust footer links на Community pages
- [x] `JS/community-auth.js` → `api.evrace.by` (`identityApiUrl`)
- [x] `JS/community-chrome.js`, `JS/community-profile.js`
- [ ] Mobile-first QA на prod host (после deploy)
- [ ] HTTP smoke полный flow с signed TG fixture

### Блокеры этапа

- Этап 2 не завершён
- **B5**: глобальный nav «МОЙ ВКЛАД» — отдельный **ДЕЛАЙ** (волна W7)

---

## Этап 4 — UGC Integration ⏸

**PLAN § Этап 4** · Ratings, Reviews, Photos, Signals на BY

### Чеклист

- [ ] `observation_threads` + `observation_entries`
- [ ] `ratings` (отдельно от reviews; UNIQUE identity×location; cooldown 24h)
- [ ] `reviews` на BY (текст; не влияет на рейтинг)
- [ ] Photos Type B upload end-to-end (Phase 4D/4E)
- [ ] `photos.review_id` → BY `reviews.id` (не cloud)
- [ ] Signals — anonymous, без identity_id
- [ ] Pending Contribution §16–§17 (guest-initiated → always anonymous)
- [ ] Guest gate: ratings/reviews → `/evr-id`; signals/photos — без blocking modal

### Блокеры этапа

- **B1** Split backend (cloud UGC vs BY photos)
- **B2** Legacy `reviews` = rating + comment в одной таблице
- **B3** Cross-DB `photos.review_id`
- **B4** Type B upload + review form на location page не завершены
- Этап 7 cutover plan не утверждён

---

## Этап 5 — Moderation Impact ⏸

**PLAN § Этап 5**

### Чеклист

- [ ] DELETE_IDENTITY runbook + dry-run staging
- [ ] Ratings → обезличивание (агрегат локации не меняется)
- [ ] Review text delete; review photos delete (storage + DB)
- [ ] Signals не затрагиваются
- [ ] Type A anonymous photos не затрагиваются DELETE_IDENTITY
- [ ] Moderator Telegram flows документированы
- [ ] Инвариант №5 проверен

---

## Этап 6 — Trust Layer Impact ⏸

**PLAN § Этап 6** · copy, не архитектура

### Чеклист

- [ ] `/how-data-works` — BY residency, роль Telegram
- [ ] `/community-rules` — Guest/Verified, нет соцсети
- [ ] `/privacy` — DELETE_IDENTITY, право на забвение
- [ ] Контент согласован с V1 §18 и таблицей этапа 5
- [ ] Footer «Доверие» на всех Community pages

**As-is:** spec APPROVED; `functions/how-data-works.js` и `content/trust/` есть — контент под Identity lifecycle **не обновлён**.

---

## Этап 7 — Migration Strategy 🔵

**PLAN § Этап 7** · можно готовить параллельно с этапами 1–2

### Чеклист

- [ ] Migration runbook draft (freeze cloud writes → ETL → cutover → rollback)
- [ ] ETL design: cloud `reviews` → BY `ratings` + `reviews` split
- [ ] `users` → `community_identities` backfill strategy
- [ ] `photos.review_id` repoint plan
- [ ] `community-auth.js` → `api.evrace.by` switch plan
- [ ] Count parity checklist
- [ ] Утверждение автора перед W3 (PLAN этап 8)

### Блокеры снятия B1–B3

Завершение этапа 7 + этапы 1, 4.1–4.3 deployed.

---

## Этап 8 — Production Rollout ⏸

**PLAN § Этап 8** · волны W0–W7

| Волна | Содержание | Статус |
|-------|------------|--------|
| W0 | Этапы 1–2 staging + smoke | ⏸ |
| W1 | `/evr-id`, `/welcome` + BY auth | ⏸ |
| W2 | `/my`, `/history` read-only | ⏸ |
| W3 | Migration cutover (этап 7) | ⏸ |
| W4 | Ratings/Reviews write BY | ⏸ |
| W5 | Photos Type B + Pending | ⏸ |
| W6 | DELETE_IDENTITY + Trust copy | ⏸ |
| W7 | Nav «МОЙ ВКЛАД» global chrome | ⏸ **ДЕЛАЙ** |

### Feature flags (запланировать)

- `COMMUNITY_IDENTITY_ENABLED`
- `UGC_WRITES_BY_ONLY`

---

## Активные блокеры (из PLAN)

| ID | Блокер | Блокирует | Снятие |
|----|--------|-----------|--------|
| **B1** | Split backend: cloud `reviews`/`telegram-auth` vs BY photos | Этапы 2 (cutover), 4 | Этапы 2 + 7 |
| **B2** | Legacy schema: rating+text в одной `reviews` | Этап 4 | Этап 7 ETL + BY tables |
| **B3** | `photos.review_id` → cloud id | Этап 4.3–4.4 | Этап 7 cutover |
| **B4** | Type B upload + review form не завершены | Этап 4.4 | Photos 4D/4E workstream |
| **B5** | Entry prod nav/chrome без **ДЕЛАЙ** | Этап 3 W7, global nav | Автор: **ДЕЛАЙ** |

---

## Рекомендуемый порядок (синхронно с PLAN)

1. **Этап 1** → **Этап 2** (Identity на BY)
2. **Этап 7** draft — параллельно с 1–2
3. **Этап 3** — после API smoke; до UGC writes
4. **Этап 4** — после утверждения cutover (B1–B3)
5. **Этапы 5–6** — с DELETE_IDENTITY go-live
6. **Этап 8** — W0→W7

---

## Явные запреты

- ❌ Переоткрывать EVR ID / Telegram / Guest-Verified / Profile / Trust модель
- ❌ Новые сущности вне PLAN и V1
- ❌ Правки `index.html`, prod nav, `site-chrome.js` без **ДЕЛАЙ**
- ❌ Blocking modals перед Signals / anonymous Photos
- ❌ Guest → Verified merge
- ❌ Community Layer PII вне BY VPS
- ❌ Коммит `_local/audits/` в GitHub

---

## Маппинг: старая очередь → PLAN

| Бывшая «фаза» QUEUE | Куда перешла |
|---------------------|--------------|
| 0. Документация ACCEPT | Подготовка ✅ |
| 1. Философия Entry | Подготовка ✅ (mock = референс) |
| 2. Entry реализация | Этап 3 (+ этапы 1–2 backend) |
| 3. Identity backend | Этапы 1–2 |
| 4. Profile/History prod | Этап 3 |
| 5. Pending + Guest | Этап 4.6 |
| 6. UGC-стыки | Этапы 4, 5, 7 |

---

## Следующий шаг

**Этап 1:** ✅ deployed BY (007).  
**Этап 2:** 🔄 V1 user_hash fix — deploy `009` + redeploy functions → smoke PASS. **Этап 3 не начинать.**
