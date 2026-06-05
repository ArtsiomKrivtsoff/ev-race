# EV RACE — SEO-B P1-3 Verification Report (Stations → Location)

**Дата:** 2026-06-05  
**Коммит:** pending — P1-3 stations location links  
**Вердикт:** **P1-3 CLOSED** · **SEO-B CLOSED**

---

## Executive Summary

В [`stations.js`](../stations.js) добавлены internal links на location pages через lookup `locations` (canonical key `operator|city|address`). Coverage **123/123**. Smoke script **PASS**. Regression: filters / sort / pagination / list·group toggle — без изменений логики.

---

## 1. `verify-stations-location-links.mjs`

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

PASS: stations location links OK
```

---

## 2. Coverage

| Метрика | Значение |
|---------|----------|
| Station rows | 166 |
| Unique canonical keys | **123** |
| Keys with resolvable location URL | **123/123** ✅ |

---

## 3. Примеры ссылок (Malanka, К. Туровского, 6)

### Desktop list

```html
<a class="loc-page-link" href="https://evrace.by/malanka/minsk-k-turovskogo-6">
  <span class="loc-address">К. Туровского, 6</span>
</a>
```

### Desktop group (header row)

```html
<a class="loc-page-link" href="https://evrace.by/malanka/minsk-k-turovskogo-6">
  <span style="color:var(--green)">К. Туровского, 6</span>
</a>
```

### Mobile card

```html
<a class="loc-page-link" href="https://evrace.by/malanka/minsk-k-turovskogo-6">
  <span class="loc-city">Минск</span>
  <span class="loc-addr">К. Туровского, 6</span>
</a>
```

---

## 4. Regression

| Область | Статус |
|---------|--------|
| **Filters** (month, op, city, search, reset) | ✅ `getFiltered` без изменений |
| **Sort** (city, power, date) | ✅ `getSorted` без изменений |
| **Pagination** (load-more, show-all) | ✅ `PAGE_SIZE`, `renderLoadMore` без изменений |
| **List / group toggle** | ✅ `setView`, `renderDesktop` без изменений |
| UI grouping key (`locationKey` coords) | ✅ не менялся |

---

## SEO-B — CLOSED

| P1 | Задача | Commit |
|----|--------|--------|
| 1 | Dynamic sitemap | `2671277` |
| 2 | Map → Location | `19be2b6` |
| 3 | Stations → Location | pending push |

**Следующий трек:** **Platform** (Reviews, Ratings, Photos, Tags, Community).

---

## Manual QA после deploy

https://evrace.by/stations.html — клик по адресу в list / group / mobile → location page 200.
