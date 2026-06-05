# SEO-A / SEO-B — зафиксированные решения

**Дата:** 2026-06-05  
**Статус SEO-A:** **ЗАКРЫТ** (production verified 2026-06-05)  
**Коммиты:** `4105b64` … `8caf522` (`parentOrganization`)  
**Следующий трек:** **SEO-B** (sitemap → map → stations). **Platform** — после SEO-B.

---

## Терминология

| Блок | Содержание |
|------|------------|
| **SEO-A** | Карточка локации: Schema, terminology, power, H1, description, JSON-LD |
| **SEO-B** | Индексация и связность: dynamic sitemap → `map.html` → location → `stations.html` → location |
| **Platform** (бывш. Stage 3) | Reviews, Ratings, Photos, Tags, Community — не SEO, а продукт |

SEO-B — **не** «инфраструктурные задачи» в смысле backend. Это **фундаментальная часть SEO и индексации**. Для EV RACE linking + sitemap могут быть **важнее JSON-LD**.

---

## Принцип: sitemap перед отзывами

> Не начинать отзывы раньше sitemap.

При выборе **Отзывы** vs **Sitemap** — **sitemap каждый раз**.

Отзыв без индексации никто не найдёт. Хорошая индексация потом сама притянет отзывы.

**Цель:** к моменту запуска отзывов поисковики уже видят **полноценную сеть взаимосвязанных location pages**, а не набор изолированных URL.

---

## SEO-A — три P0 (закрытие блока)

### P0-1. Schema fix

> **SUPERSEDED (Phase A):** EVCS STOP. Миграция на `LocalBusiness` — [`PHASE-A-VERIFICATION-REPORT.md`](PHASE-A-VERIFICATION-REPORT.md).

~~Schema EVCS~~ → **Schema Migration (Phase A)** — отдельный gate от SEO-A Core.

Убрать с `WebPage`:

```json
"mainEntity": { "@id": "...#evcs" }
```

Добавить на `ElectricVehicleChargingStation`:

```json
"mainEntityOfPage": { "@id": "https://evrace.by/{operator}/{slug}" }
```

`@graph`: `WebPage` + `ElectricVehicleChargingStation` + `BreadcrumbList`.

**Приёмка:**

```text
validator.schema.org — 0 errors, 0 warnings
```

На **нескольких** production URL. Ни одной schema-ошибки перед публичным релизом.

---

### P0-2. AC terminology cleanup

**Запрещено везде в проекте:** устаревший slow-AC термин в user-facing copy (см. стандарт UI ниже).

**Стандарт UI (предпочтительно):**

```text
AC — ЗАРЯДКА ПЕРЕМЕННЫМ ТОКОМ
```

Допустимо: `AC — ПЕРЕМЕННЫЙ ТОК`.

**Description contract** (meta / og / JSON-LD description only):

| `station_type` | Intro |
|----------------|-------|
| DC | Быстрая зарядная станция … |
| ACDC | Быстрая зарядная станция … |
| AC (pure) | Зарядная станция переменного тока … |

**Приёмка:**

```bash
node scripts/check-ac-terminology.mjs  →  exit 0
```

(репо + smoke production)

---

### P0-3. Power semantics

| Слой | Модель | Пример |
|------|--------|--------|
| **SEO** (meta, JSON-LD `max_power_kw`) | до **X** кВт (max одного поста) | до 160 кВт |
| **UI infra KPI** (блок «Станций в локации») | **sum** — как в согласованном макете | **320 КВТ** |
| **JSON-LD** | `max_power_kw` + `total_installed_kw` | 160 / 320 |

SEO и UI **намеренно различаются**: description/JSON-LD max для поиска; UI sum — масштаб локации по макету. **Не** показывать «ДО … / СУММАРНО» в публичном infra-блоке.

---

### JSON-LD `name` (часть SEO-A)

Нейтрально, **без intro**, без «быстрая станция»:

```text
Зарядная станция {Operator} — {City}, {Address}
```

Intro — только в `description`.

---

### Definition of Done — SEO-A

**Статус: ЗАКРЫТ** (2026-06-05)

| # | Критерий | Result |
|---|----------|--------|
| 1 | LocalBusiness `@graph` + validator-ready (Phase A) | ✅ prod HTML |
| 2 | `parentOrganization` → Organization `@id` | ✅ `8caf522` |
| 3 | AC terminology | ✅ prod |
| 4 | Power: SEO max / UI sum (макет) | ✅ prod |
| 5 | JSON-LD name нейтральный | ✅ |
| 6 | Single H1 | ✅ |
| 7 | Description + коннекторы | ✅ |

Smoke: `node scripts/verify-phase-a-schema-production.mjs` + `verify-seo-a-p0-production.mjs` → PASS 3/3.

---

## SEO-B — три P1 (сразу после SEO-A)

**Порядок (согласовано 2026-06-05):** sitemap первым — эффект на весь сайт сразу; linking усиливает crawl path после появления sitemap.

| P1 | Задача | Статус |
|----|--------|--------|
| 1 | **Dynamic sitemap** | **CLOSED** — prod 133 URL, commit `2671277` |
| 2 | `map.html` → location page | **CLOSED** — commit pending push |
| 3 | `stations.html` → location page | pending |

**Приёмка SEO-B:** Search Console — sitemap с location URLs; crawl path: home / map / stations → location pages.

Smoke: **5–10 случайных локаций** разных операторов (не одна ACDC-эталон).

**После SEO-B = ЗАКРЫТ → Platform.**

---

## Platform (после SEO-B)

После SEO-B начинается **не SEO**, а **платформа**: EV RACE из каталога зарядок → живая инфраструктурная система.

| Направление | Содержание |
|-------------|------------|
| Reviews | UGC, модерация |
| Ratings | AggregateRating в JSON-LD (freeze снят) |
| Photos | Галерея локаций |
| Tags | Социальные / тематические метки |
| Community | Вовлечение пользователей |

**Gate:** только после **SEO-A + SEO-B** закрыты.

---

## Lighthouse — не блокер

Mobile Performance 85, SEO 100 — приемлемо. Leaflet optimisation — **backlog**, не тормозит SEO-A / SEO-B / Platform.

---

## Backlog (низкий приоритет)

- Leaflet lazy load / static map preview  
- 301 lowercase / trailing slash  
- Twitter cards, geo meta  
- **Location 404 — красивая заглушка (обязательно, потом)** — см. ниже

---

## Backlog: Location 404 page (P1 polish, после SEO-B sitemap)

**Статус:** отложено. **Приоритет:** обязательно, не блокер SEO-B P1-1.

**Контекст:** после merge дублей (напр. `/forevo/grodno-pr-kleckova-15a`) отдаётся голый HTML без site chrome — см. скрин prod.

**Сейчас:** `render404()` в [`functions/[operator_slug]/[slug].js`](../functions/[operator_slug]/[slug].js) — минимальная разметка, `noindex`, ссылка на `/stations.html`.

**Нужно (DoD):**

| # | Требование |
|---|------------|
| 1 | Общий header + footer (`site-chrome.js`, как на location page) |
| 2 | Стили `arcade.css`, тема light/dark |
| 3 | HTTP **404** + `<meta name="robots" content="noindex">` — без изменений |
| 4 | Понятный copy: локация не найдена / возможно переезд URL |
| 5 | CTA: «Все станции», «Карта», главная |
| 6 | Без JSON-LD, без canonical на несуществующий URL |

**Не в scope сейчас:** глобальный 404 Cloudflare для всего сайта; 301 redirect table для merged slugs.

**Триггер реализации:** явное **ДЕЛАЙ** от автора (после Dynamic Sitemap или параллельно polish-батч).

---

## Roadmap (итог)

```text
Location Pages     ████████████████████  100%
SEO-A (P0)         ████████████████████  ЗАКРЫТ
SEO-B (P1)         ░░░░░░░░░░░░░░░░░░░░  NEXT
  1. Dynamic sitemap
  2. map.html → location
  3. stations.html → location
Platform           ░░░░░░░░░░░░░░░░░░░░  после SEO-B
  Reviews · Ratings · Photos · Tags · Community
```

---

## Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-05 | Первичная фиксация после `SEO-A-FINAL-AUDIT.md` |
| 2026-06-05 | Переименование SEO-Infra → **SEO-B**; roadmap P0/P1; принцип sitemap перед отзывами |
| 2026-06-05 | SEO-B порядок: **sitemap → map → stations**; Stage 3 → **Platform** |
| 2026-06-05 | Backlog: **Location 404** — красивая заглушка (обязательно, после SEO-B sitemap) |
| 2026-06-05 | **SEO-B P1-1:** dynamic sitemap — `functions/sitemap.xml.js`, baseline 123 locations |
