# EVRACE.BY — Location Platform Implementation Spec v2.1.3
## Целевая аудитория документа: Cursor (AI coding assistant)
## Репозиторий: github.com/ArtsiomKrivtsoff/ev-race
## Версия: 2.1.3 (FINAL — все архитектурные и behavioral патчи интегрированы)

---

## 0. ПЕРЕД НАЧАЛОМ — ОБЯЗАТЕЛЬНО ПРОЧИТАТЬ

Это спецификация на построение **Infrastructure Platform** для EVRACE.BY — публичной системы локаций зарядных станций Беларуси с рейтингами, отзывами, фотографиями.

**Прежде чем писать любой код:**
1. Прочитай README.md (если есть) и структуру репозитория целиком
2. Изучи существующие файлы: `index.html`, `tour.html`, `stations.html`, `map.html`, `letters.html`, `CSS/arcade.css`, `CSS/tesla-light.css`, `CSS/tesla-dark.css`
3. Изучи `stations.js` (или эквивалент) — функции `locationKey()` и `groupByLocation()` — это ядро текущей JS-архитектуры
4. Изучи существующие Edge Functions в `supabase/functions/` (особенно `submit-letter`, `submit-vote`, `create-snapshot`)
5. Прочитай секции 1 (HARD CONSTRAINTS), 2 (INFRASTRUCTURE PLATFORM vs RACE SECTION) и 15 (CURSOR ANTI-ENTROPY RULES) **дважды** перед началом работы
6. Изучи прикреплённый mockup `docs/location_page_mockup.png` как visual direction (см. секцию 9.10)

**Правила работы с автором (Artsiom):**
- Триггер любых изменений — слово **ДЕЛАЙ**. До него: только обсуждение, мокапы, diff на review
- Surgical edits: минимальные точные правки. Не "улучшать по пути"
- Изменения накапливаются, потом коммитятся пакетом
- Файлы всегда брать из последнего пуша в репо, не из кеша
- Все коммуникации на русском языке
- Если есть сомнения по архитектуре — спросить автора, а не догадываться

---

## 1. HARD ARCHITECTURAL CONSTRAINTS

**Это разделы, нарушение которых приведёт к отказу принятия PR. Не обсуждается, не интерпретируется, не "оптимизируется".**

### 1.1. Запрещённый стек

НЕ добавлять в проект ни при каких обстоятельствах:

- React, Vue, Svelte, Preact, Solid, Angular
- Next.js, Nuxt, Astro, Remix, SvelteKit
- TypeScript migration существующего frontend (`.ts` для browser scripts)
- Tailwind rewrite (существующие CSS-классы — остаются)
- Build systems: webpack, vite, rollup, esbuild, parcel
- npm ecosystem на фронте: `package.json` для клиентского кода
- SPA architecture, client-side routers (history API, hash routing)
- Websocket/realtime subscriptions, Supabase realtime
- ORM, query builders (kysely, drizzle, prisma)
- CSS-in-JS, styled-components, emotion
- State management libraries (redux, zustand, jotai)
- Component frameworks (web-components, lit)
- Glassmorphism, "modern dashboard" эстетика, startup-SaaS UI patterns

### 1.2. TypeScript clarification

TypeScript разрешён **ТОЛЬКО** внутри Supabase Edge Functions:
- `supabase/functions/*/index.ts` — это требование Deno runtime

TypeScript **ЗАПРЕЩЁН** для:
- Корневых HTML страниц
- Existing JS файлов (`stations.js`, `map.js`, любой UI logic)
- Browser scripts любого вида
- Новых Pages Functions (`functions/[operator]/[slug].js` — `.js`, не `.ts`)

НЕ конвертировать существующие `.js` файлы в `.ts` ни при каких обстоятельствах. Никаких `.ts` файлов вне `supabase/functions/`.

### 1.3. Разрешённый стек

EVRACE.BY остаётся:

- Browser-native HTML/CSS/vanilla JS первичным
- Static-first: HTML рендерится template literals в Pages Functions
- Cloudflare edge-enhanced, не framework-driven
- Минимально-runtime: никаких лишних зависимостей
- Existing structure: 3 CSS-файла на весь сайт, новые стили добавляются туда

Допустимые внешние библиотеки (только через CDN, не npm):
- Cloudflare Turnstile widget (уже подключён)
- Telegram Login Widget (уже подключён)

### 1.4. Existing pages are legacy-stable

Следующие страницы — **production-stable** и не подлежат рефакторингу:
- `index.html`
- `tour.html`
- `stations.html`
- `map.html`
- `letters.html`

И их JS/CSS соответственно.

**Разрешено в этих файлах:**
- Минимальные интеграции с location pages (звёзды на карточках, ссылки)
- Добавление одного дополнительного поля в существующий запрос Supabase
- Surgical additions: ровно тот код, что нужен для интеграции

**Запрещено в этих файлах:**
- Redesign UI/UX
- Componentization existing logic
- Rewriting existing JS
- Restructuring CSS architecture
- "Очистка" или "улучшение" существующего кода
- Замена `var` на `const`, перенос функций, переименование переменных
- Любые косметические правки без явной просьбы

### 1.5. Locations are semi-immutable identities

После создания location:

**НЕ изменяются автоматически через триггеры:**
- `operator`
- `city`
- `address`
- `location_key`
- `slug`

**Могут изменяться автоматически через триггеры:**
- `location_name` (soft, human-readable)
- `lat`, `lng`
- `cached_avg_rating`, `cached_review_count`
- `updated_at`, `is_active`

**Если identity fields изменились:** это **manual editorial action** через Supabase Studio автором. Триггер на UPDATE identity полей **не существует**.

Защищает: reviews (не отвязываются), SEO (URL стабильны), historical links, cache consistency.

### 1.6. Duplicate locations are resolved manually

EVRACE.BY intentionally avoids automatic deduplication.

Если появятся duplicates:
- Merge выполняется **вручную автором через Supabase Studio**
- Через SQL миграцию вида: `UPDATE reviews SET location_id = <correct> WHERE location_id = <duplicate>; DELETE FROM locations WHERE id = <duplicate>;`
- Без специальных tools, функций или endpoints для merge

НЕ строим: fuzzy matching, automatic merge, coordinate-based identity, similarity engines, admin UI для merge.

### 1.7. Address handling intentionally simple

EVRACE.BY НЕ строит address canonicalization engine.

В V1 НЕ делаем:
- `normalize_address()` с regex заменами
- Fuzzy matching между похожими адресами
- Словари сокращений (`ул.` → `улица` и т.п.)
- Coordinate-based merge
- Auto-deduplication

**Допустимый максимум:** `lower() + trim()` в `generate_location_key()`. Это базовая SQL гигиена против case-sensitivity и trailing whitespace, не нормализация адреса.

Если в БД появятся дубли из-за опечатки — fix через `UPDATE` в Studio. Это приемлемое решение.

---

## 2. INFRASTRUCTURE PLATFORM vs RACE SECTION

**Это фундаментальный архитектурный принцип проекта. Все остальные секции документа интерпретируются через эту призму.**

### 2.1. Двойная природа проекта

EVRACE.BY состоит из двух **независимых** частей:

#### A. Infrastructure Platform

Постоянная всебелорусская платформа зарядной инфраструктуры.

Включает:
- locations
- stations registry
- map
- operators (как owners инфраструктуры)
- reviews
- photos
- ratings
- search/navigation
- nearby infrastructure

Это **utility / infrastructure layer** проекта. Permanent product.

#### B. Race Section

Отдельный тематический медиа-раздел сезона EV RACE 2026.

Включает:
- tournament (`tour.html`)
- rankings
- AI narratives
- season snapshots
- countdowns
- race analytics
- operator competition

Это **entertainment / media layer** проекта. Temporary seasonal product.

### 2.2. Location Pages принадлежат ИСКЛЮЧИТЕЛЬНО Infrastructure Platform

Location pages (`/{operator}/{slug}`):
- **НЕ** являются частью гонки
- **НЕ** эволюционируют из race pages
- **НЕ** содержат race semantics
- **НЕ** зависят от существования турнира
- **НЕ** являются "архивом сезона"

Даже если домен проекта называется EV RACE — сами страницы локаций не имеют отношения к соревнованию операторов.

Это самостоятельный infrastructure-продукт с первого дня.

### 2.3. TEST RULE — обязательная проверка

Каждая location page **ОБЯЗАНА проходить тест:**

Location page должна оставаться полностью логичной и полезной даже если:
- EV RACE 2026 никогда не существовал
- Tournament pages удалены
- AI snapshots выключены
- Season mechanics отсутствуют

**Если элемент страницы теряет смысл без гонки — ему НЕ место на location page.**

### 2.4. Что ЗАПРЕЩЕНО на location pages

НЕ добавлять никогда:
- Countdowns / обратные отсчёты
- Season widgets
- Tournament rankings
- Operator positions in race ("2-е место в гонке")
- AI race narratives
- AI summaries из `ai_snapshots` / `ai_operator_narratives`
- "Лидер сезона"
- "Обогнал конкурента"
- "Очки сезона"
- Season forecasts / прогнозы гонки
- AI telemetry
- "Установлено во время EV RACE 2026"
- "Вклад в расширение сети оператора X — 2.1%"
- Progress bars операторов
- "Гонка продолжается"
- "1010 станций до 31.12.2026"
- Любые проценты прогресса операторов
- Race counters
- Любая семантика competition

Location page — **НЕ race dashboard**.

### 2.5. Что РАЗРЕШЕНО на location pages

Разрешены только **infrastructure facts**:
- Оператор станции (логотип, имя)
- Адрес, координаты
- `location_name`
- Дата запуска (как infrastructure fact, не "момент получения очков")
- Технические характеристики
- Мощность, разъёмы
- Фото места
- Отзывы, рейтинги
- Tag aggregation block (см. 9.7)
- Nearby infrastructure (всех операторов)
- Карта
- Status/availability placeholders под будущие infrastructure features

**Эти данные являются нейтральными фактами инфраструктуры, а не race-механикой.**

#### Уточнение про operator

Operator на location page:
- ✅ Имя и логотип (фактический владелец инфраструктуры)
- ✅ Ссылка "Все локации этого оператора" (infrastructure navigation)
- ❌ Место в турнире
- ❌ Race status
- ❌ AI commentary
- ❌ "Вклад в сеть" / progress bars

#### Уточнение про station_date

Дата запуска — это **инфраструктурный факт** ("дата ввода в эксплуатацию"), не race-метрика ("момент получения очков"). Отображается без race-context.

### 2.6. OPERATIONAL RULE — обязательный чеклист для Cursor

Перед добавлением **ЛЮБОГО** элемента на location page Cursor ОБЯЗАН ответить на 3 вопроса:

**Вопрос 1:** Этот элемент полезен EV-водителю как инфраструктурная информация вне контекста гонки?
- НЕТ → не добавлять

**Вопрос 2:** Этот элемент останется логичным без EV RACE 2026?
- НЕТ → это race layer → не добавлять

**Вопрос 3:** Этот элемент зависит от: `ai_snapshots`, `ai_operator_narratives`, `ai_season_feed`, rankings, countdowns, season logic?
- ДА → запрещено для location pages

Только если на все три вопроса ответ "ДА (1, 2) / НЕТ (3)" — элемент можно добавлять.

### 2.7. Навигация — решение для V1

Location pages используют **общий header сайта** (тот же что в `index.html`, `tour.html`, `stations.html`, `map.html`, `letters.html`).

Это **НЕ** делает их частью гонки. Header — глобальная навигационная оболочка проекта.

**Внутри самой location page:**
- Никакой race-семантики
- Никакого tournament UX
- Никакого season-tone

Footer — нейтральный infrastructure footer. БЕЗ race-counter, БЕЗ "1010 станций", БЕЗ "гонка продолжается".

### 2.8. Database / Edge Functions classification

**Infrastructure Layer** (создаём в этом ТЗ):
- Таблицы: `locations`, `reviews`, `review_photos`, `reports`, `users`
- Edge Functions: `get-location`, `submit-review`, `submit-review-photo-init`, `submit-review-photo-complete`, `submit-report`, `telegram-auth`, `moderate-photo`

**Race Layer** (существует, **не трогать, не смешивать**):
- Таблицы: `ai_snapshots`, `ai_operator_narratives`, `ai_season_feed`, tournament logic
- Edge Functions: `create-snapshot`, `generate-narratives`, `generate-season-feed`, `submit-vote`

**Infrastructure Layer Edge Functions и Pages Functions НЕ должны читать Race Layer tables.** Это intentional separation.

---

## 3. КОНТЕКСТ ПРОЕКТА

### 3.1. EVRACE.BY — что это

Сайт состоит из двух независимых продуктов под одним брендом:

**Infrastructure Platform** — всебелорусский публичный реестр зарядной инфраструктуры. Локации, станции, карта, рейтинги, отзывы. Постоянный продукт.

**Race Section** — медиа-раздел с турнирной механикой сезона EV RACE 2026. 5 операторов соревнуются до 31.12.2026. Временный seasonal product.

### 3.2. Технический стек

- **Хостинг фронтенда:** GitHub Pages (репо `ArtsiomKrivtsoff/ev-race`)
- **DNS / прокси:** Cloudflare (для `evrace.by`)
- **БД и Edge Functions:** Supabase (`uvrboxrddqlasgrnnnne.supabase.co`)
- **Защита форм:** Cloudflare Turnstile
- **Аналитика:** Yandex.Metrika ID `108141830`
- **Routing для динамических страниц:** Cloudflare Pages Functions (новое — добавим)
- **HTML cache:** Cloudflare Cache API (`caches.default`)
- **Хранилище фото:** Cloudflare R2 (новое — добавим)
- **Telegram-бот:** `@evrace_by_bot` (существует, расширяем)

### 3.3. Существующие таблицы Supabase (НЕ ТРОГАТЬ)

`stations`, `votes`, `visits`, `operator_goals`, `letters`, `letter_replies`, `ai_snapshots`, `ai_operator_narratives`, `ai_season_feed` — только использовать, не модифицировать.

Существующие Edge Functions — не трогать. AI race snapshots работают как есть.

### 3.4. Операторы

**Конкурсные (в Race Section):** `batteryfly`, `forevo`, `zaryadka`, `united`, `csms`
**Вне конкурса (но в Infrastructure):** `malanka`, `evika`, `orange`, `prizma`, `gto` (Белтехосмотр)

**Важно для Infrastructure Platform:** на location pages **все 10 операторов равны**. Конкурсный статус — race-семантика, не infrastructure-факт.

Цвета и CSS-классы — см. существующий `stations.html` (массивы `OP_NAMES`, `OP_CLASS`, цвета в CSS).

ЦСМС везде отображается строго как «ЦСМС», без «Гродненский».

---

## 4. АРХИТЕКТУРНЫЕ РЕШЕНИЯ

Все решения интерпретируются через призму секции 2 (Infrastructure vs Race separation).

### 4.1. Location-first архитектура

Локация — самостоятельная сущность в БД (`locations`). Создаётся автоматически при появлении station через PostgreSQL триггер на INSERT. Reviews привязаны к `location_id`.

`stations` остаются source of truth для технических данных. `locations` — для UI/SEO/reviews. Это aggregate layer.

**Location page identity строится вокруг сущности location, а НЕ вокруг отдельных station rows.**

- `stations` = технические данные
- `locations` = публичная infrastructure identity

Reviews, ratings, photos, SEO, URLs и community layer привязаны к location, не к station row.

Cursor НЕ должен строить station-centric rendering logic для location pages.

### 4.1.1. Human-first infrastructure UX

Location pages проектируются вокруг **человеческого восприятия локации**, а не вокруг структуры базы данных.

Пользователь воспринимает:
- место
- площадку
- точку зарядки
- объект инфраструктуры

Пользователь НЕ воспринимает:
- отдельные station rows
- database entities
- connector records

Location page должна ощущаться как **«единое место зарядки»**, а НЕ как **«набор отдельных станций из таблицы»** или **«страница оператора»**.

**Главный объект страницы:**
- сама локация
- опыт пребывания на месте
- удобство для EV-водителя

**Тест:** если обычный EV-водитель открыл страницу, он должен почувствовать «это страница места зарядки», а не «это интерфейс к базе данных».

#### 4.1.1.a. Visual hierarchy — Identity layer > Technical layer

UI приоритеты (сверху вниз):

```
1. Identity layer (PRIMARY visual weight):
   - адрес
   - оператор
   - фото
   - карта
   - рейтинг
   - отзывы

2. Technical layer (SECONDARY visual weight):
   - DC/AC сводка
   - мощности
   - коннекторы
   - количество постов

3. Infrastructure navigation (TERTIARY):
   - nearby locations
   - route utility

4. Optional placeholders (FUTURE):
   - status/availability (V2+)
```

**Правило:** если технический блок визуально тяжелее identity card — UX неправильный.

#### 4.1.1.b. Human-first language

Никакого database-tone в интерфейсе.

| ❌ DB-tone | ✅ Human-tone |
|-----------|---------------|
| `station_date: 2024-03-14` | "Запущено в марте 2024" |
| `simultaneous_charge: 4` | "Можно заряжать одновременно 4 авто" |
| `gun1_type: CCS, gun2_type: GBT` | "Разъёмы: CCS и GBT" |
| `DC power: 160` | "Быстрая зарядка до 160 кВт" |
| `station_type: 'ACDC'` | "Универсальная (AC + DC)" |
| `Reviews (23)` | "23 отзыва" или "Отзывы (23)" |
| `Location ID: 42` | (не показывать) |

Интерфейс должен ощущаться как consumer product, а не админка.

#### 4.1.1.c. Internal data hiding

Никогда не показывать пользователю:
- `location.id`, `station.id`, `location_key`
- Raw timestamps (`2024-03-14 14:30:00+03`)
- Internal enums (`'ACDC'`, `'CCS'` — нужны человеческие переводы или сохранение в правильной форме)
- Database identifiers
- Технические поля БД

#### 4.1.1.d. Single station case

Если на локации **одна** station:
- НЕ делать отдельную таблицу из одного элемента
- Технические данные интегрируются прямо в identity card

Если станций **несколько**:
- Появляется отдельный compact technical block
- Secondary visual weight

### 4.2. URL-структура: operator-first

`/{operator}/{slug}` где slug = транслит `{city}-{street}-{house}`.

Примеры:
- `/malanka/minsk-kalvariyskaya-24`
- `/batteryfly/brest-moskovskaya-273a`

**Slug уникален в рамках оператора, не глобально:**
- `/malanka/minsk-kalvariyskaya-24` и `/batteryfly/minsk-kalvariyskaya-24` могут сосуществовать
- Это intentional design

Одна физическая точка с двумя операторами = ДВЕ записи в `locations`.

### 4.3. Routing: dynamic через Cloudflare Pages Functions

Физические HTML-файлы для локаций НЕ создаются. URL → Pages Function читает Supabase → рендерит шаблон → возвращает HTML. Кеш через Cloudflare Cache API.

### 4.4. Telegram = trust layer

Авторизация через Telegram Login Widget. В БД хранится только `sha256(tg_user_id + salt)`.

В `localStorage` после auth:
- Можно: `user_hash` (sha256, не sensitive)
- Можно: публичные display-поля (`first_name`, `username`, `photo_url`)
- **НЕЛЬЗЯ**: `tg_id`, `hash`, `auth_date`, raw payload

Каждый запрос к Edge Function заново валидирует свежий TG-payload. localStorage не source of auth, только UI state.

### 4.5. Reviews

- Оценка 1-5 звёзд (обязательно)
- До 8 опциональных тегов (4+ / 4-)
- Опциональный комментарий до 280 символов
- До 3 фото (premoderation в V1)

### 4.6. Антифрод — минимальная гигиена

- Cloudflare Turnstile на форме
- Rate limit в Edge Function (1 отзыв/час с одного user_hash)
- UNIQUE (location_id, user_hash), UPSERT при повторе
- Поле `is_visible` для ручного скрытия
- НЕ строим: trust scores, behavioural analysis (V2+)

### 4.7. Photos через signed upload URL

Бинарные данные НЕ проксируются через Edge Function.

Flow:
1. Client → `submit-review-photo-init` → возвращает signed PUT URL для R2 + photo_id
2. Client → PUT signed URL → webp прямо в R2
3. Client → `submit-review-photo-complete` → metadata в `review_photos` (status=pending)
4. Edge Function шлёт уведомление в Telegram-бот

### 4.8. HTML cache через Cloudflare Cache API

Pages Functions используют `caches.default`, не KV. TTL 10 минут, без явного purge в V1. Юзер видит свой отзыв в течение 10 минут — приемлемо.

**Cache + SEO independence:** Cloudflare Cache API НЕ влияет на SEO indexability. Google/Yandex индексируют финальный HTML response, meta tags, canonical tags, structured content. TTL cache влияет только на freshness, не на индексируемость.

В V2+ можно добавить explicit purge через CF API при новом отзыве.

### 4.9. Realtime / Uptime / Parsers — НЕ ДЕЛАЕМ

У операторов нет API. Парсинг fragile. Убираем из V1 полностью.

AI race snapshots остаются как есть (Race Layer, не трогаем).

### 4.10. Security: mandatory escaping

Все user-generated поля **обязаны** проходить `escapeHtml()` перед рендером в template literals:
- `review.comment`
- `review.tags[]`
- `users.first_name`, `username`
- `location.location_name`
- `location.address`, `location.city`

**НЕ использовать `innerHTML`** для user-generated content. Использовать: `escapeHtml()` + template literals, или `textContent`.

**URL safety:** для `href`/`src` разрешать только `https://` и только разрешённые домены (`evrace.by`, `photos.evrace.by`, `telegram.org`). Не доверять URL из БД автоматически.

### 4.11. Counters semantics

`users.reviews_count`, `users.approved_photos_count`, `users.rejected_photos_count`, `users.reports_filed` обновляются через **DB triggers**, не Edge Function counters.

- `reviews_count` ++ на `INSERT reviews` (НЕ на UPDATE / UPSERT update)
- `approved_photos_count` ++ на `UPDATE review_photos` где `moderation_status` стал `approved`
- `rejected_photos_count` ++ аналогично
- `reports_filed` ++ на `INSERT reports`

UPSERT update existing review **не** инкрементирует `reviews_count`. UNIQUE constraint на reports предотвращает дубли.

---

## 5. DATABASE SCHEMA

### 5.1. Миграция 001: locations

```sql
CREATE TABLE locations (
  id bigserial PRIMARY KEY,
  location_key text UNIQUE NOT NULL,
  operator text NOT NULL CHECK (operator IN (
    'batteryfly','forevo','zaryadka','united','csms',
    'malanka','evika','orange','prizma','gto'
  )),
  city text NOT NULL,
  address text NOT NULL,
  location_name text,
  lat numeric(10,7),
  lng numeric(10,7),
  slug text NOT NULL,
  is_active boolean DEFAULT true,
  cached_avg_rating numeric(3,2),
  cached_review_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- ВАЖНО: slug уникален В РАМКАХ ОПЕРАТОРА, не глобально.
  -- /malanka/minsk-kalvariyskaya-24 и /batteryfly/minsk-kalvariyskaya-24
  -- могут сосуществовать (см. секция 4.2).
  CONSTRAINT locations_operator_slug_unique UNIQUE(operator, slug)
);

CREATE INDEX idx_locations_operator ON locations(operator) WHERE is_active = true;
CREATE INDEX idx_locations_city ON locations(city) WHERE is_active = true;
CREATE INDEX idx_locations_rating ON locations(cached_avg_rating DESC NULLS LAST) 
  WHERE is_active = true;

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY locations_public_read ON locations 
  FOR SELECT USING (is_active = true);
```

### 5.2. Миграция 002: generate_location_key

```sql
-- Минимальная функция, БЕЗ нормализации адреса.
-- См. секцию 1.7: address handling intentionally simple.
-- Логика должна 1-в-1 совпадать с JS locationKey() в существующем stations.js.
-- ПРЕЖДЕ чем коммитить — сверь с JS реализацией.

CREATE OR REPLACE FUNCTION generate_location_key(
  p_operator text, 
  p_city text, 
  p_address text
) RETURNS text AS $$
BEGIN
  RETURN lower(trim(coalesce(p_operator, ''))) || '|' || 
         lower(trim(coalesce(p_city, ''))) || '|' || 
         lower(trim(coalesce(p_address, '')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 5.3. Миграция 003: generate_slug

```sql
-- Транслитерация русского адреса в URL-friendly slug.
-- ВАЖНО: после первого создания slug не меняется (см. секция 1.5).
-- Если slug нужно изменить — это manual editorial action в Supabase Studio.

CREATE OR REPLACE FUNCTION generate_slug(
  p_city text,
  p_address text
) RETURNS text AS $$
DECLARE
  v_result text;
BEGIN
  v_result := lower(trim(p_city || '-' || p_address));
  
  -- Двухсимвольные замены ПЕРВЫМИ
  v_result := replace(v_result, 'ж', 'zh');
  v_result := replace(v_result, 'ч', 'ch');
  v_result := replace(v_result, 'ш', 'sh');
  v_result := replace(v_result, 'щ', 'sch');
  v_result := replace(v_result, 'ю', 'yu');
  v_result := replace(v_result, 'я', 'ya');
  v_result := replace(v_result, 'ё', 'yo');
  
  -- Односимвольные через translate
  v_result := translate(v_result,
    'абвгдезийклмнопрстуфхцъыьэ',
    'abvgdeziyklmnoprstufhc_y_e'
  );
  
  -- Очистка
  v_result := regexp_replace(v_result, '[^a-z0-9-]', '-', 'g');
  v_result := regexp_replace(v_result, '-+', '-', 'g');
  v_result := trim(both '-' from v_result);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Проверка перед production:** прогнать функцию на 20+ реальных адресах из существующей `stations`. Доработать transliteration map если есть unmapped chars. Manual QA шаг.

### 5.4. Миграция 004: триггер sync_location_from_station

```sql
-- ВАЖНО: триггер срабатывает на INSERT для создания новой локации,
-- и на UPDATE ТОЛЬКО soft fields (location_name, lat, lng).
-- Identity fields (operator, city, address) НЕ синхронизируются.
-- См. секция 1.5: locations are semi-immutable.

CREATE OR REPLACE FUNCTION sync_location_from_station()
RETURNS trigger AS $$
DECLARE
  v_loc_key text;
  v_loc_id bigint;
  v_slug text;
  v_slug_base text;
  v_slug_counter int := 0;
BEGIN
  v_loc_key := generate_location_key(NEW.operator, NEW.city, NEW.address);
  
  SELECT id INTO v_loc_id FROM locations WHERE location_key = v_loc_key;
  
  IF v_loc_id IS NULL THEN
    -- Создаём новую локацию
    v_slug_base := generate_slug(NEW.city, NEW.address);
    v_slug := v_slug_base;
    
    -- Resolve slug collision ВНУТРИ ОПЕРАТОРА
    WHILE EXISTS (
      SELECT 1 FROM locations 
      WHERE operator = NEW.operator AND slug = v_slug
    ) LOOP
      v_slug_counter := v_slug_counter + 1;
      v_slug := v_slug_base || '-' || v_slug_counter;
    END LOOP;
    
    INSERT INTO locations (
      location_key, operator, city, address, location_name,
      lat, lng, slug
    ) VALUES (
      v_loc_key, NEW.operator, NEW.city, NEW.address, NEW.location_name,
      NEW.lat, NEW.lng, v_slug
    );
  ELSE
    -- Обновляем ТОЛЬКО soft fields
    UPDATE locations SET
      location_name = coalesce(NEW.location_name, locations.location_name),
      lat = coalesce(NEW.lat, locations.lat),
      lng = coalesce(NEW.lng, locations.lng),
      updated_at = now()
    WHERE id = v_loc_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер реагирует ТОЛЬКО на INSERT и UPDATE soft fields.
-- Identity fields НЕ триггерят.
CREATE TRIGGER stations_sync_location
AFTER INSERT OR UPDATE OF location_name, lat, lng
ON stations
FOR EACH ROW EXECUTE FUNCTION sync_location_from_station();
```

### 5.5. Миграция 005: backfill существующих stations

```sql
-- Однократный backfill локаций для существующих stations.
-- ВАЖНО: explicit INSERT SELECT, НЕ UPDATE hack.

INSERT INTO locations (
  location_key, operator, city, address, location_name,
  lat, lng, slug
)
SELECT DISTINCT ON (generate_location_key(operator, city, address))
  generate_location_key(operator, city, address) as location_key,
  operator,
  city,
  address,
  location_name,
  lat,
  lng,
  generate_slug(city, address) as slug
FROM stations
WHERE operator IS NOT NULL 
  AND city IS NOT NULL 
  AND address IS NOT NULL
ORDER BY generate_location_key(operator, city, address), id
ON CONFLICT (location_key) DO NOTHING;

-- Validation:
-- SELECT count(*) FROM locations;
-- SELECT count(DISTINCT generate_location_key(operator, city, address)) FROM stations;
-- Числа должны совпадать.
```

### 5.6. Миграция 006: users

```sql
CREATE TABLE users (
  id bigserial PRIMARY KEY,
  user_hash text UNIQUE NOT NULL,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  
  -- V2+ поля. В V1 counters обновляются через triggers, но trust_level не читается.
  trust_level int DEFAULT 0,
  approved_photos_count int DEFAULT 0,
  rejected_photos_count int DEFAULT 0,
  reviews_count int DEFAULT 0,
  reports_filed int DEFAULT 0,
  last_approved_at timestamptz,
  
  is_banned boolean DEFAULT false,
  banned_at timestamptz,
  banned_reason text
);

CREATE INDEX idx_users_trust ON users(trust_level) WHERE NOT is_banned;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Никаких политик SELECT. Только service_role через Edge Function.
```

### 5.7. Миграция 007: reviews

```sql
CREATE TABLE reviews (
  id bigserial PRIMARY KEY,
  location_id bigint NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  user_hash text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags text[] DEFAULT '{}',
  comment text CHECK (length(comment) <= 280),
  has_geo_verification boolean DEFAULT false,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(location_id, user_hash)
);

CREATE INDEX idx_reviews_location ON reviews(location_id) WHERE is_visible = true;
CREATE INDEX idx_reviews_created ON reviews(created_at DESC) WHERE is_visible = true;
CREATE INDEX idx_reviews_user ON reviews(user_hash) WHERE is_visible = true;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_public_read ON reviews 
  FOR SELECT USING (is_visible = true);
```

**Валидные теги** (хардкод в Edge Function и в UI, не в БД):

Положительные:
- `fast_charge` — Заряжает быстро
- `easy_access` — Удобный подъезд
- `has_amenities` — Есть где провести время
- `covered` — Под навесом

Отрицательные:
- `failed_start` — Не запустилась
- `ice_blocked` — Место занято ДВС
- `slow_charge` — AC зарядка
- `unsafe` — Темно/небезопасно

**Whitelist строгий.** Новые теги добавляются только после согласования с автором. НЕ вводить новые теги по инициативе Cursor.

### 5.8. Миграция 008: triggers для counters и rating

```sql
-- 1. Триггер пересчёта cached_avg_rating и cached_review_count
CREATE OR REPLACE FUNCTION update_location_rating()
RETURNS trigger AS $$
DECLARE
  v_loc_id bigint;
BEGIN
  v_loc_id := coalesce(NEW.location_id, OLD.location_id);
  
  UPDATE locations SET
    cached_avg_rating = (
      SELECT round(avg(rating)::numeric, 2) 
      FROM reviews 
      WHERE location_id = v_loc_id AND is_visible = true
    ),
    cached_review_count = (
      SELECT count(*) 
      FROM reviews 
      WHERE location_id = v_loc_id AND is_visible = true
    ),
    updated_at = now()
  WHERE id = v_loc_id;
  
  RETURN coalesce(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_update_location_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_location_rating();

-- 2. Триггер инкремента users.reviews_count
-- ВАЖНО: только на INSERT, не на UPDATE (UPSERT update не считается)
CREATE OR REPLACE FUNCTION increment_user_reviews_count()
RETURNS trigger AS $$
BEGIN
  UPDATE users 
  SET reviews_count = reviews_count + 1
  WHERE user_hash = NEW.user_hash;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_increment_user_count
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION increment_user_reviews_count();
```

### 5.9. Миграция 009: review_photos

```sql
CREATE TABLE review_photos (
  id bigserial PRIMARY KEY,
  review_id bigint NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  r2_key text NOT NULL,
  r2_url text NOT NULL,
  width int,
  height int,
  size_bytes int,
  
  moderation_status text NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderated_at timestamptz,
  moderation_note text,
  
  -- V2+ поля. В V1 всегда auto_approved=false.
  auto_approved boolean DEFAULT false,
  approved_by text,
  
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_photos_review ON review_photos(review_id) 
  WHERE is_visible = true AND moderation_status = 'approved';
CREATE INDEX idx_photos_moderation ON review_photos(created_at) 
  WHERE moderation_status = 'pending';

ALTER TABLE review_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY photos_public_read ON review_photos
  FOR SELECT USING (is_visible = true AND moderation_status = 'approved');

-- Триггер counters
CREATE OR REPLACE FUNCTION update_user_photo_counts()
RETURNS trigger AS $$
BEGIN
  IF NEW.moderation_status = 'approved' AND OLD.moderation_status != 'approved' THEN
    UPDATE users SET 
      approved_photos_count = approved_photos_count + 1,
      last_approved_at = now()
    WHERE user_hash = (SELECT user_hash FROM reviews WHERE id = NEW.review_id);
  ELSIF NEW.moderation_status = 'rejected' AND OLD.moderation_status != 'rejected' THEN
    UPDATE users SET rejected_photos_count = rejected_photos_count + 1
    WHERE user_hash = (SELECT user_hash FROM reviews WHERE id = NEW.review_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photos_update_user_counts
AFTER UPDATE OF moderation_status ON review_photos
FOR EACH ROW EXECUTE FUNCTION update_user_photo_counts();

-- ВАЖНО про UPSERT reviews:
-- При обновлении review (rating/tags/comment) фото НЕ удаляются.
-- review_photos живёт независимо. ON DELETE CASCADE срабатывает
-- только при физическом DELETE review.
```

### 5.10. Миграция 010: reports

```sql
CREATE TABLE reports (
  id bigserial PRIMARY KEY,
  target_type text NOT NULL CHECK (target_type IN ('review', 'photo')),
  target_id bigint NOT NULL,
  -- NOTE: polymorphic relationship by design.
  -- DO NOT add foreign keys on target_id even if it looks like a "missing constraint".
  
  reporter_hash text NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolution text,
  UNIQUE(target_type, target_id, reporter_hash)
);

CREATE INDEX idx_reports_unresolved ON reports(created_at DESC) WHERE NOT resolved;

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION increment_user_reports_filed()
RETURNS trigger AS $$
BEGIN
  UPDATE users 
  SET reports_filed = reports_filed + 1
  WHERE user_hash = NEW.reporter_hash;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_increment_user_count
AFTER INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION increment_user_reports_filed();
```

---

## 6. EDGE FUNCTIONS

Все живут в `supabase/functions/{name}/index.ts`. Используй TypeScript/Deno (это требование Deno runtime, см. секция 1.2).

Все Edge Functions Infrastructure Layer **НЕ должны** читать Race Layer tables (`ai_snapshots`, `ai_operator_narratives`, `ai_season_feed`).

### 6.1. telegram-auth

**Endpoint:** `POST /functions/v1/telegram-auth`
**Layer:** Infrastructure

**Input:** Telegram Login payload (id, first_name, username, photo_url, auth_date, hash)

**Logic:**
1. Validate Telegram hash: HMAC-SHA256(data_check_string, sha256(bot_token))
2. Check `auth_date` ≤ 24 hours
3. Compute `user_hash = sha256(id + USER_HASH_SALT)`
4. UPSERT в `users`: set `last_seen_at = now()`, increment if new
5. Return `{ user_hash, is_banned }`

**Errors:** 401 invalid hash, 403 expired auth, 403 banned

### 6.2. submit-review

**Endpoint:** `POST /functions/v1/submit-review`
**Layer:** Infrastructure

**Input:** `{ tg_payload, turnstile_token, location_id, rating, tags, comment, has_geo_verification }`

**Logic:**
1. Validate TG hash + auth_date
2. Validate Turnstile (см. существующую submit-vote)
3. Check user not banned
4. Rate limit: SELECT reviews WHERE user_hash=? AND created_at > now() - 1 hour. Если есть — 429.
5. Validate: rating 1-5, tags ⊆ valid set, comment ≤ 280
6. UPSERT в reviews (ON CONFLICT (location_id, user_hash))
7. `users.reviews_count` инкрементируется триггером (только на INSERT)
8. Return `{ review_id, success, was_new: boolean }`

### 6.3. submit-review-photo-init

**Endpoint:** `POST /functions/v1/submit-review-photo-init`
**Layer:** Infrastructure

**Input:** `{ tg_payload, turnstile_token, review_id }`

**Logic:**
1. Validate TG + Turnstile
2. Check review_id принадлежит этому user_hash
3. Check у review < 3 фото
4. Generate UUID для photo
5. Generate signed PUT URL для R2 с key `reviews/{review_id}/{uuid}.webp` (TTL 10 минут)
6. INSERT в review_photos (status=pending, без width/height/size пока)
7. Return `{ photo_id, upload_url, expires_in: 600 }`

### 6.4. submit-review-photo-complete

**Endpoint:** `POST /functions/v1/submit-review-photo-complete`
**Layer:** Infrastructure

**Input:** `{ tg_payload, photo_id, width, height, size_bytes }`

**Logic:**
1. Validate TG
2. Check photo принадлежит user через review
3. UPDATE review_photos: set width, height, size_bytes
4. Send notification to Telegram bot (admin chat) с превью URL + кнопки approve/reject
5. Return `{ status: 'pending' }`

### 6.5. submit-report

**Endpoint:** `POST /functions/v1/submit-report`
**Layer:** Infrastructure

**Input:** `{ tg_payload, turnstile_token, target_type, target_id, reason }`

**Logic:**
1. Validate
2. INSERT (UNIQUE check защищает от дублей)
3. `users.reports_filed` инкрементируется триггером
4. Send TG notification to admin
5. Return `{ report_id }`

### 6.6. moderate-photo (bot-only)

**Endpoint:** `POST /functions/v1/moderate-photo`
**Layer:** Infrastructure

**Auth:** `x-admin-secret` header check (не TG-auth)

**Input:** `{ photo_id, decision: 'approve'|'reject', note?: string }`

**Logic:**
1. Check admin secret
2. UPDATE review_photos: moderation_status, moderated_at, moderation_note, approved_by='admin'
3. `users.approved_photos_count` / `rejected_photos_count` инкрементируется триггером
4. Return updated photo

### 6.7. get-location (aggregate endpoint)

**Endpoint:** `GET /functions/v1/get-location?slug={slug}&operator={operator}`
**Layer:** Infrastructure

**КРИТИЧНО:** этот endpoint возвращает **ВСЁ** для рендера страницы локации одним JSON response. Pages Function делает ровно ОДИН fetch к Supabase.

Если потребуются дополнительные данные — расширяй этот endpoint, **не добавляй второй endpoint**.

**Infrastructure-only:** этот endpoint **НЕ** читает `ai_snapshots`, `ai_operator_narratives`, `ai_season_feed`.

**Logic:**
1. SELECT location WHERE operator=? AND slug=? AND is_active=true
2. SELECT stations WHERE generate_location_key(...) = location.location_key
3. SELECT reviews (last 20 visible) WHERE location_id = location.id, ORDER BY created_at DESC
4. SELECT photos (approved, visible) WHERE review_id IN (...)
5. SELECT top-3 nearby locations:
   - В том же городе
   - ВСЕХ операторов (не только текущего — это infrastructure navigation, не operator silo)
   - ORDER BY distance, потом cached_avg_rating
6. Compute tag aggregation (см. 9.7):
   - SELECT unnest(tags) as tag, count(*) FROM reviews WHERE location_id=? AND is_visible GROUP BY tag ORDER BY count DESC
7. Return aggregate JSON

Если location не найдена — 404.

---

## 7. CLOUDFLARE PAGES FUNCTIONS (ROUTING)

### 7.1. Setup

Создать директорию `functions/` в корне репозитория. Cloudflare Pages автоматически подхватит.

### 7.2. Файл functions/[operator]/[slug].js

```javascript
// functions/[operator]/[slug].js
//
// INFRASTRUCTURE PLATFORM PAGE
// NOT race layer.
//
// This page must remain fully valid independently
// from EV RACE tournament existence.
//
// Do NOT import/query/render:
// - ai_snapshots
// - ai_operator_narratives
// - ai_season_feed
// - tournament logic
// - season rankings
// - countdowns
// - "вклад в сеть" / progress bars
// - "установлено во время EV RACE"
//
// See spec section 2: Infrastructure Platform vs Race Section.

export async function onRequest(context) {
  const { params, env, request } = context;
  
  // URL normalization
  const operator = params.operator.toLowerCase();
  const slug = params.slug.toLowerCase().replace(/\/+/g, '/').replace(/\/$/, '');
  
  const validOps = ['batteryfly','forevo','zaryadka','united','csms',
                    'malanka','evika','orange','prizma','gto'];
  if (!validOps.includes(operator)) {
    return render404();
  }
  
  // Try Cloudflare Cache API (НЕ KV)
  const cache = caches.default;
  let response = await cache.match(request);
  if (response) {
    return response;
  }
  
  // ONE fetch к aggregate endpoint
  const apiUrl = `${env.SUPABASE_URL}/functions/v1/get-location?slug=${slug}&operator=${operator}`;
  const apiResp = await fetch(apiUrl, {
    headers: { 'apikey': env.SUPABASE_ANON_KEY }
  });
  
  if (!apiResp.ok) {
    return render404();
  }
  
  const data = await apiResp.json();
  
  // Render HTML через template literals. БЕЗ JSX, БЕЗ template engines.
  const html = renderLocationPage(data);
  
  response = new Response(html, {
    headers: { 
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=600'
    }
  });
  
  context.waitUntil(cache.put(request, response.clone()));
  return response;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

function isAllowedUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const allowedHosts = ['evrace.by', 'photos.evrace.by', 'telegram.org'];
    return allowedHosts.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

function render404() {
  return new Response(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex">
  <title>Локация не найдена — EVRACE.BY</title>
  <link rel="stylesheet" href="/CSS/arcade.css">
</head>
<body>
  <p>Такой локации в нашем реестре нет.</p>
  <p><a href="/stations.html">Смотреть все станции</a></p>
</body>
</html>`, { 
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}
```

### 7.2.1. Canonical URL policy

Каждая location page ОБЯЗАНА иметь canonical URL:

```html
<link rel="canonical" href="https://evrace.by/{operator}/{slug}">
```

Правила:
- Без query params
- Без trailing slash
- Только lowercase
- Canonical всегда один и тот же для данной location identity
- URL строится **из БД** (`locations.operator + '/' + locations.slug`), не из request URL

Примеры:
- ✅ `https://evrace.by/malanka/minsk-kalvariyskaya-24`
- ❌ `https://evrace.by/malanka/minsk-kalvariyskaya-24/`
- ❌ `https://evrace.by/malanka/minsk-kalvariyskaya-24?theme=dark`
- ❌ `https://evrace.by/MALANKA/Minsk-Kalvariyskaya-24`

Если request URL не совпадает с canonical:
- Допустим soft render без redirect в V1
- Canonical tag всё равно указывает canonical identity URL

В V2+: можно добавить 301 redirect для совсем кривых URL.

### 7.2.2. 404 handling

При несуществующей локации:
- HTTP status = 404
- HTML response содержит `<meta name="robots" content="noindex">`
- Минимальный header, ссылка на `/stations.html`
- БЕЗ race-content
- Реализация — см. `render404()` выше

### 7.2.3. URL normalization

Pages Function нормализует:
- uppercase → lowercase
- multiple slashes → single
- trailing slash → удалить

В V1 — soft canonicalization через canonical tag. В V2+ — можно добавить 301 redirect.

### 7.3. Cache invalidation в V1

В V1 не делаем явный purge. TTL 10 минут. Юзер видит свой отзыв через 10 минут — приемлемо.

V2+: при `submit-review` можно вызывать CF API `purge_cache`. Требует `CF_API_TOKEN` и `CF_ZONE_ID`.

---

## 8. SEO / SITEMAP / SHARING

### 8.1. Sitemap priority

Location pages — **primary SEO assets** Infrastructure Platform.

В `sitemap.xml`:

```xml
<!-- Infrastructure Layer: HIGH priority -->
<url>
  <loc>https://evrace.by/stations.html</loc>
  <priority>0.9</priority>
  <changefreq>daily</changefreq>
</url>
<url>
  <loc>https://evrace.by/map.html</loc>
  <priority>0.9</priority>
  <changefreq>daily</changefreq>
</url>
<url>
  <loc>https://evrace.by/malanka/minsk-kalvariyskaya-24</loc>
  <priority>0.8</priority>
  <changefreq>weekly</changefreq>
</url>

<!-- Race Layer: LOWER priority -->
<url>
  <loc>https://evrace.by/tour.html</loc>
  <priority>0.5</priority>
  <changefreq>daily</changefreq>
</url>
```

Причина: location pages = evergreen infrastructure content. Race pages = seasonal media content.

Sitemap генерится автоматически через GitHub Actions cron (раз в сутки запрос в Supabase → генерация → коммит).

### 8.2. Open Graph для location pages

В `<head>` каждой location page:

```html
<meta property="og:type" content="place">
<meta property="og:title" content="ТЦ Корона — зарядка от Malanka">
<meta property="og:description" content="DC 160 кВт, CCS/GBT, ★ 4.6 (23 отзыва). Минск, Кальварийская 24.">
<meta property="og:url" content="https://evrace.by/malanka/minsk-kalvariyskaya-24">
<meta property="og:image" content="https://photos.evrace.by/og/{location_id}.webp">
<meta property="og:locale" content="ru_BY">
<meta property="og:site_name" content="EVRACE.BY">

<meta name="twitter:card" content="summary_large_image">
```

**og:image:** в V1 — если есть approved фото → его URL; если нет → дефолтный `https://evrace.by/og-location-default.png`.

**Запрещено в OG:**
- ❌ Race graphics
- ❌ Tournament branding overlays
- ❌ Rankings, countdowns
- ❌ "Лидер сезона"
- ❌ Competition semantics

Location social preview должен выглядеть как infrastructure utility, не как race-media card.

### 8.3. Cache + SEO independence

Cloudflare Cache API НЕ влияет на SEO. Google/Yandex индексируют финальный HTML output: meta tags, canonical, structured content. TTL влияет только на freshness.

Location pages — полноценные SEO pages несмотря на edge caching и dynamic rendering.

---

## 9. UI / FRONTEND

### 9.1. Главный принцип

Location page **НЕ** проектируется как новая система или dashboard. Это развитие существующего arcade/Tesla visual language, переключённое в infrastructure-oriented режим.

**НЕ делать:**
- Redesign всего сайта
- Dashboard / admin-feel UI
- Startup SaaS aesthetic
- Glassmorphism, neumorphism
- React-like component thinking

**Делать:**
- Развить arcade/Tesla стиль из существующих страниц
- Сохранить ощущение единого ecosystem
- Но контент — infrastructure-only

### 9.2. Visual hierarchy (КРИТИЧНО)

Identity layer **визуально доминирует** над technical layer.

Сначала пользователь видит:
- Рейтинг
- Название места
- Адрес
- Фото
- Карту
- Nearby infrastructure

Только потом:
- Таблицы станций
- Мощности
- Типы коннекторов

**Тест:** если технический блок занимает больше экранного пространства чем identity card → UX неправильный.

### 9.3. Структура страницы (desktop)

Структура (сверху вниз):

1. **Header** — общий header сайта (тот же что в existing pages). Race-семантика в header допустима, но **не транслируется внутрь страницы**

2. **Хлебные крошки** — `Главная > Операторы > {Оператор} > {Город} > {Улица}`

3. **Identity card** (PRIMARY visual block):
   - Логотип оператора + название
   - Город (большой)
   - Адрес
   - Координаты + кнопка copy
   - Рейтинг (большая цифра + звёзды + counter отзывов/фото)
   - Карта (компактно справа)
   - Кнопки: МАРШРУТ, ПОДЕЛИТЬСЯ
   - Дата запуска (как infrastructure fact)

4. **Stations summary** (SECONDARY block, compact):
   - Если станция одна — интегрирована в identity card
   - Если несколько — отдельная сводка:
     - DC count, AC count
     - Всего коннекторов
     - Макс. мощность
     - Одновременно авто
   - Ниже — детальная таблица (тип, мощность, разъёмы, кол-во)
   - Дата запуска, оператор

5. **Фото локации** (галерея, до 12 видимых, остальные по кнопке)

6. **Tag aggregation block** (на основе отзывов) — см. 9.7

7. **Status placeholder** (для V2+) — "Скоро: live данные онлайн"

8. **Reviews / Полевые отчёты**:
   - Сортировка: НОВЫЕ / ПО РЕЙТИНГУ
   - Карточки отзывов: аватар (TG-style), имя, дата, звёзды, теги, текст, фото, "Полезно N", "Ответить"
   - Pagination: первые 20 → кнопка "Показать ещё"

9. **Форма отправки отзыва** (sidebar или collapsible):
   - "Войти через Telegram" (если не авторизован)
   - После auth — форма (звёзды, теги, comment, фото)

10. **Nearby infrastructure** — топ-3 ближайших локаций в том же городе, ВСЕХ операторов, с расстоянием и рейтингом

11. **Кнопка "Смотреть все локации {оператора}"** — infrastructure navigation

12. **Footer** — общий, без race-counter

### 9.4. Mobile layout (380px baseline)

Mobile — обязательный baseline. Перестановка блоков:

```
1. Header (mobile burger menu)
2. Хлебные крошки (horizontal scroll если длинные)
3. Identity card:
   - logo + название
   - адрес
   - звёзды + counter
   - [МАРШРУТ →] [ПОДЕЛИТЬСЯ]
4. Карта (full-width, под identity)
5. Stations summary (2×2 или 2×3 grid вместо 5 в ряд)
6. Stations table (horizontal scroll ИЛИ карточки)
7. Фото — carousel (slide horizontal) вместо grid
8. Tag aggregation (wrap chips, не grid)
9. Status placeholder
10. Reviews (1 column)
11. Форма (sticky button или collapsed → expand)
12. Nearby (vertical list)
13. Footer
```

Mobile-specific решения:
- Карта переезжает **под** identity card
- Сводка станций — компактно
- Таблица — горизонтальный скролл или карточки (см. stations.html паттерн)
- Фото — carousel
- Никаких 3-column layouts

### 9.5. Что НЕ должно быть на странице (повторно для ясности)

- ❌ Countdown'ы
- ❌ Tournament rankings
- ❌ AI narratives из `ai_operator_narratives`
- ❌ "AI-сводка по локации", "Все AI-анализы"
- ❌ "Установлена во время EV RACE 2026"
- ❌ "Вклад в расширение сети — X%"
- ❌ Progress bars операторов
- ❌ "1010 станций до 31.12.2026"
- ❌ "Гонка продолжается"
- ❌ Race-counter в footer
- ❌ Race-driven CTA
- ❌ Любая race-семантика

### 9.6. Pagination отзывов

**Pattern: `LIMIT 20 OFFSET X` с кнопкой "Показать ещё"**

НЕ использовать:
- "Показать всё" с полным DOM рендером
- Infinite scroll
- Cursor pagination
- Realtime streams
- Virtualized lists
- Client-side pagination frameworks

Логика: первые 20 → клик "Показать ещё" → +20 → и т.д. Каждый клик = новый fetch с OFFSET.

Mobile-first reason: фото + потенциально длинные комментарии = тяжёлый full-render.

### 9.7. Tag aggregation block (обязательный элемент)

На странице локации между блоком станций и отзывами — **агрегатор тегов**:

```
ТЕГИ (на основе отзывов)

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ⚡ Заряжает  │ │ 🚗 Удобный   │ │ ☕ Есть где  │
│ быстро       │ │ подъезд      │ │ провести     │
│              │ │              │ │ время        │
│      12      │ │      11      │ │      7       │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ☂ Под        │ │ ❌ Место     │ │ 🐢 AC зарядка │
│ навесом      │ │ занято ДВС   │ │ зарядка      │
│              │ │              │ │              │
│      6       │ │      3       │ │      2       │
└──────────────┘ └──────────────┘ └──────────────┘
```

**Логика:**
- Берётся из `get-location` (SELECT unnest(tags), count(*) GROUP BY tag)
- Положительные теги — зелёная рамка
- Отрицательные теги — красная рамка
- Сортировка по count DESC
- Не показывать теги с count = 0
- Если отзывов < 3 — не показывать блок вовсе ("недостаточно данных")

Это самый ценный сигнал для EV-водителя в один взгляд — что говорит community про эту локацию.

**Whitelist строгий** (см. 5.7). Новые теги — только после согласования.

### 9.8. Nearby infrastructure block

Блок "Рядом":
- Топ-3 ближайших локации в том же городе
- **ВСЕХ операторов**, не только текущего
- Сортировка: distance, потом rating
- Показывать: логотип оператора, адрес, расстояние (км), рейтинг

Это **infrastructure navigation**, не operator silo. Страница не должна замыкать пользователя внутри одного оператора.

Отдельно — кнопка "Смотреть все локации {текущий_оператор}" для пользователей, которым нужна именно operator-навигация.

### 9.9. Три темы

Все стили — в существующих `CSS/arcade.css`, `CSS/tesla-light.css`, `CSS/tesla-dark.css`. Новые классы добавляются во все три синхронно.

Новые классы (примерно):
- `.location-card`, `.location-stars`, `.location-rating-big`
- `.stations-summary`, `.stations-summary-cell`
- `.stations-table`
- `.review-list`, `.review-item`, `.review-card`
- `.review-tags`, `.tag-positive`, `.tag-negative`
- `.review-form`, `.tag-checkbox`
- `.photo-gallery`, `.photo-thumb`, `.photo-carousel` (mobile)
- `.rating-distribution`, `.rating-bar`
- `.nearby-list`, `.nearby-item`
- `.tag-aggregation`, `.tag-agg-cell`
- `.status-placeholder` (для V2+ live status)
- `.location-map`

Стиль — следовать существующим паттернам (карточки в `stations.html`, форма в `letters.html`).

### 9.10. Mockup как visual reference

Прикреплённый файл `docs/location_page_mockup.png` — visual direction для implementation.

**Сильные стороны mockup, которые сохраняются:**
- Identity card сверху с большим рейтингом
- Карта справа от identity (desktop)
- Compact stations summary (5 цифр)
- Stations table компактно
- Photo gallery 3×N grid
- Tag aggregation block (см. 9.7)
- Status (скоро) placeholder
- Полевые отчёты с сортировкой
- TG Login на видном месте справа
- Nearby locations с другими операторами

**Что должно быть удалено из mockup перед implementation:**
- ❌ Блок "Установлена во время EV RACE 2026 / Вклад в расширение сети Malanka 2.1% / Добавлена 08.07.2024" — целиком всю строку
- ❌ AI-сводку по локации (внизу)
- ❌ Кнопку "Все AI-анализы →"
- ❌ Footer "1010 станций до 31.12.2026 — гонка продолжается" → заменить на нейтральный
- ❌ Дубль даты "ДОБАВЛЕНА 08.07.2024" если она дублирует "ДАТА ЗАПУСКА"

После удаления race-элементов — mockup принимается как visual direction.

### 9.11. Интеграция в existing pages

**ВАЖНО:** см. секция 1.4 — existing pages legacy-stable. Только surgical additions.

**stations.html:**
- В существующий Supabase запрос добавить JOIN с locations по location_key:
  ```sql
  SELECT s.*, l.cached_avg_rating, l.cached_review_count, l.slug as location_slug
  FROM stations s
  LEFT JOIN locations l ON l.location_key = generate_location_key(s.operator, s.city, s.address)
  ```
- На карточке станции / в строке таблицы: добавить звёзды (если `cached_review_count > 0`) и ссылку `<a href="/{operator}/{slug}">` на страницу локации
- **БЕЗ runtime aggregation** на клиенте. Source of truth = `locations.cached_avg_rating`

**map.html:**
- В попапе маркера: добавить звёзды + ссылку "Подробнее →"
- Без переписывания popup logic

**index.html:**
- В существующем виджете голосования (если есть) — добавить звёзды
- НЕ ломать существующий функционал

### 9.12. Security: escapeHtml + URL safety

Все user-generated поля **обязаны** проходить `escapeHtml()`:
- `review.comment`
- `review.tags[]` (даже из whitelist — для consistency)
- `users.first_name`, `username`
- `location.location_name`
- `location.address`, `location.city`

НЕ использовать `innerHTML` для UGC. Использовать `escapeHtml()` + template literals, или `textContent`.

URL safety: для `href`/`src` — только `https://` + разрешённые домены (`evrace.by`, `photos.evrace.by`, `telegram.org`).

### 9.13. Telegram Login Widget

На странице локации:
```html
<script async src="https://telegram.org/js/telegram-widget.js?22" 
        data-telegram-login="evrace_by_bot"
        data-size="medium"
        data-onauth="onTelegramAuth(user)"
        data-request-access="write"></script>
```

JS handler (vanilla):
```javascript
async function onTelegramAuth(user) {
  const resp = await fetch('/api/telegram-auth', { 
    method: 'POST', 
    body: JSON.stringify(user) 
  });
  const { user_hash, is_banned } = await resp.json();
  
  if (is_banned) {
    showMessage('Аккаунт заблокирован');
    return;
  }
  
  // localStorage: ТОЛЬКО публичные display поля + user_hash.
  // НЕ сохраняем: id, hash, auth_date, raw payload (см. секция 4.4).
  localStorage.setItem('ev_user_hash', user_hash);
  localStorage.setItem('ev_user_display', JSON.stringify({
    first_name: user.first_name,
    username: user.username,
    photo_url: user.photo_url
  }));
  
  showReviewForm();
}
```

**Перед UI deploy:** автор должен выполнить `/setdomain` у `@BotFather` для `evrace.by`.

---

## 10. TELEGRAM BOT EXTENSIONS

Существующий `@evrace_by_bot` расширяется. Webhook → Edge Function.

### 10.1. Admin commands

- `/queue` — показать первые 5 photos pending. Inline buttons `[✓ Approve] [✗ Reject]`
- `/queue_count` — счётчик pending photos
- `/reports` — открытые жалобы
- `/ban {user_hash}` — забанить юзера (все его reviews → is_visible=false)

### 10.2. Callback handling

Callback format: `mod:approve:{photo_id}` / `mod:reject:{photo_id}`

Bot webhook → Edge Function `moderate-photo` с admin secret.

### 10.3. Auto notifications

При INSERT в `review_photos` → автоуведомление админу с превью R2 URL + кнопки.
При INSERT в `reports` → уведомление админу.

---

## 11. ЭТАПЫ ВНЕДРЕНИЯ

Каждый этап — независимый PR. Можно остановиться после любого. Между этапами — деплой и тестирование на production.

### Этап 1 — Locations layer (без UI)

**Делаем:**
- Миграции 001-005 (locations с UNIQUE(operator, slug), generate_location_key, generate_slug, sync trigger, backfill)
- Sanity check: validate transliteration на 20+ реальных адресах

**DoD:**
- В Supabase Studio: таблица locations со всеми существующими локациями
- `count(locations) = count(DISTINCT location_key from stations)`
- Создание новой station автоматически создаёт/обновляет location
- UPDATE identity полей в stations НЕ триггерит location update
- Existing сайт работает БЕЗ изменений
- Тестовая транслитерация — slugs приемлемы

**Срок:** ~2-3 дня

### Этап 2 — Location pages (read-only, без reviews)

**Делаем:**
- Edge Function `get-location` (aggregate endpoint, Infrastructure-only)
- Pages Function `functions/[operator]/[slug].js` с header comment про Infrastructure Platform
- HTML template (3 темы) — template literals, БЕЗ frameworks
- Identity card + stations summary + map + photos placeholder
- Canonical URL + OG tags + 404 handling
- escapeHtml + URL safety
- Sitemap.xml обновлён (priority 0.8 для locations)
- Ссылки из stations.html на страницы локаций (звёзды появятся в этапе 3)
- Yandex.Metrika на новых страницах

**DoD:**
- `https://evrace.by/malanka/minsk-kalvariyskaya-24` отдаёт корректный HTML
- Canonical URL присутствует и правильный
- OG tags корректные
- 404 для несуществующих URL с noindex
- 3 темы работают, mobile-first OK на 380px
- Cloudflare Cache API кеширует
- Page passes "2027 test" — не содержит race-семантики
- Existing pages не сломаны
- Yandex Webmaster показывает индексацию через 1-2 недели
- Performance budget: критический CSS+JS ≤ 150kb gzipped

**Срок:** ~5 дней

### Этап 3 — Reviews & Ratings

**Делаем:**
- Миграции 006-008 (users, reviews, triggers)
- Edge Functions: telegram-auth, submit-review, submit-report
- TG Login Widget на странице локации
- UI: форма отзыва, список с pagination (LIMIT 20 OFFSET), tag aggregation block
- Антифрод: Turnstile + rate limit + UNIQUE
- escapeHtml для всех UGC полей
- Звёзды на stations.html (через JOIN, не runtime aggregation)
- Звёзды в map.html popup

**DoD:**
- Юзер логинится через TG, в БД есть user_hash (без PII)
- Юзер оставляет отзыв, видит на странице (после TTL 10 мин)
- Повторный отзыв — UPSERT, reviews_count НЕ инкрементируется
- cached_avg_rating пересчитывается триггером
- Tag aggregation block работает (с whitelist тегов)
- Rate limit работает
- Подмена TG hash → 403
- localStorage: только user_hash + display поля
- Pagination "Показать ещё" работает

**Срок:** ~7 дней

### Этап 4 — Photos

**Делаем:**
- Миграция 009 (review_photos + триггеры counters)
- Cloudflare R2 bucket setup
- Edge Functions: submit-review-photo-init, submit-review-photo-complete, moderate-photo
- Client-side: resize → 1600px max, webp, EXIF strip (canvas re-encode)
- Signed upload URL flow (НЕ proxy binary)
- Telegram bot: /queue, callback handlers
- UI: загрузка в форме, photo gallery на странице, lightbox, carousel на mobile

**DoD:**
- Юзер загружает фото через signed URL прямо в R2
- В TG приходит уведомление с превью
- После approve — фото видно (после cache TTL)
- После reject — скрыто
- EXIF полностью вырезан (verify exiftool)
- Размер ≤ 1MB после client processing
- Только webp принимается
- users counters инкрементируются триггерами

**Срок:** ~5 дней

### V2+ (не делаем сейчас)

Бэклог:
- Adaptive moderation (auto-approve trusted users по trust_level)
- Community flagging UI
- Live status (аншлаг, очередь) — заполнит status placeholder
- Geo-verification badges
- Поиск по локациям
- Сравнение локаций
- Аналитика загруженности
- Explicit cache purge при новом отзыве
- 301 redirects для не-canonical URL

---

## 12. ENVIRONMENT & SECRETS

### 12.1. Supabase Edge Functions

```
SUPABASE_URL=https://uvrboxrddqlasgrnnnne.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<auto>
SUPABASE_ANON_KEY=<public>

TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_ADMIN_CHAT_ID=<Artsiom's TG user id>

USER_HASH_SALT=<32 random chars, generated ONCE, NEVER rotate>

TURNSTILE_SECRET_KEY=0x4AAAAAACtvG1NiGomWUrk5So9rrTxsLAw

CLOUDFLARE_R2_ACCESS_KEY_ID=<from CF dashboard>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<from CF dashboard>
CLOUDFLARE_R2_BUCKET=evrace-photos
CLOUDFLARE_R2_ACCOUNT_ID=<from CF dashboard>
CLOUDFLARE_R2_PUBLIC_URL=https://photos.evrace.by

ADMIN_SECRET=<32 random chars, для TG bot → moderate-photo>
```

### 12.2. Cloudflare Pages env

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### 12.3. R2 Setup

- Bucket: `evrace-photos`
- Custom domain: `photos.evrace.by`
- CORS: allow GET от `evrace.by`, allow PUT с signed URL

### 12.4. @BotFather

- `/setdomain` → `evrace.by`
- Webhook для @evrace_by_bot → endpoint для команд

---

## 13. ОТКРЫТЫЕ ВОПРОСЫ — УТОЧНИТЬ ПЕРЕД ЭТАПОМ 3

1. **USER_HASH_SALT:** генерируется один раз, НИКОГДА не ротируется. Кто генерирует, где хранит копию?

2. **TG Login `/setdomain`:** автор должен сам выполнить через @BotFather. Подтвердить готовность.

3. **R2 custom domain:** `photos.evrace.by` или дефолтный `r2.dev`?

4. **Backfill validation:** после миграции 005 — посмотреть 10-20 локаций. Slugs ок?

5. **Distribution chart на странице локации:** показывать при N≥5 отзывах или с 1-го?

6. **Browser geolocation в V1:** запрашиваем (optional) или откладываем до V2?

7. **og:image default:** создать дефолтную картинку `og-location-default.png` или генерировать на лету в V2+?

---

## 14. РАБОТА С АВТОРОМ — РЕЗЮМЕ

- **ДЕЛАЙ** = триггер изменений
- Surgical edits only
- Накапливать → коммитить пакетом
- Свежие файлы из repo
- Сомнения → спросить, не догадываться
- Русский язык во всех коммуникациях
- При любой работе с location pages — проверять по чеклисту секции 2.6 (3 вопроса)
- Применять "тест 2027" к каждому новому элементу
- Mockup `docs/location_page_mockup.png` — visual direction, но race-элементы из него убраны (см. 9.10)
- Соблюдать все правила секции 15 (CURSOR ANTI-ENTROPY RULES)

---

## 15. CURSOR ANTI-ENTROPY RULES

**Эти правила определяют поведение AI-агента при работе с проектом. Они дополняют архитектурные ограничения секций 1-2 и применяются ко всем этапам работы.**

### 15.1. No abstraction-before-need

**НЕ создавать преждевременные абстракции:**

- Generic render engines
- Universal card systems
- Reusable infrastructure frameworks
- Config-driven UI
- Dynamic schema renderers
- "Универсальные" компоненты для location card + station card + nearby card

**Правило 3-х use cases:** прежде чем создавать абстракцию — должно быть минимум **3 реальных** места применения. Не "вот это похоже на то — давай объединим", а явная необходимость.

**Предпочтительно:**
- Явный код
- Понятный HTML
- Duplication acceptable
- Locality over abstraction

**Тест:** дубль 50 строк HTML лучше чем абстракция на 200 строк. Если Cursor хочет создать "универсальный компонент" — стоп, спросить автора.

### 15.2. No silent refactors

Cursor **запрещено** делать "по пути" следующие изменения, даже если они "улучшают" код:

- Reformatting unrelated files
- Sorting imports
- Renaming variables
- Changing quote style (`"` ↔ `'`)
- Replacing `var`/`let`/`const` без причины
- Добавление JSDoc-комментариев в существующий код
- "Cleanup", "tidy up", "modernize"
- Косметические правки форматирования
- Изменение порядка функций

**Правило:** если правка не относится **напрямую** к задаче — не трогать. Открыл файл, чтобы добавить одну строку — добавил одну строку и закрыл.

Это критично для review-flow: автор должен видеть **только то, что реально изменилось по задаче**, без шума из 200 cosmetic-правок.

### 15.3. DOM stability

**НЕ ломать** существующую DOM-структуру:

- Existing CSS selectors
- Existing element IDs
- Current `stations.html` structure
- Map popup structure
- HTML классы в существующих страницах
- Структуру форм в `letters.html`

**Причина:** DOM может зависеть от:
- Yandex.Metrika (настроенные цели по selectors)
- CSS, который завязан на конкретные id/классы
- Будущие интеграции (embed-виджеты, parsers, screen readers)
- A/B тесты (если появятся)
- Browser extensions, accessibility tools

**Правило:** если DOM элемент существует — его структура неизменна, кроме явной просьбы автора. Можно **ДОБАВЛЯТЬ** новые элементы рядом. Нельзя **переименовывать или переструктурировать** существующие.

### 15.4. Performance budget

Location page имеет жёсткий budget:

- **Критический CSS+JS ≤ 150kb gzipped**
- No hydration
- No runtime frameworks
- No client-side routing
- Max 1 aggregate fetch к Supabase (`get-location`)
- Никаких дополнительных JS-библиотек "на всякий случай"

Если задача требует превышения budget — остановиться и спросить автора.

**Mobile-first reason:** в Беларуси не везде fiber. 3G/4G трафик. 150kb gzipped — это разумная нагрузка для быстрого открытия страницы на мобильном.

### 15.5. AI-generated code skepticism

Cursor **ОБЯЗАН** относиться скептически к собственному коду:

- **Проверять SQL руками** перед запуском миграций. Не "это выглядит правильно" — а явно прочесть и понять.
- **Не invent tables/functions** которых нет в этом ТЗ. Если не уверен — спросить.
- **Не hallucinate Supabase APIs.** Реальные методы — в официальной документации, не в "общих знаниях".
- **Не invent R2 API methods.** R2 это S3-compatible, но не полностью. Проверять что метод реально существует.
- **Не добавлять "best practices"** вне ТЗ. Если в ТЗ нет audit log — не создавать audit log. Если в ТЗ нет soft delete — не добавлять soft delete.
- **Не угадывать имена полей в БД** — читать миграции.

**Правило:** если чего-то нет в spec — **спросить автора**. Не додумывать. Не "сделаю как обычно делают". Не "это стандартная практика".

### 15.6. Verbose tool usage — transparency over speed

Cursor работает в **consultant mode**, не в autonomous agent mode:

- **Перед запуском любой SQL миграции** — показать её автору и дождаться слова **ДЕЛАЙ**
- **Перед созданием Edge Function** — показать структуру и контракт, дождаться подтверждения
- **Перед изменением existing файла** — показать diff, дождаться ДЕЛАЙ
- **После завершения задачи** — кратко резюмировать что сделано и куда положено
- **При неуверенности на любом шаге** — остановиться и спросить, а не угадать

**Это противоположность "agent mode"** где AI сам решает что нужно и делает. Для этого проекта подходит **consultant mode**: показывает план → ждёт ДЕЛАЙ → выполняет → отчитывается.

Это правило **усиливает** workflow с триггер-словом ДЕЛАЙ (секция 14).

Скорость работы — не приоритет. Приоритет — **предсказуемость и контроль автора над каждым изменением**.

---

КОНЕЦ СПЕЦИФИКАЦИИ v2.1.3 (FINAL)
