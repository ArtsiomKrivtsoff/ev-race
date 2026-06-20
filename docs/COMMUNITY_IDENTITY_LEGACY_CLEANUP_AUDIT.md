# Community Identity — Legacy Cleanup Audit

**Дата:** 2026-06-20  
**Контекст:** после исправления модели `user_hash` (salt-derived → random persistent)  
**Норматив:** `docs/COMMUNITY_IDENTITY_USER_HASH_DECISION.md`  
**Цель:** аудит перед Этапом 3. **Только перечисление — ничего не удалять.**

---

## Краткое резюме

| Область | Статус |
|---------|--------|
| BY production (`api.evrace.by`) | Salt-derived модель **снята** |
| BY Identity API (`infra/by-functions/`) | **Чисто** — нет `USER_HASH_SALT` / `computeUserHash` |
| Cloud Supabase (`supabase/functions/telegram-auth`) | Salt-модель **ещё активна** (reviews prod) |
| Репозиторий | Stale migration files, doc-строки, deploy-hints |
| Frontend prod | `JS/community-auth.js` → cloud `telegram-auth` |

---

## 1. Совпадения в репозитории

### 1.1 `USER_HASH_SALT`

| Файл | Используется / мёртвое |
|------|------------------------|
| `supabase/functions/telegram-auth/index.ts` | **Активный runtime (cloud)** — `Deno.env.get("USER_HASH_SALT")` |
| `supabase/migrations/README.md` | Документация Stage 3 (cloud deploy) |
| `docs/STAGE-3-IDENTITY-AND-CONSENT.md` | Исторический doc (superseded V1, не помечен явно) |
| `docs/STAGE-3-PHASE-3.0-SIGNOFF.md` | Исторический doc |
| `docs/STAGE-3-PHASE-3.0-REVIEW-BRIEF.md` | Исторический doc |
| `docs/EVrace_TELEGRAM_IDENTITY_AUDIT.md` | Аудит июнь 2026 (до V1 fix) |
| `docs/REVIEWS-SYSTEM-DESIGN.md` | Дизайн reviews (cloud) |
| `docs/IMPLEMENTATION_SPEC.md` | Master spec Stage 3 |
| `docs/COMMUNITY-CONSENT-LAYER.md` §510 | Упоминание rotation policy |
| `docs/EVrace_Community_Signals_v1_IMPLEMENTATION_PLAN.md` | Аналогия с `VOTER_KEY_SALT` (не Identity) |
| `docs/COMMUNITY_IDENTITY_USER_HASH_DECISION.md` | **Нормативный** — описание отменённой модели |
| `docs/IDENTITY_*`, `QUEUE`, `CHANGELOG` | Фиксация отмены / история |
| `infra/scripts/apply-community-identity-phase2.sh` | **Активный** — `remove_env_key USER_HASH_SALT` (cleanup deploy) |
| `infra/scripts/vps-finish-v1-deploy.sh` | Ops-скрипт deploy |
| `infra/scripts/vps-deploy-functions-only.sh` | Ops-скрипт |
| `infra/scripts/vps-legacy-audit.sh` | Read-only audit |
| `infra/scripts/deploy-community-identity-functions.sh` | **Устаревший текст** в `echo` (не runtime) |
| `infra/identity.env.example` | Комментарий «no USER_HASH_SALT» |

**BY Identity API (`infra/by-functions/`):** совпадений **нет**.

---

### 1.2 `computeUserHash`

| Файл | Используется / мёртвое |
|------|------------------------|
| `supabase/functions/_shared/telegram.ts` | **Активный runtime (cloud)** — экспорт функции |
| `supabase/functions/telegram-auth/index.ts` | **Активный runtime (cloud)** — вызов при auth |
| `docs/STAGE-3-*`, `EVrace_TELEGRAM_IDENTITY_AUDIT.md`, `REVIEW-BRIEF` | Историческая документация |
| `docs/IDENTITY_FOUNDATION_*`, `USER_HASH_DECISION`, `QUEUE`, `CHANGELOG` | Упоминание отмены |

**BY `infra/by-functions/`:** **нет** (удалено).

---

### 1.3 `SHA256(telegram_id + ...)` / derived `user_hash`

| Файл | Используется / мёртвое |
|------|------------------------|
| `supabase/functions/_shared/telegram.ts` | **Активный** — `sha256Bytes(\`${telegramId}:${salt}\`)` |
| `infra/by-migrations/007_community_identity.sql` L82 | **Устаревший COMMENT** в файле миграции (на BY prod перезаписан `009`) |
| `infra/by-migrations/008_user_sessions.sql` | **Устаревший RPC** `create_full(p_user_hash, …)` в файле; на prod заменён `009` |
| `infra/by-migrations/009_user_hash_random.sql` | Комментарий «NOT SHA256…» (нормативный) |
| `docs/STAGE-3-*`, `TELEGRAM_IDENTITY_AUDIT`, `IMPLEMENTATION_SPEC`, `REVIEW-BRIEF` | Исторические |
| `docs/COMMUNITY_IDENTITY_USER_HASH_DECISION.md` | Описание старой модели |

---

### 1.4 Комментарии про salt-модель

| Файл | Статус |
|------|--------|
| `infra/by-migrations/007` COMMENT | Устарел в репо |
| `infra/scripts/deploy-community-identity-functions.sh` L39 | Устаревший deploy-hint |
| `infra/CHANGELOG.md` L74 (старая строка Stage 2) | Историческая запись |
| `JS/community-auth.js` L140 | **Активный UI copy** prod: «только анонимный hash» |
| `docs/EVrace_COMMUNITY_IDENTITY_PRINCIPLE.md` | **SUPERSEDED**, но текст salt-модели сохранён |
| `docs/COMMUNITY_IDENTITY_IMPLEMENTATION_QUEUE.md` L89 | **Противоречие:** «`user_hash`: формула Stage 3 (LOCKED)» при уже принятом random |

---

## 2. BY production — salt-derived артефакты

Проверено на `api.evrace.by` (2026-06-20, скрипт `infra/scripts/vps-legacy-audit.sh`).

### 2.1 SQL-функции / RPC

| Объект | Статус |
|--------|--------|
| `community_identity_create_full(bigint, text)` | **V1** — random hash внутри |
| `community_generate_user_hash()` | **V1** — `gen_random_bytes` |
| `community_identity_create_full(text, bigint, text)` | **Отсутствует** (salt-era снята) |
| `community_identity_delete_by_user_hash(text)` | **Активна** — параметр `p_user_hash` это random hash, не salt-derived |

### 2.2 Триггеры

| Триггер | Таблица | Salt-related? |
|---------|---------|---------------|
| `community_identity_profile_set_updated_at_trg` | `community_identity_profile` | **Нет** |

Salt-specific триггеров **нет**.

### 2.3 Индексы / constraints

Все индексы на `user_hash` / `telegram_user_id` — **нейтральны** (работают с random hash):

- `idx_community_identities_user_hash_active` (partial UNIQUE)
- `idx_user_sessions_user_hash`
- `idx_user_sessions_telegram_user_id`
- `idx_community_identity_telegram_active` (partial UNIQUE на `telegram_user_id`)

Salt-specific индексов/constraints **нет**.

### 2.4 Комментарии колонок (prod)

- `community_identities.user_hash` → **V1:** «Random internal key… NOT SHA256(telegram_id:salt)»

### 2.5 Docker env

- `USER_HASH_SALT` — **отсутствует**
- `TELEGRAM_AUTH_BOT_TOKEN` — **есть**

**Вывод по §2:** на BY production salt-derived SQL/RPC **не осталось**. Остались только нейтральные объекты, работающие с random `user_hash`.

**Repository cleanup (20.06.2026):** выполнен — см. `docs/COMMUNITY_IDENTITY_REPOSITORY_CLEANUP.md`.

---

## 3. Legacy-поля в БД (не salt, но не используются / Stage 3)

> Не удалять. Только перечислить.

### 3.1 BY PostgreSQL

| Таблица | Поле | Nullable | Использование сейчас |
|---------|------|----------|----------------------|
| `photos` | `telegram_user_id` | YES | Upload пишет `null`; Identity не ссылается |
| `photos` | `author_type` значение `'telegram'` | — | В CHECK есть, код пишет `'anonymous'` |
| `photos` | `review_id` | YES | Type B / cloud cross-ref; BY reviews нет |
| `photos` | `fingerprint` | NO | **Активно** (Photos v1.2) |
| `photos` | `location_id` | NO | **Активно** (cloud ref без FK) |
| `user_sessions` | `user_hash` nullable | YES | **Активно V1** (Guest=NULL, Verified=set) — не legacy |
| `user_sessions` | `telegram_user_id` | NO | **Активно V1** — не legacy |
| `community_identity_telegram` | `telegram_user_id` | NO | **Активно V1** — uniqueness anchor |

### 3.2 Cloud Supabase (не на BY, но в репо)

| Таблица | Поля Stage 3 | Статус |
|---------|--------------|--------|
| `users` | `user_hash` (salt-derived в runtime) | Cloud-only; `006_stage3_users.sql` |
| `reviews` | `user_hash` FK → `users` | Cloud-only |
| `photos` (cloud) | `user_hash`, counters | Cloud migrations 009–011 |
| `user_activity` | activity counters | Cloud-only |

### 3.3 Enum / schema drift

- `photos.author_type IN ('anonymous', 'telegram')` — значение `'telegram'` в схеме BY, **не используется** в upload pipeline.

---

## 4. Мёртвый / неучаствующий в runtime код (после random `user_hash`)

### 4.1 Не участвует в BY Identity runtime

| Артефакт | Причина |
|----------|---------|
| `infra/by-migrations/008` RPC `create_full(p_user_hash, …)` | Перезаписан `009` на prod; в файле остался stale |
| `infra/by-migrations/007` COMMENT на `user_hash` | Stale в репо; prod обновлён |
| `infra/scripts/deploy-community-identity-functions.sh` | Устаревшее сообщение про `USER_HASH_SALT` |
| `infra/scripts/vps-debug-deploy.sh` | One-off debug, не в deploy path |
| `infra/scripts/vps-test-token.sh` | One-off debug |
| `infra/scripts/vps-stage2-remote.sh` | Промежуточный deploy (superseded) |

### 4.2 Всё ещё активный runtime (не BY Identity)

| Артефакт | Где живёт |
|----------|-----------|
| `supabase/functions/telegram-auth/` + `computeUserHash` | **Cloud prod** — evrace.by reviews/auth |
| `supabase/functions/submit-review/` | Cloud — `users` table |
| `JS/community-auth.js` | **Prod frontend** — cloud `telegram-auth`, session `user_hash` из cloud |

### 4.3 Активен в BY V1 (не мёртвый)

| Артефакт | Роль |
|----------|------|
| `getActiveIdentityByUserHash()` | Resolve Verified session по `user_hash` |
| `community_identity_delete_by_user_hash()` | DELETE по random hash |
| `getActiveIdentityByTelegramId()` | Lookup + Guest flow |

---

## 5. Документы, противоречащие новой модели

| Файл | Раздел / строки | Причина |
|------|-----------------|---------|
| `docs/STAGE-3-IDENTITY-AND-CONSENT.md` | §формула `SHA256(telegram_id:USER_HASH_SALT)` | Salt-модель; superseded V1, баннер слабый |
| `docs/STAGE-3-PHASE-3.0-SIGNOFF.md` | Secrets / smoke | Требует `USER_HASH_SALT` |
| `docs/STAGE-3-PHASE-3.0-REVIEW-BRIEF.md` | users, telegram-auth flow | Salt-derived `user_hash` |
| `docs/EVrace_TELEGRAM_IDENTITY_AUDIT.md` | весь документ | Архитектура до V1 fix; рекомендует salt на BY |
| `docs/REVIEWS-SYSTEM-DESIGN.md` | auth flow | `sha256(id + USER_HASH_SALT)` |
| `docs/IMPLEMENTATION_SPEC.md` | Stage 3 identity | Salt в ENV и flow |
| `docs/EVrace_COMMUNITY_IDENTITY_PRINCIPLE.md` | §Модель идентичности | HASH+SALT; помечен SUPERSEDED, текст не обновлён |
| `docs/IDENTITY_FOUNDATION_IMPLEMENTATION_SPEC.md` | §6 Lifecycle | «Вычислить user_hash»; Guest session «с user_hash» — устарело |
| `docs/COMMUNITY_IDENTITY_IMPLEMENTATION_QUEUE.md` | Этап 1 spec L89 | «формула Stage 3 (LOCKED)» vs random `009` |
| `docs/IDENTITY_API_IMPLEMENTATION_SPEC.md` | §3 «port Stage 3.1 C-2» | Формулировка legacy-port (содержание в целом V1) |
| `supabase/migrations/README.md` | Secrets list | `USER_HASH_SALT` для cloud |
| `infra/CHANGELOG.md` | Stage 2 запись | Упоминание `USER_HASH_SALT` в identity.env.example |

**Согласованы с V1:** `COMMUNITY_IDENTITY_V1.md`, `COMMUNITY_IDENTITY_USER_HASH_DECISION.md`, обновлённые §5 FOUNDATION/API, PLAN (в основном).

---

## 6. Финальный вывод: технический долг до Этапа 3

### 6.1 Желательно убрать / исправить (repo hygiene)

1. **Миграции `007`/`008`** — устаревшие COMMENT и salt-era RPC в файлах (риск при re-apply на чистой БД).
2. **`QUEUE` L89** — противоречащая галочка «формула Stage 3».
3. **`FOUNDATION` §6 Lifecycle** — Guest session и «вычислить user_hash».
4. **Deploy-скрипты** — устаревшие `echo` про `USER_HASH_SALT`.
5. **One-off `vps-debug-*` / `vps-stage2-remote`** — архивировать или пометить deprecated.

### 6.2 Осознанный долг (не блокер cleanup, но блокер cutover)

6. **Cloud `telegram-auth` + `computeUserHash`** — активный prod для reviews; salt-модель живёт до этапа 7 / cutover.
7. **`JS/community-auth.js`** — cloud URL, ожидает `user_hash` в session, UI copy «анонимный hash»; этап 3 должен переключить на BY API.
8. **`photos.telegram_user_id`** + `author_type='telegram'` — schema legacy; не salt, но мусор для Identity V1.
9. **Stage 3 docs** (`STAGE-3-*`, `TELEGRAM_IDENTITY_AUDIT`) — без явного «SUPERSEDED for BY Identity» ведут в заблуждение.
10. **Cloud `users`/`reviews.user_hash`** — ETL этап 7: salt-hash ≠ BY random-hash.

### 6.3 Не является долгом

- `community_identity_telegram.telegram_user_id` — **нормативный** anchor uniqueness V1.
- `user_sessions.telegram_user_id` — **нормативный** Guest session.
- `getActiveIdentityByUserHash` / `delete_by_user_hash` — работают с random hash.

---

## Итог

**BY production очищен от salt-derived модели.** Технический долг сосредоточен в **репозитории** (stale migration files, несколько doc-строк, cloud/frontend legacy) и **не в BY runtime**. Перед Этапом 3 критично спланировать cutover `community-auth.js` и пометить/синхронизировать Stage 3 docs; полная зачистка salt возможна только после отключения cloud `telegram-auth`.

---

## Связанные документы

| Документ | Роль |
|----------|------|
| `docs/COMMUNITY_IDENTITY_USER_HASH_DECISION.md` | ACCEPT decision — random `user_hash` |
| `docs/COMMUNITY_IDENTITY_V1.md` | Норматив V1 |
| `infra/by-migrations/009_user_hash_random.sql` | Миграция исправления |
| `docs/COMMUNITY_IDENTITY_IMPLEMENTATION_QUEUE.md` | Этап 3 blocked до ДЕЛАЙ |
| `infra/scripts/vps-legacy-audit.sh` | Скрипт проверки BY prod |
