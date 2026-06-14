# EV RACE 2026 — context.md
# Правило: перед любым изменением прочитай этот файл. После изменения — **обязательно обнови его**.

---

## VPS Infrastructure v3.1 FINAL — ЗАВЕРШЁН ✅ (12.06.2026)

**Статус:** принято заказчиком. **Infrastructure Layer production-ready.** Следующий этап (UGC, схема, поллер) — **отдельный проект**, не смешивать с infra.

**ТЗ:** `docs/EVrace — TZ VPS Infrastructure v3.1 FINAL.md`. ТЗ v1 и v2 **аннулированы**.  
**Handoff:** `infra/HANDOFF-v3.1-COMPLETE.md` · журнал `infra/CHANGELOG.md` · на VPS `/opt/CHANGELOG.md`

### Сервер
- cloudvps.by · `evrace` · `193.47.42.183` · 4 GB · Ubuntu 24.04
- SSH: `deploy@193.47.42.183` (ключ only)
- API: `https://api.evrace.by` (Cloudflare Proxied, Full strict)
- **Не трогали:** облачный Supabase, сайт evrace.by, фронт

### Что сделано (этапы 1–5)
1. **Hardening:** UFW, fail2ban, swap, Docker, Caddy, log rotation, `deploy`
2. **Supabase:** `/opt/supabase/docker`, новые секреты, public **0 таблиц**, Studio только SSH-туннель (`infra/Open-Studio.bat`)
3. **Cloudflare:** DNS `api` → VPS
4. **Backup:** cron 03:30 Minsk → `/opt/backups` (14d) + R2 `evrace-backups/db/` (30d), restore test OK, Telegram (бот писем операторам)
5. **Сдача:** runbooks на `/opt/`, UptimeRobot (401=up), KeePass секреты

### Секреты (KeePass + `/root/evrace-secrets/`)
`supabase.env`, `r2.env`, `telegram.env` — не в git

### Проверка API (PS 5.1)
`curl.exe -s -o NUL -w "%{http_code}" https://api.evrace.by/rest/v1/` → **401 OK**

### Боты Telegram (не смешивать)
- auth bot — только вход на сайте
- **бот писем операторам** — модерация + **алерты VPS**
- weekly letters bot — ИИ письма, отдельно

---

## Trust Layer v1 (10.06.2026)

**Спека:** `docs/TRUST_LAYER_IMPLEMENTATION_SPEC.md`

**Community Identity (LOCKED):** `docs/EVrace_COMMUNITY_IDENTITY_PRINCIPLE.md` — Telegram только для уникальности; публичная сущность = `user_hash`; UGC/community data на BY-инфраструктуре. **Обязательно соблюдать** при любых auth/UGC/community изменениях.
**Аудит identity (2026-06-12):** `docs/EVrace_TELEGRAM_IDENTITY_AUDIT.md` — текущее состояние, Cloud vs BY, рекомендация B (full BY identity).

**Маршруты (Cloudflare Functions):** `/how-data-works`, `/community-rules`, `/privacy` — SSR из `content/trust/*.md` через `functions/_lib/trust-layer.js`.

**Контент:** `content/trust/how-data-works.md`, `community-rules.md`, `privacy.md` — единственный источник текста; опциональный YAML frontmatter (`lastUpdated`, `lead`). Шаблон отделён от контента.

**Стили trust-страниц:** `CSS/trust-layer.css` — контент внутри общего shell (`container` + `statusbar` + `page-wrap` + `renderSiteFooter`). Темы: `arcade.css` / tesla через `JS/trust-page.js`.

**Trust nav (верх):** те же классы и стиль, что футер «Доверие» — `ДОВЕРИЕ` + ссылки через `|`, UPPERCASE.

**Формы:** consent-link на `/community-rules` в `JS/review-form.js` и блок `#add-photo` (`renderPhotoUploadBlock`).

**Sitemap:** три URL добавлены в `functions/_lib/sitemap-build.js`.

**Заметка:** markdown-файлы — plain text (без `##`); рендер через `plainTextToHtml` в `trust-layer.js` (заголовки секций, списки после `:`, абзацы). Первая строка дублирующая H1 удаляется автоматически. `lastUpdated` и `lead` — опционально через YAML frontmatter в md.

---

## Состояние проекта до начала работы в Cursor (02.06.2026)

### Сайт и хостинг
- Домен: **evrace.by** → **Cloudflare Pages** (проект `ev-race`, NS `daisy`/`vicky.ns.cloudflare.com`)
- Регистрация .by у A1/domain.by; **DNS** — Cloudflare (Free)
- **GitHub Pages:** custom domain **отключить** (шаг 5); файл `CNAME` **удалён** из репо 04.06.2026
- Staging: `https://ev-race.pages.dev` — не для пользователей РБ (`*.pages.dev` DNS-подмена у провайдеров)

### Файловая структура (10 страниц)
- `index.html` — **главная** (hero, операторы, график, голосование, SEO); архив старой → `index-legacy.html`
- `CSS/home-v2.css` — стили **главной** (ARCADE + overrides TESLA light/dark); shared `.blk` shell
- `CSS/tour-v2.css` — стили **турнирной** (`tour.html`), поверх `home-v2.css`
- `tour.html` — турнирная таблица V2 (53 круга, карточки итогов)
- `stations.html` — реестр всех станций
- `map.html` — интерактивная карта
- `letters.html` — публичные письма операторам
- `operators/*.html` — страницы операторов (есть дубли в корне: `forevo.html`, `batteryfly.html` и т.д.)
- `CSS/arcade.css`, `CSS/tesla-light.css`, `CSS/tesla-dark.css` — три темы для всего сайта
- `CSS/operator.css` — dropdown операторов в nav (после arcade.css)
- `context.md` — этот файл (корень); `.cursorrules` — правила для Cursor
- Папка `v2/` — **не прод**, не править без отдельного запроса

### Infrastructure Platform (Stage 2+, с 03.06.2026)
- **URL локации:** `/{operator_slug}/{slug}` — canonical lowercase, из БД
- **Mockup:** `docs/location_page_mockup.png` (без race/AI блоков на странице)
- **Spec:** `docs/IMPLEMENTATION_SPEC.md` (whitelist операторов и coords-based locationKey — **устарели**)
- `supabase/migrations/` — Stage 1: `locations`, sync trigger, ~116 rows
- `supabase/functions/get-location/` — Stage 2.1 aggregate JSON (deployed, `--no-verify-jwt`)
- `functions/[operator_slug]/[slug].js` — Stage 2.2 SSR HTML (Cloudflare Pages Function)
- `_routes.json` — exclude `/CSS/*`, `/JS/*`, … (иначе `/CSS/arcade.css` ловится как локация)
- `JS/location-page.js` — chrome + темы на location pages (заменяет `location-theme.js`)
- Location pages: **Infrastructure only** — no race, no AI, no reviews (Stage 3)

### Навигация (все страницы)
- 5 пунктов: ГЛАВНАЯ | ТУРНИРНАЯ ТАБЛИЦА | СТАНЦИИ 2026 | ПИСЬМА | КАРТА
- Мобильное меню: position:fixed, top:41px, z-index:999
- closeBurger() на всех пунктах мобильного меню

### Темы
- Переключение через localStorage('ev_race_theme')
- `<link id="theme-css">` меняется динамически
- Папка CSS — заглавными буквами (GitHub Pages чувствителен к регистру)
- **Главная + TESLA:** overrides только в `CSS/home-v2.css` (`html[data-theme="tesla-light|dark"] .page-wrap …`)
- **ЭФФЕКТЫ / ЧЁТКО** (`.fx-toggle`) — **только ARCADE**; на TESLA всегда скрыт (`display:none` в `home-v2.css`)

### Операторы конкурсные (index.html, tour.html)
- batteryfly | BatteryFly     | #005EEB | op-bf
- forevo     | forEVo         | #b44fff | op-fo
- zaryadka   | Zaryadka       | #00cfff | op-za
- united     | United Company | #F5821F | op-uc
- csms       | ЦСМС           | #FF6B6B | op-cs
- ЦСМС везде без "Гродненский" и "Гродн."

### Операторы все (stations.html, map.html)
- malanka | Malanka      | #76d275 | op-ma
- evika   | Evika!       | #832af5 | op-ev
- orange  | Orange       | #FF6B00 | op-or
- prizma  | Prizma       | #24c3d3 | op-pr
- gto     | Белтехосмотр | #1a3a6b | op-gt (вне конкурса, через Малянку)
- неизвестные операторы — op-unknown, серая плашка #888888, имя из БД

### Supabase
- URL: https://uvrboxrddqlasgrnnnne.supabase.co
- Key: sb_publishable_Tmx9z-PHntDW4cZQrhOTHQ_1R1Bns7Y
- Таблица stations: operator, station_date, station_time (timestamptz nullable — тайбрейкер),
  count, dc_power, ac_power, station_type, gun1_type, gun2_type, gun3_type,
  city, address, location_name, simultaneous_charge, lat, lng
- CHECK constraint на operator — УБРАН (любое имя допустимо)
- Сортировка tour.html: station_date.asc, station_time.asc.nullslast
- Сортировка stations.html: station_date.desc, station_time.desc.nullslast

### Supabase — другие таблицы
- visits — счётчик посещений
- votes — голосование (Edge Function submit-vote + Turnstile)
- operator_goals — цели операторов (RLS, только через get_stations_summary)
- letters + letter_replies — письма и ответы операторов
- ai_snapshots — ежедневные снимки гонки (snapshot_date, operator, payload jsonb, hash)
- ai_operator_narratives — AI-тексты для страниц операторов

### Supabase — функции
- get_stations_summary() — все типы (DC+AC+ACDC), total, last_date, last_added, new_7d, new_30d, goal. ORDER BY total DESC
- create_ai_snapshots() — md5 hash, ON CONFLICT DO NOTHING
- **get-location** (Edge, Stage 2.1) — `?operator_slug=&slug=` → `{ location, stations, nearby, community, meta }`
  - stations: только UI fields (power, connectors, simultaneous_charge, coords, station_date, operator/aggregator)
  - nearby: same city, exclude self, location-level, limit 8, distance ASC
  - community: пустые массивы до Stage 3

### Логика турнира
- 53 круга: Круг 1 = 1-2 января, Круг 2+ = каждую субботу-пятницу
- Очки 5-4-3-2-1-0 за станции и отдельно за мощность
- В зачёт: DC + AC + ACDC (AC добавлен 16.05.2026, обновлена get_stations_summary)
- Тайбрейкер: station_time (раньше = лучше); равная мощность = одинаковые очки
- Финал: 31.12.2026 18:00
- Дата станции — по официальному заявлению в публичных источниках, локальная Минск (+03)

### AI слои
- Edge Function create-snapshot: GitHub Actions cron 03:00 Минск, x-cron-secret header
- Edge Function generate-narratives: telemetry (status_line, rivalry_line, commentary_line), gpt-4o-mini, temp 0.35
- Edge Function generate-slogans: slogan_month, gpt-5.5, cooldown 10 дней
- Тон TELEMETRY: системный/терминальный, без метафор, без английских слов
- Тон SLOGAN: атмосферная поэзия, fragment-like, кинематографично

### Страницы операторов — иерархия блоков
1. ● цветная точка + белое системное имя
2. slogan_month — #a0b4c8, letter-spacing 0.8px, uppercase
3. Badges (место/очки/победы)
4. AI СТАТУС: СТАТУС #d14dff / СОПЕРНИК #ff6b35 / ЭФИР #00e5ff

### letters.html
- Ответы вводятся вручную в Supabase Studio (letter_replies)
- Модерация через Telegram-бот
- Статус: ОТВЕТИЛ / ОТВЕТИЛИ / ОТВЕТИЛИ и ещё N
- Фильтры: оператор + статус + тег (комбинируются)
- Рейтинги операторов на паузе. Пока отвечает только forEVo

### Правила работы
- **Главная в проде:** `index.html` + `CSS/home-v2.css`. **Турнирная:** `tour.html` + `home-v2.css` + `tour-v2.css`. Папку `v2/` не трогаем.
- **Scope Infrastructure:** `supabase/`, `functions/`, location CSS в `CSS/*`, `_routes.json`, `JS/location-theme.js` — после «ДЕЛАЙ» / по плану Stage 2+
- Правки только после слова **ДЕЛАЙ** (кроме обязательного `context.md`)
- **context.md обновлять после каждого значимого шага** — автор требует всегда
- Mobile-first (~80% трафика мобиль)
- Хирургические правки — минимум изменений
- HTML renderer: **escapeHtml** на все строки из БД (operator, address, city, location_name, aggregator)
- CSS общий для сайта — три темы в `CSS/`; главная — `CSS/home-v2.css`; турнирная — `CSS/tour-v2.css`
- Папка CSS — заглавными (`CSS/`), Cloudflare Pages чувствителен к регистру
- container: max-width 1100px, статус-бар: position:sticky; top:0

---

# v2 — история решений и правок

Журнал правок главной: **`index.html`** + **`CSS/home-v2.css`**.  
Журнал турнирной V2: **`tour.html`** + **`CSS/tour-v2.css`**.

---

## 2026-06-11 — Weekly Letter GitHub cron

- **Файл:** `.github/workflows/weekly-letter.yml`
- **Расписание:** суббота 03:00 UTC (06:00 Минск) → `generate-weekly-letter`
- **Secrets:** `SUPABASE_URL`, `WEEKLY_LETTER_SECRET` (не `SNAPSHOT_CRON_SECRET`)
- **Ручной запуск:** Actions → EV RACE Weekly Letter → Run workflow
- **409** = письмо для круга уже есть (cron не падает)

---

## 2026-06-06 — Weekly Letter Engine Stage 1 (backend)

Spec: `docs/ev-race-weekly-letter-engine-v1.2.md`

### SQL (`supabase/migrations/20260606_weekly_letter_engine.sql`)
- `weekly_patterns`, `pattern_theme_mapping`, `weekly_letters`, `round_winners`
- `weekly_letters`: `adapter_source`, `is_backfill`; бэкфилл → `is_published=false`
- `round_winners`: RLS read-all; без `is_published`

### Edge Functions (не задеплоены из Cursor — нужен `supabase db push` + deploy)
- `generate-weekly-letter` — один круг, `completedRound = getCurrentRound()-1`
- `backfill-weekly-letters` — круги 1…N, `is_backfill=true`, письма не публикуются
- Shared: `rounds.ts`, `snapshot-adapter.ts`, `pattern-engine.ts`, `round-winner.ts`

### snapshot-adapter
- Primary: дельты `total_stations` из `ai_snapshots` по всем дням круга
- Fallback: `stations_reconstructed` при coverage < 35%
- Round winner: всегда из `stations` (DC+AC+ACDC, 5 ops)

### Smoke
- `scripts/weekly-letter-smoke.ts` — pattern + winner на историческом круге (deno)

---

- **`CSS/tour-v2.css?v=1`** — layout турнира в design system V2 (`--home-card`, `.blk`, без горизонтального скролла)
- **`tour.html`:** nav как на главной (dropdown операторов, mob-acc); hero → compact `tour-hero`; метрики → `tour-meta-grid`
- Секции в `.blk`: текущий круг (LIVE), прогноз, два рейтинга, история, **карточки итогов**, правила
- **Карточки итогов:** `.round-cell.round-card` + `--rc-accent` (цвет лидера/победителя по станциям); активный круг — glow
- JS логика (очки, круги, streak-бэйджи) **без изменений**; `renderRoundsGrid` — accent на карточках
- Подключено: `arcade.css` + `operator.css` + `home-v2.css` + `tour-v2.css`
- TESLA: fx-toggle скрыт (как на главной)

---

## 2026-06-03 — UX: pixbar, график mobile, кегль (батч 3)

### PixBar (операторы, ARCADE + TESLA)
- Пустые ячейки: **`seg-empty`** — прозрачный фон + контур `var(--home-bdr)` / на TESLA `var(--hairline)`
- Заполнение без изменений: **`seg-dc`** `#ffd700`, **`seg-ac`** `#00e5ff`
- Высота сегментов: **10px** desktop / **8px** mobile (было 7/6)
- JS `pixBar()`: классы вместо inline `background:#0d1a0d`

### График «СЕЗОННАЯ ГОНКА»
- Mobile ось X: **`[1, 53]`** (было `[1, текущий_круг]` → ошибочно «КР.23» справа)
- Подписи оси Y/X на canvas: **8px** mobile / **9px** desktop (было 7/8)

### Кегль (ARCADE, мелкий текст)
- Имя оператора: **10px** / desktop **11px**
- DC/AC чипы: **11px** / **b 10px**
- «Станций», «за круг», легенда графика, chart-meta: **+1px** где было 9–11px

### Версии
- `CSS/home-v2.css?v=12`

---

## 2026-06-03 — nav: sticky + бургер (главная)

- **Sticky statusbar:** убран `overflow-x: hidden` с `.container` (ломал `position:sticky`); закрепление `.container > .statusbar` в `home-v2.css`
- **Бургер:** `#mobAccList` и `#mobAccBtn` с классом **`open` по умолчанию** — все 5 операторов видны без ▾

### Версии
- `CSS/home-v2.css?v=13`

---

## 2026-06-03 — ссылки на страницы операторов (главная)

- В карточке оператора: **имя** → `/operators/{id}.html` (`.op-page-link`, цвет `--oc`, `→` при hover)
- Под статусом: **«СЕЗОННОЕ ДОСЬЕ →»** (`.op-dossier-link`, dim, underline при hover)
- Стили ARCADE + TESLA в `home-v2.css`; `renderOps()` в `index.html`

### Версии
- `CSS/home-v2.css?v=14`

---

## 2026-06-03 — главная v2 в production

- `index.html` — новая главная; `index-legacy.html` — архив
- Стили: **`CSS/home-v2.css`** (подключается из `index.html`)
- SEO `<head>` (canonical `https://evrace.by/`)
- TESLA light/dark: секция в `home-v2.css`, `.fx-toggle` скрыт на TESLA

---

## 2026-06-02 — батч PENDING (команда «ДЕЛАЙ»)

### Текст hero
- `.hl-sub`: **«БЕЛАРУСЬ 2026» → «в БЕЛАРУСИ 2026»**
- `.hl-tag`: **«[ СЕЗОН 2025–2026 ]» → «[ СЕЗОН 2026 ]»**
- Удалён блок **«ПРОКРУТИТЕ ВНИЗ ⌄»** (`.hl-scroll`)

### Контур Беларуси
- Path пересчитан из GeoJSON (BLR, johan/world.geo.json), viewBox **`0 0 200 102`**, `preserveAspectRatio="xMidYMid meet"`
- Один `<symbol id="by-map">` + `<use>` в `.hl-map` и `.hm-map`
- CSS: фикс. ширина desktop ~**130px**, без растягивания по высоте контейнера

### Countdown
- HMS (`.hr-hms`, `.hm-hms`) **скрыты по умолчанию**
- Показ при **`diff < 24 ч`** — класс `cd-hms-on` на `.hero-right` / `.hm-cd`

### «СОСТОЯНИЕ СЕЗОНА»
- `.ss-txt`: Press Start 2P, 9px, CAPS, `var(--green)`
- Эмодзи → **stroke SVG** (кубок / пин / молния)
- `.ss-cell`: `align-items: center`, padding desktop 18px / mobile 16px
- Тексты `diag*` **без изменений**

### Метрики: круг vs rolling 7d
- **`new_7d`** (RPC) — rolling 7d: `#sv-new`, `diagTempo`, `getOpStatus` (w7)
- **`.op-wkbox`**: **+N за текущий круг** (`getRoundForDate` / `getCurrentRound` как в `tour.html`), подпись **«ЗА КРУГ»**
- Stat **«ИДЁТ КРУГ»**: номер через `getCurrentRound()`, unit **«/ 53»**
- Обнуление +N — смена круга (сб 00:00 Минск, локальная `station_date`)

### PixBar (устарело в батче 3 — см. выше)
- ~~сплошной `#0d1a0d` для пустых~~ → контурные `seg-empty`
- **40** / **28** сегментов, заполнение через **`floor`**

### График «СЕЗОННАЯ ГОНКА»
- Легенда `#chartLegend` **удалена**
- Ось Y: подписи слева, шаг **20** (или **10** при yMax≤40), `pL≈30`
- Сплошная **точечная заливка** поля графика
- «НЕД. N» ярче; пунктир от текущей недели до **правого края** plot area

### Версии (батч 1)
- `home-v2.css?v=4`

---

## 2026-06-02 — батч 2 (v2)

**Философия:** везде **круги** (как `tour.html`: 53 круга, сб–пт, круг 1 = 1–2 янв).

### Регрессии
- Убран `<svg class="by-map-defs">` из потока; контур BY **inline path** в `.hl-map` / `.hm-map`
- HMS: `hidden` + scoped CSS; без прочерков при >24 ч
- Hero left: `margin-top: auto` на narrative, `min-height: 100%`
- Mobile: убрана линия над narrative (`.hm-season-blk .hm-info`)
- «Состояние сезона»: glow иконки, PS2P CAPS + text-shadow, scoped `.page-wrap .ss-*`

### Контент / UX
- **Stat-карточки удалены**; hint про реестр — под «ОПЕРАТОРЫ»
- **Mobile hero:** бренд EV RACE над countdown
- **Narrative hero** — заглушка «AI NARRATIVE — СКОРО» (AI только здесь, не в ss-grid)
- Nav «ГЛАВНАЯ» → `/` (prod v2)
- График: ось X **КР.** по **кругам**; mobile метки **`1` + `53`**; легенда; «ПРАВИЛА КРУГОВ →» tour
- Метрики: `getOpStatus`, `diagTempo`, `diagLeader` — по **текущему кругу** (`roundN`)
- Операторы: имена без ellipsis desktop, pixBar `nowrap`, упрощён glow `.op-total`
- `overflow-x: hidden` на `.page-wrap` / `.container`
- Meta description: DC+AC

### Версии
- `home-v2.css?v=9`

---

## 2026-06-02 — origin «О ГОНКЕ» + narrative стиль

- Блок **◈ О ГОНКЕ** (`.race-premise-blk`) — под hero, перед ss-grid; текст из `header-intro`, без «быстрых»
- Внизу `.chronicle-blk` — **только UPD×2**
- Hero narrative: PS2P, chart-line SVG, `loadSeasonFeed()` из `ai_season_feed`

---

Автор зафиксировал: блок = **deterministic diagnostics layer** (не AI, не prose, не heartbeat).

- Документ: **`v2/SEASON-STATE.md`**
- Три оси: leadership pressure (`diagLeader`), regional activity (`diagRegion`), season tempo (`diagTempo`)
- Narrative hero — только AI; ss-grid — только pools + правила из кода
- **REGION на current round** — `fetchRegion()` через `getRoundDates()`; единая temporal system для ss-grid
- Философия temporal logic — `v2/SEASON-STATE.md` § «Temporal logic (final)»

- Создан `v2/home-v2.css`, nav/footer/vote как `forevo.html`
- Подключён `operator.css` (dropdown)
- Scoped CSS-сброс конфликтов `arcade.css` для `.op-row`
- PixBar вместо op-bar-v2, логотипы убраны из строк операторов

---

## 2026-06-02 — scope

- **Только v2 / новая главная.** Остальные файлы репо не редактируем до отдельного решения.

---

## Не в scope / заморожено (не v2)

- **Любые правки вне v2** (`operators/*`, `stations.html`, общий `CSS/arcade.css`…) — **заморожено**, пока не скажешь иначе. **`tour.html` + `tour-v2.css`** — в scope tour V2.
- «БЕЛАРУСЬ» → «в БЕЛАРУСИ» на остальных страницах (v2 hero — уже сделано)
- Слияние `home-v2.css` → `arcade.css`
- ~~Замена production `index.html`~~ — выполнено (см. `index-legacy.html`)
- Live AI narrative
- Длинные формулировки `diag*` / pools — см. `v2/SEASON-STATE.md`
- Общий `JS/rounds.js` для `tour.html` + главной

---

## 2026-06-02 — документация

- `context.md` перенесён в корень репо; `v2/context.md` удалён
- `cursorrules` переименован в `.cursorrules`
- Синхронизированы `.cursorrules`, `context.md`, ссылка в `v2/PENDING.md`

---

## 2026-06-02 — заметки (до батча 2)

- Правило `.cursorrules`: горизонтальный скролл страницы запрещён (исключения — фильтры, nav операторов).
- Философия страницы: каркас hero → ss → ops → chart → vote — без изменений.

---

# Infrastructure Platform — журнал (Stage 1–2)

Spec: `docs/IMPLEMENTATION_SPEC.md`. Visual: `docs/location_page_mockup.png`.

---

## 2026-06-03 — Stage 1 COMPLETE (Supabase)

- Миграции `supabase/migrations/001`–`005` + `004b_fix_upsert_latlng.sql` применены в prod
- Таблица `locations`: ~**116** rows (Table Editor показывает 100/стр — pagination)
- Identity: `location_key` = `generate_location_key(operator, city, address)`; URL = `operator_slug` + `slug`
- **Нет whitelist операторов** — все реальные owners; skip только если нет operator/city/address
- PASS GATE: NULLs / duplicate keys / duplicate slugs = 0
- Известный data quirk: ИстПал slug **`mozyr-neftestroiteley-26k1-1`** (лишний `-1`) — почистить позже в Studio
- Frontend smoke Stage 1: stations, map, vote, letters — OK

---

## 2026-06-03 — Stage 2.1 COMPLETE (get-location API)

- Файл: `supabase/functions/get-location/index.ts`
- Deploy: `supabase functions deploy get-location --no-verify-jwt` (project `uvrboxrddqlasgrnnnne`)
- Query: `operator_slug` + `slug` (alias `operator=`)
- Smoke OK: `istpal` + `mozyr-neftestroiteley-26k1-1` → JSON с 4 stations, 3 nearby
- `supabase/config.toml`: `verify_jwt = false`

---

## 2026-06-04 — DNS migration DONE (evrace.by → Cloudflare Pages)

**Cutover 04.06.2026:** NS A1 → Cloudflare; Custom domains `evrace.by` + `www.evrace.by` **Active** на Pages `ev-race`. Smoke без VPN OK (главная, реестр, location page, www→apex).

**Прод:** `https://evrace.by/{operator_slug}/{slug}` — location SSR + Functions.

**GitHub Pages:** custom domain remove (автор); `CNAME` удалён локально — **push в GitHub**.

**DNS (Cloudflare):** apex + www → Pages; TXT Google verification.

---

## 2026-06-04 — DNS migration IN PROGRESS [архив чеклист]

**Текущий DNS (до переноса):**
- `evrace.by` CNAME → `artsiomkrivtsoff.github.io` (GitHub Pages)
- `www.evrace.by` CNAME → `artsiomkrivtsoff.github.io`
- Файл `CNAME` в репо — для GitHub Pages; **удалить после отключения GitHub custom domain**

**Цель:** один прод-хост `https://evrace.by` на проекте Cloudflare Pages `ev-race` (Functions + static).

**Рекомендуемый путь (DNS через Cloudflare, регистрация .by остаётся у BY-регистратора):**

| Шаг | Где | Действие |
|-----|-----|----------|
| 1 | Cloudflare Dashboard | **Add a site** → `evrace.by` → Free plan |
| 2 | Cloudflare | Скопировать 2 nameserver'а (например `xxx.ns.cloudflare.com`) |
| 3 | Регистратор .by | Заменить NS домена на Cloudflare (не менять регистрацию) |
| 4 | Cloudflare DNS | Дождаться Active; удалить старые записи на `github.io` |
| 5 | Pages → `ev-race` → **Custom domains** | Add `evrace.by` + `www.evrace.by` |
| 6 | Cloudflare DNS | Pages создаст CNAME/flatten для apex автоматически |
| 7 | GitHub → repo Settings → Pages | **Remove** custom domain `evrace.by` |
| 8 | Репо | Удалить файл `CNAME`; push → Pages redeploy |
| 9 | Smoke без VPN | `/`, `/stations.html`, `/istpal/mozyr-neftestroiteley-26k1-1` |

**Альтернатива без смены NS:** только CNAME у регистратора → `ev-race.pages.dev` (если регистратор разрешает CNAME на apex). Менее надёжно для .by — **предпочтительна смена NS на Cloudflare**.

**Подготовлено в репо (04.06.2026):**
- `_redirects` — `www.evrace.by` → `evrace.by` (301)
- Leaflet self-hosted: `/JS/vendor/leaflet.js`, `/CSS/vendor/leaflet.css` (без unpkg)
- `_routes.json` — exclude vendor paths

**Env vars Pages (Production):** `SUPABASE_URL`, `SUPABASE_ANON_KEY` — уже заданы.

**После cutover:** тест только на `evrace.by`; `pages.dev` — dev/staging, не для пользователей РБ.

---

## 2026-06-03 — Stage 2.2 layout DONE (location pages)

**Вёрстка location page (arcade first):**
- `functions/_lib/site-chrome.js` — header как `index.html` (dropdown, FX), footer как `stations.html` (без chronicle)
- `functions/_lib/location-render.js` — middle: hero, stat-cards, таблица станций (паттерн `renderGroupRows`), mobile `.loc-card`, sidebar
- `functions/[operator_slug]/[slug].js` — SSR с импортами chrome + render
- `CSS/location-page.css` — grid hero (identity | rating | map), main + sidebar, report/tags/reviews placeholders
- CSS chain: `arcade.css` → `operator.css` → `home-v2.css` → `location-page.css`
- `JS/location-page.js` — темы, burger, dropdown, visit counter (`page=location`), scroll-top
- `JS/location-map.js` — Leaflet + CARTO + `makeIcon()` (как `map.html`)
- Active nav: **СТАНЦИИ 2026**
- Блок «ОТПРАВИТЬ ОТЧЁТ»: TG + аноним (disabled, СКОРО) + privacy disclaimer

**Smoke после деплоя на pages.dev:**
- Multi: `/istpal/mozyr-neftestroiteley-26k1-1`
- Single: `/batteryfly/mozyr-neftestroiteley-1a`

**Не в scope:** ссылки из stations/map, Tesla polish, Stage 3 reviews

---

## 2026-06-03 — Stage 2.2 IN PROGRESS (location pages) [архив]

### Cloudflare Pages
- Репо `ArtsiomKrivtsoff/ev-race` подключено; build: preset None, output `/`, branch `main`
- Env vars (Production): `SUPABASE_URL`, `SUPABASE_ANON_KEY` (`sb_publishable_…`)
- Тест URL: **https://ev-race.pages.dev**
- `evrace.by` **ещё на GitHub Pages** — DNS не переключали

### Код (локально + частично на GitHub вручную автором)
- `functions/[operator_slug]/[slug].js` — SSR, cache 600s, escapeHtml, один fetch get-location
- `JS/location-theme.js` — setTheme / burger / reduced-fx
- `CSS/arcade.css`, `tesla-light.css`, `tesla-dark.css` — блок `.location-page` (базовый)
- `_routes.json` — fix: static assets не перехватываются Function

### Баг и fix (03.06.2026)
- **Симптом:** нет стилей; `/CSS/arcade.css` → HTML «Такой локации нет»
- **Причина:** маршрут `/{seg1}/{seg2}` трактовал `CSS/arcade.css` как локацию
- **Fix:** `_routes.json` exclude + `shouldServeStatic()` → `env.ASSETS.fetch()`

### Smoke pages.dev (после fix)
- ✅ `…/istpal/mozyr-neftestroiteley-26k1-1` — данные, карта, nearby
- ✅ `…/batteryfly/mozyr-neftestroiteley-1a` — single-station
- ⚠️ Вёрстка **криво vs mockup** — каркас есть, layout polish **не сделан**

### Location page — layout contract (автор, 03.06.2026)

**Оболочка (не контент локации):**
- Header + burger = **как `index.html`** (dropdown операторов, `operator.css`, FX toggle)
- Footer от **`big-phrase` «СТАВКИ СДЕЛАНЫ, ГОСПОДА»** = как `stations.html` (author, visit-counter, theme-footer-switch, disclaimer)
- **`chronicle-blk` (UPD 1/2) на location page — НЕТ**

**Середина (Infrastructure, mockup минус запрещённое):**
- Стилистика = **существующий arcade** + паттерны **`home-v2.css`** (`.blk`, `.blk-hdr`, `.blk-title`, `--home-*` токены) для блоков middle
- Переиспользовать: `.loc-card`, `table.reg`, `.stat-card`, `.section-head`, `.op-badge`, `.gun-pill`, Leaflet/`makeIcon` из `map.html`
- Карта = Leaflet (не OSM iframe)
- Tesla — **location page:** overrides в `location-page.css` v41 (03.06.2026); главная — `home-v2.css`

**Блок «ОТПРАВИТЬ ОТЧЁТ» (sidebar, Stage 2 placeholder → Stage 3):**
- Не только большая кнопка Telegram — **два равноправных пути:**
  1. **Telegram** — доверенный аккаунт (user_hash, без PII в БД)
  2. **Анонимный отзыв** — отдельная ссылка/кнопка «Без входа» (форма Stage 3)
- **Дисклеймер** под блоком: не храним персональные данные; TG → только анонимный hash; аноним → без имени/аккаунта
- Mockup: sidebar справа на desktop; на mobile — после отзывов или collapsible

**Запрещено в middle:** race-полоска (EV RACE 2026 / 2.1%), AI-сводка, chronicle, footer «1010 станций»

### Навигация на location page (автор, 03.06.2026)

**Отдельного пункта меню «Локации» — НЕТ.** Location page = drill-down из существующих разделов, не новый раздел сайта.

| Вопрос | Решение |
|--------|---------|
| Меню сверху | Как **`index.html`** (dropdown операторов). Отдельный пункт под локации не добавляем |
| Active-пункт на странице локации | **`СТАНЦИИ 2026`** (пользователь логически пришёл из реестра) |
| Как попадать на URL локации (позже) | **Реестр:** клик по адресу / `location_name` / колонка рейтинга → `/{operator_slug}/{slug}`. **Карта:** кнопка «ОТКРЫТЬ ЛОКАЦИЮ» / «ПОДРОБНЕЕ» в popup пина |
| Между локациями | Блок **«Рядом»** на самой location page (уже в API) |
| SEO / прямой заход | sitemap + canonical — после DNS на Cloudflare |

**Техническая зависимость для ссылок (отложено):** в `stations` / данных карты пока **нет** `operator_slug` + `slug` (только в `locations`). Для автоссылок позже: denorm slug в `stations` (триггер) или lookup-map по `(operator, city, address)`.

**Приоритет сейчас:** деплой + visual QA vs mockup; ссылки из `stations.html` / `map.html` — после QA.

### Следующие шаги (backlog, порядок)

1. **СЕЙЧАС — DNS cutover** `evrace.by` → Cloudflare Pages (см. раздел 2026-06-04 выше)
2. Smoke без VPN: главная, реестр, location page, карта Leaflet (локальный vendor)
3. **2.2b — входные ссылки:** slug в станции + `<a>` в реестре + кнопка в popup карты
4. Sitemap location URLs; slug `-1` у ИстПал
5. Stage 3: reviews, Telegram, аноним, tags, stars в реестре

---

## 2026-06-03 — Community Signals v1 + location page polish (prod `main`)

**Спека:** `docs/EVrace_Community_Signals_v1_IMPLEMENTATION_PLAN.md` · §13.1 mobile UX

### Backend (Supabase, deployed)
- Migration `013_community_signals.sql` — `community_signals`, `location_signal_counts`, `community_signal_submissions`, seed 10 сигналов
- Edge: `community-signals-status`, `submit-community-signals`; расширен `get-location` → `community.signals`, `form_signals`
- Secret `VOTER_KEY_SALT`; dedupe `UNIQUE(location_id, voter_key)`

### First-party cookie (CF proxy)
- `/api/community-signals-status`, `/api/submit-community-signals` — `functions/_lib/community-signals-proxy.js`
- HttpOnly `evrace_voter` на `evrace.by` (не cross-site supabase.co)

### Frontend — два независимых блока
- **Area A:** `#community-signals-agg` — только `count > 0`; empty: «Станция ждёт первое наблюдение сообщества.»
- **Area B:** `#community-signals-form` — форма наблюдений (не review tags, не TG)
- `JS/community-signals.js` v5 · `CSS/location-page.css` v41
- SSR: `renderCommunitySignalsBlock()` в `functions/_lib/location-render.js`

### Mobile форма (§13.1)
- Collapsed: teaser + CTA «Добавить наблюдение»
- Expand: чипы + hint + counter + Turnstile + submit (lazy Turnstile после expand)
- After submit: compact success + CTA «Оставить отзыв» → `#review-form` (только mobile)
- **Анимация expand (v5):** `.cs-mobile-shell` + `grid-template-rows 0fr→1fr` ~0.55s; teaser схлопывается; `prefers-reduced-motion` — без анимации
- **Чипы:** перенос **только целых слов** (`word-break: normal`, без `hyphens: auto`); label в `<span class="cs-form-chip-label">`

### Desktop / mobile layout (sidebar)
- **Desktop:** `.loc-main-col` (infra → signals → reviews) + `.loc-sidebar` (photos → nearby) — **две независимые flex-колонки**, без shared grid rows (иначе phantom gaps)
- Sidebar вровень с «СТАНЦИЙ В ЛОКАЦИИ» (col 2, row 1)
- **Mobile order** (`display: contents` + `order`): infra → signals agg → signals form → reviews → photos → nearby

### Tesla Light / Dark — location page (v41)
- Overrides в `CSS/location-page.css` (секция `html[data-theme="tesla-light|dark"] body.location-page`)
- Философия как `home-v2.css`: Inter, hairlines, `--surface`, без PS2P/glow/неона
- Мост `--home-*` → Tesla tokens; полный skin Community Signals + форма отзывов + `.blk` shell
- Desktop Tesla Light: `shadow-2` на карточках для контраста на `#f4f4f6`

### Кэш и свежесть сигналов
- HTML location page: CF cache **600s** (`max-age=600, s-maxage=600`)
- `/api/community-signals-status`: **`no-store`** — Area A обновляется JS при каждой загрузке
- После submit: у отправителя сразу; у других — при следующем заходе (не live push)
- Review tags agg — только SSR, до ~10 мин stale

### Git commits (сессия 03.06, `main` → CF Pages)
| Commit | Суть |
|--------|------|
| `5b07b6f` | cookie proxy + Area A client refresh |
| `89bd911` | chip typography (Isabel trial, flex-wrap) |
| `47d7115` | sidebar grid-row pin (superseded) |
| `caef8bf` | mobile accordion + whole-word wrap |
| `0d8f729` | sidebar flex wrapper (fix phantom gaps) |
| `4ebd530` | sidebar row 1 align (superseded) |
| `71c56c0` | decouple columns + mobile block order |
| `70c42c4` | Tesla skin + smooth accordion animation |

### Smoke URL
- `https://evrace.by/batteryfly/vitebsk-pr-frunze-77-2` (location_id 128, есть submissions)

### Known limits v1
- CF HTML cache 600s (mitigated client refresh signals)
- Isabel trial — кириллица → Share Tech Mono fallback
- Rate limits не в коде
- Review form TG — отдельный блок `#review-form`, out of scope signals

---

## 2026-06-03 — UX Improvements v1.1 (код, без деплоя)

**Scope:** Photos + Community Signals UX only. **Не трогали:** Telegram auth, Community Identity, Reviews v1.

### Community Signals
- Edit model REPLACE (backend `submit-community-signals`, `community-signals-status`)
- UX: «Мои наблюдения» + чипы + «Изменить»; modal pre-fill; empty save = remove from agg; cooldown 5 min in modal
- `JS/community-signals.js` v11

### Photos
- Thumbnails + «N фото выбрано»; progress steps ending «Готово.»; success screen без auto-close
- Limit **4** за отправку (`MAX_FILES_PER_SUBMISSION`); `MAX_FILES_TELEGRAM_LINKED=10` reserved, **not wired**
- Убраны v1.0 TG session checks (`resolve-session`, `community-auth` на location page)
- `JS/photos-upload.js` v7

### Mobile gallery
- Horizontal carousel ≤899px; touch lock в `photos-gallery.js` v3; desktop grid unchanged
- `CSS/location-page.css` v51

### Deploy pending
- ~~Cloud: `submit-community-signals`, `community-signals-status`~~ ✅ 2026-06-03
- ~~BY: `photos-upload`, `photos-status`~~ ✅ 2026-06-03 (`max_files_per_submission: 4` live)
- ~~CF Pages: JS/CSS/`[slug].js`~~ ✅ commit `ec56ca9` → `main`
- Hotfix ✅ `051e007` — signals edit save, ✓ in agg, gallery swipe + arrows

### Known limits (signals v1)

### Тестовые URL
- **Прод (после cutover):** `https://evrace.by/istpal/mozyr-neftestroiteley-26k1-1`
- **Staging (не для РБ-пользователей):** `https://ev-race.pages.dev/…`
- API: `…/functions/v1/get-location?operator_slug=istpal&slug=mozyr-neftestroiteley-26k1-1`
