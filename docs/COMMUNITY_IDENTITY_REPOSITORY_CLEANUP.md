# Community Identity — Repository Cleanup (post random `user_hash`)

**Дата:** 2026-06-20  
**Контекст:** BY runtime очищен; приведение репозитория в консистентное состояние перед Этапом 3.  
**Production:** не менялся.  
**Удалений:** нет.

**Связано:** `docs/COMMUNITY_IDENTITY_LEGACY_CLEANUP_AUDIT.md`, `docs/COMMUNITY_IDENTITY_USER_HASH_DECISION.md`

---

## Выполнено

| # | Действие | Файлы |
|---|----------|-------|
| 1 | Баннер **SUPERSEDED** на всех STAGE-3 docs | `docs/STAGE-3-*.md` (8 файлов) |
| 2 | QUEUE L89 → random V1 | `docs/COMMUNITY_IDENTITY_IMPLEMENTATION_QUEUE.md` |
| 3 | FOUNDATION §6 Lifecycle | `docs/IDENTITY_FOUNDATION_IMPLEMENTATION_SPEC.md` |
| 4 | Deploy hint без `USER_HASH_SALT` | `infra/scripts/deploy-community-identity-functions.sh` |
| 5 | CHANGELOG Stage 2 запись | `infra/CHANGELOG.md` |
| 6 | Stale markers 007/008 | `infra/by-migrations/007_*.sql`, `008_*.sql` |
| 7 | DEPRECATED headers | `vps-debug-deploy.sh`, `vps-test-token.sh`, `vps-stage2-remote.sh` |

---

## 1. Оставить (активные / нормативные)

### Норматив V1 (BY Community Identity)

| Файл | Роль |
|------|------|
| `docs/COMMUNITY_IDENTITY_V1.md` | Канон BY Identity |
| `docs/COMMUNITY_IDENTITY_USER_HASH_DECISION.md` | ACCEPT: random `user_hash` |
| `docs/IDENTITY_FOUNDATION_IMPLEMENTATION_SPEC.md` | Foundation spec (Lifecycle исправлен) |
| `docs/IDENTITY_API_IMPLEMENTATION_SPEC.md` | API spec этап 2 |
| `docs/COMMUNITY_IDENTITY_IMPLEMENTATION_PLAN.md` | Roadmap 8 этапов |
| `docs/COMMUNITY_IDENTITY_IMPLEMENTATION_QUEUE.md` | Очередь (QUEUE L89 исправлен) |
| `docs/COMMUNITY_IDENTITY_LEGACY_CLEANUP_AUDIT.md` | Аудит salt→random |
| `docs/COMMUNITY_IDENTITY_REPOSITORY_CLEANUP.md` | Этот документ |
| `docs/COMMUNITY_ARCHITECTURE_V1.md` | Community Layer архитектура |
| `docs/EVRACE_SIMPLICITY_PRINCIPLE.md` | Сквозной принцип |

### BY runtime (репо = prod, без изменений prod)

| Файл | Роль |
|------|------|
| `infra/by-migrations/007_community_identity.sql` | Stage 1 (stale comment помечен; chain → 009) |
| `infra/by-migrations/008_user_sessions.sql` | Stage 2 (stale RPC помечен; chain → 009) |
| `infra/by-migrations/009_user_hash_random.sql` | V1 correction — **источник истины** для `user_hash` |
| `infra/by-functions/**` | Identity Edge Functions (без salt) |
| `infra/identity.env.example` | `TELEGRAM_AUTH_BOT_TOKEN` only |
| `infra/scripts/apply-community-identity-phase1.sh` | Deploy этап 1 |
| `infra/scripts/apply-community-identity-phase2.sh` | Deploy 008+009+functions |
| `infra/scripts/deploy-community-identity-functions.sh` | Functions-only redeploy |
| `infra/scripts/verify-community-identity-phase1.sql` | Smoke SQL |
| `infra/scripts/verify-community-identity-phase2.sql` | Smoke SQL |
| `infra/scripts/vps-legacy-audit.sh` | Read-only prod audit |
| `infra/scripts/vps-finish-v1-deploy.sh` | Ops (вкл. `remove USER_HASH_SALT`) |
| `infra/scripts/vps-deploy-functions-only.sh` | Ops redeploy |
| `infra/CHANGELOG.md` | История infra |

### Cloud runtime (активен до cutover этап 7)

| Файл | Роль |
|------|------|
| `supabase/functions/telegram-auth/` | Cloud auth (salt `user_hash`) — reviews prod |
| `supabase/functions/_shared/telegram.ts` | `computeUserHash` — cloud only |
| `supabase/functions/submit-review/` | Cloud reviews |
| `supabase/migrations/006–012` | Cloud Stage 3 schema |
| `JS/community-auth.js` | Frontend → cloud `telegram-auth` (этап 3 cutover) |

### Mock / UI reference (этап 3)

| Файл | Роль |
|------|------|
| `mock/evr-id.html`, `welcome.html`, `contribution.html`, `history.html` | Production mock v1 |
| `CSS/community-profile.css` | Mock styles |

---

## 2. Deprecated (оставить в репо, не использовать как норматив)

### Документы STAGE-3 (помечены SUPERSEDED)

| Файл | Причина |
|------|---------|
| `docs/STAGE-3-ARCHITECTURE.md` | Cloud Phase 3.0 freeze |
| `docs/STAGE-3-IDENTITY-AND-CONSENT.md` | Salt identity model |
| `docs/STAGE-3-PHASE-3.0-SIGNOFF.md` | Cloud deploy contracts |
| `docs/STAGE-3-PHASE-3.0-REVIEW-BRIEF.md` | Cloud foundation brief |
| `docs/STAGE-3-REVIEW-BRIEF.md` | External review brief |
| `docs/STAGE-3-FINAL-REVIEW-RESPONSES.md` | Review responses |
| `docs/STAGE-3-UX-WIREFRAMES.md` | UX (copy/wireframes — справочно для UI) |
| `docs/STAGE-3-COPYWRITING.md` | Copy (справочно для UI) |

### Другие superseded / obsolete docs

| Файл | Причина |
|------|---------|
| `docs/EVrace_COMMUNITY_IDENTITY_PRINCIPLE.md` | SUPERSEDED → V1 |
| `docs/EVrace_TELEGRAM_IDENTITY_AUDIT.md` | Pre-V1 audit; salt на BY |
| `docs/REVIEWS-SYSTEM-DESIGN.md` | Cloud reviews + salt auth |
| `docs/IMPLEMENTATION_SPEC.md` | Master Stage 3 spec |
| `docs/COMMUNITY-CONSENT-LAYER.md` | Consent programs (частично salt refs) |

### Stale migration content (файлы активны, фрагменты deprecated)

| Файл | Stale фрагмент |
|------|----------------|
| `infra/by-migrations/007_community_identity.sql` | COMMENT `user_hash` (L~88) — salt text |
| `infra/by-migrations/008_user_sessions.sql` | RPC `create_full(text,…)`, `user_hash NOT NULL` |

> На production всё заменено `009`. Re-apply: только цепочка 007→008→009.

### Ops-скрипты (DEPRECATED header)

| Файл | Причина |
|------|---------|
| `infra/scripts/vps-debug-deploy.sh` | One-off debug |
| `infra/scripts/vps-test-token.sh` | One-off debug |
| `infra/scripts/vps-stage2-remote.sh` | Pre-009 bundle |

---

## 3. Архивировать позже (не удалять сейчас)

| Файл / группа | Когда / зачем |
|---------------|---------------|
| `docs/STAGE-3-*.md` (все 8) | После этапа 7 cutover cloud → `docs/archive/stage-3-cloud/` |
| `docs/EVrace_TELEGRAM_IDENTITY_AUDIT.md` | После закрытия cloud identity path |
| `docs/REVIEWS-SYSTEM-DESIGN.md`, `IMPLEMENTATION_SPEC.md` | После миграции reviews на BY |
| `infra/scripts/vps-debug-deploy.sh` | После стабилизации deploy runbook |
| `infra/scripts/vps-test-token.sh` | То же |
| `infra/scripts/vps-stage2-remote.sh` | То же |
| `supabase/functions/telegram-auth/` + `computeUserHash` | Этап 7 — после cutover `community-auth.js` на BY |
| `JS/community-auth.js` (cloud URL) | Заменить на этапе 3, архивировать cloud-версию после cutover |

### Schema legacy (BY, не архивировать до этапа 4+)

| Поле | Таблица | План |
|------|---------|------|
| `telegram_user_id` | `photos` | Deprecate при UGC attribution (этап 4) |
| `author_type = 'telegram'` | `photos` CHECK | Убрать enum value при schema migration |
| `review_id` | `photos` | После BY reviews или окончательного отказа |

---

## 4. Согласованность после cleanup

| Область | Статус |
|---------|--------|
| BY runtime | ✅ Очищен (без изменений в этом батче) |
| BY repo (`infra/by-functions`, specs) | ✅ Консистентен с V1 |
| STAGE-3 docs | ✅ SUPERSEDED banners |
| QUEUE / FOUNDATION | ✅ Противоречия сняты |
| Migrations 007/008 | ✅ Stale помечен; 009 — источник истины |
| Cloud coexistence | ⚠ Осознанный долг до этапа 7 |

**Этап 3:** разблокирован по repo hygiene; старт кода — только по **ДЕЛАЙ** (frontend cutover `community-auth.js` → BY API).
