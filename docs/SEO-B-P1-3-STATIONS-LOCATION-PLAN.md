# EV RACE — SEO-B P1-3 Plan (Stations → Location)

**Дата:** 2026-06-05  
**Статус:** план принят · **ожидает «старт P1-3»**  
**Scope:** [`stations.js`](../stations.js) — surgical linking, без переписывания реестра  

**Предусловия (закрыты):**

| Gate | Статус |
|------|--------|
| SEO-A | **CLOSED** |
| P1-1 Dynamic Sitemap | **CLOSED** — prod 133 URL, `2671277` |
| P1-2 Map → Location | **CLOSED** — `19be2b6` |
| Baseline locations | **123 = 123** |

---

## Executive Summary

Последний блок **SEO-B**: добавить в реестр [`stations.html`](https://evrace.by/stations.html) **internal links** на canonical location pages (`https://evrace.by/{operator_slug}/{slug}`).

Сейчас адреса — plain text, fetch только `stations`. План: parallel fetch `locations`, lookup по canonical key `operator|city|address` (как P1-2 map), обернуть адрес/название в `<a href>` в трёх render-путях (desktop list, desktop group, mobile cards).

**Оценка:** ~1 день. После P1-3 → **SEO-B CLOSED** → Platform.

---

## 1. Текущее состояние `stations.html`

### Архитектура страницы

```
stations.html          stations.js
├── header/footer      ├── fetch /rest/v1/stations
├── filters (static)   ├── filter / sort / pagination
├── #reg-tbody  ──────►├── renderTableRow()
├── #cards-wrap ──────►├── renderGroupRows()
└── «ЗАГРУЗКА…»        └── renderMobile()
     (пусто в source)
```

| Слой | Файл | Роль |
|------|------|------|
| Shell | [`stations.html`](../stations.html) | SEO meta, фильтры, пустая таблица |
| Data + UI | [`stations.js`](../stations.js) | Supabase fetch, весь реестр через `innerHTML` |

**Исходный HTML** (без JS):

```html
<tbody id="reg-tbody">
  <tr><td colspan="10" class="loading">ЗАГРУЗКА ДАННЫХ…</td></tr>
</tbody>
```

### Ссылки на location pages — **нет**

| Элемент | Сейчас |
|---------|--------|
| Колонка «ЛОКАЦИЯ / АДРЕС» | `<span class="loc-name">` + `<span class="loc-address">` — **без href** |
| Mobile `loc-card` | name + address — **без href** |
| `data-loc-id` | legacy key, **не** URL |
| Рейтинг | `☆☆☆☆☆ СКОРО` — placeholder |

### Legacy `locationKey()` — не canonical

```javascript
// stations.js — группировка UI, НЕ identity БД
function locationKey(s) {
  if (s.lat != null && s.lng != null)
    return Number(s.lat).toFixed(5) + ',' + Number(s.lng).toFixed(5);
  return ((s.city || '').toLowerCase() + '|' + (s.address || '').toLowerCase()).trim();
}
```

Canonical identity в БД: `generate_location_key(operator, city, address)`.

**Важно:** группировка UI остаётся по coords; **lookup для href** — только по `operator|city|address`.

### Данные production (2026-06-05)

| Метрика | Значение |
|---------|----------|
| Station rows | **166** |
| Active locations | **123** |
| Unique canonical keys из stations | **123** |
| API | `GET /rest/v1/stations?select=*` — **без** `locations` |

### UI-режимы (все без location href)

| Режим | Функция | Default |
|-------|---------|---------|
| Desktop **group** | `renderGroupRows()` | ✅ active |
| Desktop **list** | `renderTableRow()` | toggle |
| Mobile cards | `renderMobile()` | always |

---

## 2. Как location pages свяжутся со списком

### Паттерн (переиспользуем P1-2 map)

```
stations row ──► normalize(operator|city|address)
                      │
                      ▼
              locationByKey lookup
                      │
                      ▼
         https://evrace.by/{operator_slug}/{slug}
```

### Шаг A — данные

В `init()` — **parallel fetch**:

```http
GET /rest/v1/stations?select=*&order=station_date.desc,...
GET /rest/v1/locations?select=operator,city,address,operator_slug,slug,location_name&is_active=eq.true
```

Lookup builder (идентично map P1-2):

```javascript
function normalizeIdentityPart(p) {
  return String(p ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}
function stationLocationKey(s) {
  return normalizeIdentityPart(s.operator) + '|' +
         normalizeIdentityPart(s.city) + '|' +
         normalizeIdentityPart(s.address);
}
```

Helpers: `buildLocationLookup()`, `locationPageUrl(station)`, `renderLocHtml(station)` → `<a>` или plain text fallback.

### Шаг B — точки вставки ссылки

| # | UI | Где | Ссылок |
|---|-----|-----|--------|
| 1 | Desktop **list** | `<td class="addr">` в `renderTableRow()` | 1 на строку |
| 2 | Desktop **group** | header row, `<td class="addr">` в `renderGroupRows()` | 1 на группу |
| 3 | Mobile | `loc-head` (name + address) в `renderMobile()` | 1 на карточку |
| — | Group nested rows | мощность/пистолеты | **без** ссылки |
| — | Fallback | slug не найден | plain text, UI не ломается |

### Пример — desktop list

```html
<td class="addr">
  <a class="loc-page-link" href="https://evrace.by/malanka/minsk-k-turovskogo-6">
    <span class="loc-name">ТЦ …</span>
    <span class="loc-address">К. Туровского, 6</span>
  </a>
</td>
```

### Пример — desktop group header

```html
<td class="addr">
  <a class="loc-page-link" href="https://evrace.by/forevo/minsk-rudobel-skaya-3">
    <strong style="color:var(--green)">…</strong><br>
    <span class="loc-address">Рудобельская, 3</span>
  </a>
</td>
```

### Пример — mobile card

```html
<div class="loc-head-left">
  … op badge …
  <a class="loc-page-link" href="https://evrace.by/zaryadka/minsk-inzhenernaya-18">
    <span class="loc-city">Минск</span>
    <span class="loc-name">…</span>
    <span class="loc-addr">Инженерная, 18</span>
  </a>
</div>
```

### Шаг C — CSS

```css
.loc-page-link { color: inherit; text-decoration: none; }
.loc-page-link:hover .loc-address,
.loc-page-link:hover .loc-addr { text-decoration: underline; }
```

(+ Tesla theme overrides при необходимости)

### Файлы

| Файл | Изменение |
|------|-----------|
| [`stations.js`](../stations.js) | lookup + 3 render functions |
| [`stations.html`](../stations.html) | CSS `.loc-page-link` (inline `<style>` или arcade.css — minimal) |
| `scripts/verify-stations-location-links.mjs` | smoke (новый) |

**Не трогаем:** `locationKey()`, filters, stats, pagination, `stations.html` shell structure.

---

## 3. HTML-ссылки и краулеры

| Вопрос | Ответ |
|--------|--------|
| Полноценный `<a href="https://evrace.by/…">`? | **Да** |
| Абсолютный URL? | **Да** |
| В **view-source** без JS? | **Нет** — реестр CSR |
| После выполнения JS? | **Да** — в DOM для отрендеренных строк/карточек |
| Нужен клик пользователя? | **Нет** (в отличие от map popup) |
| No-JS discovery | **P1-1 sitemap** (133 URL) |

### Сравнение SEO-B linking

| | Sitemap P1-1 | Map P1-2 | Stations P1-3 |
|--|--------------|----------|---------------|
| Crawl без JS | ✅ | ❌ | ❌ |
| `<a href>` после JS | — | popup only | ✅ list DOM |
| URLs covered | 123 locations | 123 pins | 123 keys |

---

## 4. Definition of Done — P1-3

| # | Критерий |
|---|----------|
| 1 | Parallel fetch `locations`, `locationByKey` lookup |
| 2 | Desktop list → `<a href>` в addr column |
| 3 | Desktop group header → `<a href>` |
| 4 | Mobile card → `<a href>` в loc-head |
| 5 | URL: `https://evrace.by/{operator_slug}/{slug}` |
| 6 | Fallback без slug — plain text, no errors |
| 7 | Smoke 5 эталонов → HTTP 200 |
| 8 | Regression: filters, sort, pagination, stats, list/group toggle |
| 9 | `node scripts/verify-stations-location-links.mjs` → **PASS** |
| 10 | Coverage: **123/123** station canonical keys → resolvable slug |

### Smoke URL

| Alias | Location page |
|-------|---------------|
| Malanka DC | https://evrace.by/malanka/minsk-k-turovskogo-6 |
| forEVo mix | https://evrace.by/forevo/minsk-rudobel-skaya-3 |
| Zaryadka ACDC | https://evrace.by/zaryadka/minsk-inzhenernaya-18 |
| Orange DC | https://evrace.by/orange/minsk-per-rabochiy-6 |
| Zaryadka AC | https://evrace.by/zaryadka/minsk-mstislavca-6 |

### Не в scope P1-3

- AggregateRating / звёзды в реестре  
- SSR / `<noscript>` static list  
- Refactor `locationKey()` для группировки  
- Links в nested group sub-rows  
- Cloudflare / cache changes  

---

## 5. После P1-3 — SEO-B CLOSED

```text
P1-1 Sitemap     ████████████████████  CLOSED
P1-2 Map         ████████████████████  CLOSED
P1-3 Stations    ░░░░░░░░░░░░░░░░░░░░  NEXT
─────────────────────────────────────────
SEO-B            → CLOSED после P1-3
Platform         → Reviews · Ratings · Photos · Tags · Community
```

**Manual (после deploy):** spot-check на https://evrace.by/stations.html — клик по адресу → location page.

---

## Связанные документы

- [`SEO-B-P1-2-VERIFICATION-REPORT.md`](SEO-B-P1-2-VERIFICATION-REPORT.md)
- [`SEO-B-P1-2-MAP-LOCATION-PLAN.md`](SEO-B-P1-2-MAP-LOCATION-PLAN.md)
- [`SEO-A-DECISIONS.md`](SEO-A-DECISIONS.md)
- [`LOCATION-PAGE-SEO-FOUNDATION.md`](LOCATION-PAGE-SEO-FOUNDATION.md) §3
- [`IMPLEMENTATION_SPEC.md`](IMPLEMENTATION_SPEC.md) §9.11

---

## Changelog

| Дата | Событие |
|------|---------|
| 2026-06-05 | P1-3 plan — review before implementation |
