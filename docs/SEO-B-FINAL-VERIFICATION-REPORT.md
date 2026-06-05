# EV RACE — Final SEO-B Verification

**Дата:** 2026-06-05  
**Prod:** https://evrace.by  
**Коммиты:** `2671277` (sitemap) · `19be2b6` (map) · `2364ccd` (stations)

---

## Контекст

После закрытия **SEO-A** выполнены три P1 задачи индексации и internal linking. Автоматические smoke-скрипты прогнаны локально; prod sitemap проверен по live URL.

**Итоговый вердикт:** **SEO-B CLOSED** — sitemap 133 URL, map и stations дают **123/123** resolvable links на location pages без регрессий UI.

---

## Executive Summary

| P1 | Задача | Commit | Verify | Coverage |
|----|--------|--------|--------|----------|
| 1 | Dynamic sitemap | `2671277` | `verify-sitemap-production.mjs` | **133 URL** (10 static + 123 locations) |
| 2 | Map → Location | `19be2b6` | `verify-map-location-links.mjs` | **123/123** pins |
| 3 | Stations → Location | `2364ccd` | `verify-stations-location-links.mjs` | **123/123** canonical keys |

**Общий паттерн linking:** `normalize(operator)|normalize(city)|normalize(address)` → lookup в `locations` → `https://evrace.by/{operator_slug}/{slug}`.

**Gate:** SEO-A + SEO-B закрыты → следующий трек **Platform** (Reviews, Ratings, Photos, Tags, Community).

---

## P1-1 — Dynamic Sitemap

```bash
node scripts/verify-sitemap-production.mjs
```

```
Sitemap: https://evrace.by/sitemap.xml
Total URLs: 133
Location URLs: 123
Static URLs: 10
lastmod entries: 123

PASS: dynamic sitemap OK
```

| Метрика | Значение |
|---------|----------|
| Total URLs | 133 |
| Location URLs | 123 |
| Static URLs | 10 |
| lastmod на location | 123 |

**Детали:** [`functions/sitemap.xml.js`](../functions/sitemap.xml.js), [`functions/_lib/sitemap-build.js`](../functions/_lib/sitemap-build.js).

---

## P1-2 — Map → Location

```bash
node scripts/verify-map-location-links.mjs
```

```
=== map.html source audit ===
PASS

=== marker regression ===
station rows with coords: 166
unique markers (groupByCoords): 123
pins with ≥1 location link: 123
multi-key pins in prod: 0

=== example popup fragment (single link) ===
<div class="popup-loc-links"><a class="popup-loc-link" href="https://evrace.by/malanka/minsk-k-turovskogo-6" style="border-color:#76d275;color:#76d275">КАРТОЧКА ЛОКАЦИИ →</a></div>

PASS: map location links OK
```

**Пример popup (Malanka, К. Туровского, 6):**

```html
<div class="popup-loc-links">
  <a class="popup-loc-link"
     href="https://evrace.by/malanka/minsk-k-turovskogo-6"
     style="border-color:#76d275;color:#76d275">
    КАРТОЧКА ЛОКАЦИИ →
  </a>
</div>
```

**Детали:** [`docs/SEO-B-P1-2-VERIFICATION-REPORT.md`](SEO-B-P1-2-VERIFICATION-REPORT.md)

---

## P1-3 — Stations → Location

```bash
node scripts/verify-stations-location-links.mjs
```

```
=== stations.js source audit ===
PASS

=== coverage ===
station rows: 166
unique canonical keys: 123
keys with location URL: 123/123

=== regression (source preserved) ===
filters:  getFiltered, setOp, setSearch, resetFilters — present
sort:     getSorted, sortable headers — present
pagination: PAGE_SIZE, renderLoadMore, loadMore, showAll — present
list/group: setView, STATE.view, renderDesktop — present

=== example Desktop list ===
<a class="loc-page-link" href="https://evrace.by/malanka/minsk-k-turovskogo-6"><span class="loc-address">К. Туровского, 6</span></a>

=== example Desktop group ===
<a class="loc-page-link" href="https://evrace.by/malanka/minsk-k-turovskogo-6"><span style="color:var(--green)">К. Туровского, 6</span></a>

=== example Mobile card ===
<a class="loc-page-link" href="https://evrace.by/malanka/minsk-k-turovskogo-6"><span class="loc-city">Минск</span><span class="loc-addr">К. Туровского, 6</span></a>

PASS: stations location links OK
```

### Coverage

| Метрика | Значение |
|---------|----------|
| Station rows | 166 |
| Unique canonical keys | **123** |
| Keys with resolvable location URL | **123/123** ✅ |

### Примеры ссылок (Malanka, К. Туровского, 6)

**Desktop list**

```html
<a class="loc-page-link" href="https://evrace.by/malanka/minsk-k-turovskogo-6">
  <span class="loc-address">К. Туровского, 6</span>
</a>
```

**Desktop group (header row)**

```html
<a class="loc-page-link" href="https://evrace.by/malanka/minsk-k-turovskogo-6">
  <span style="color:var(--green)">К. Туровского, 6</span>
</a>
```

**Mobile card**

```html
<a class="loc-page-link" href="https://evrace.by/malanka/minsk-k-turovskogo-6">
  <span class="loc-city">Минск</span>
  <span class="loc-addr">К. Туровского, 6</span>
</a>
```

### Regression (stations UI)

| Область | Статус |
|---------|--------|
| **Filters** (month, op, city, search, reset) | ✅ `getFiltered` без изменений |
| **Sort** (city, power, date) | ✅ `getSorted` без изменений |
| **Pagination** (load-more, show-all) | ✅ `PAGE_SIZE`, `renderLoadMore` без изменений |
| **List / group toggle** | ✅ `setView`, `renderDesktop` без изменений |
| UI grouping key (`locationKey` coords) | ✅ не менялся |

**Детали:** [`docs/SEO-B-P1-3-VERIFICATION-REPORT.md`](SEO-B-P1-3-VERIFICATION-REPORT.md)

---

## Crawl path (приёмка SEO-B)

```text
sitemap.xml ──► 123 location URLs
home / map / stations ──► location page (/{operator_slug}/{slug})
```

**Search Console (ручная задача):** resubmit `https://evrace.by/sitemap.xml`.

---

## Manual QA после deploy

| Страница | Проверка |
|----------|----------|
| https://evrace.by/map.html | popup → «КАРТОЧКА ЛОКАЦИИ →» → location 200 |
| https://evrace.by/stations.html | клик адреса в list / group / mobile → location 200 |
| Smoke | 5–10 случайных локаций разных операторов |

---

## Итоговый вердикт

### SEO-B CLOSED

| Gate | Status |
|------|--------|
| Dynamic sitemap (133 URL) | ✅ prod PASS |
| Map internal links | ✅ 123/123 |
| Stations internal links | ✅ 123/123 |
| Stations UI regression | ✅ filters / sort / pagination / list·group |

**Можно переходить к Platform.**

---

## Smoke commands

```bash
node scripts/verify-sitemap-production.mjs
node scripts/verify-map-location-links.mjs
node scripts/verify-stations-location-links.mjs
node scripts/verify-sitemap-build-local.mjs
```

---

## Справка: ключевые файлы SEO-B

| Файл | P1 |
|------|-----|
| `functions/sitemap.xml.js` | 1 |
| `functions/_lib/sitemap-build.js` | 1 |
| `map.html` | 2 |
| `stations.js` | 3 |
| `CSS/arcade.css` (`.loc-page-link`) | 3 |
| `scripts/verify-sitemap-production.mjs` | 1 |
| `scripts/verify-map-location-links.mjs` | 2 |
| `scripts/verify-stations-location-links.mjs` | 3 |

---

## Следующий трек — Platform

Reviews, Ratings, Photos, Tags, Community — **не SEO**, продуктовая платформа. Gate: SEO-A + SEO-B ✅.

**Backlog (не блокер):** Location 404 page — см. [`SEO-A-DECISIONS.md`](SEO-A-DECISIONS.md).
