# EV RACE — SEO-B P1-2 Verification Report (Map → Location)

**Дата:** 2026-06-05  
**Коммит:** `19be2b6` — map popup links to location pages  
**Scope:** [`map.html`](../map.html) — surgical addition, без переписывания Leaflet/cluster logic  
**Предусловие:** P1-1 Dynamic Sitemap — **CLOSED** (prod 133 URL, commit `2671277`)

---

## Executive Summary

В popup маркера карты добавлена ссылка **«КАРТОЧКА ЛОКАЦИИ →»** на canonical location page (`https://evrace.by/{operator_slug}/{slug}`). Lookup строится из таблицы `locations` по каноническому ключу `operator|city|address` (как `generate_location_key` в БД).

Автоматический smoke: **`node scripts/verify-map-location-links.mjs` → PASS**.

| Метрика | Результат |
|---------|-----------|
| Маркеров на карте | **123** (без регрессии) |
| Pin'ов со ссылкой на location | **123 / 123** |
| Multi-key pin'ов в prod | **0** (логика multi-link реализована, симulated пример ниже) |

**Вердикт:** **P1-2 CLOSED** (код + verify). Prod — после `git push origin main`.

---

## 1. Пример popup — одна location-ссылка

**Кейс:** Malanka, Минск, К. Туровского, 6  
**URL:** https://evrace.by/malanka/minsk-k-turovskogo-6

Фрагмент HTML popup (после блока адреса, перед списком станций):

```html
<div class="popup-loc-links">
  <a class="popup-loc-link"
     href="https://evrace.by/malanka/minsk-k-turovskogo-6"
     style="border-color:#76d275;color:#76d275">
    КАРТОЧКА ЛОКАЦИИ →
  </a>
</div>
```

Полный контекст popup:

```
┌─ popup ─────────────────────────────┐
│ [Malanka]                           │
│ 📍 Минск, К. Туровского, 6          │
│ ┌─────────────────────────────────┐ │
│ │ КАРТОЧКА ЛОКАЦИИ →              │ │  ← NEW
│ └─────────────────────────────────┘ │
│ ⚡ DC 120 кВт · …                    │
│ ► МАРШРУТ (mobile only)             │
└─────────────────────────────────────┘
```

---

## 2. Пример popup — несколько location-ссылок

### Prod

На production **нет** pin'ов, где на одних coords висят станции с **разными** `location_key` (**0 multi-key pins**). Каждый из 123 маркеров → **одна** ссылка.

### Simulated (логика multi-link)

Если в одной точке окажутся станции двух локаций — popup отрисует **две** ссылки:

```html
<div class="popup-loc-links">
  <a class="popup-loc-link"
     href="https://evrace.by/forevo/minsk-rudobel-skaya-3"
     style="border-color:#b44fff;color:#b44fff">
    КАРТОЧКА ЛОКАЦИИ →
  </a>
  <a class="popup-loc-link"
     href="https://evrace.by/zaryadka/minsk-inzhenernaya-18"
     style="border-color:#00cfff;color:#00cfff">
    КАРТОЧКА ЛОКАЦИИ →
  </a>
</div>
```

---

## 3. Результат `verify-map-location-links.mjs`

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

=== example popup fragment (multi link, simulated) ===
<div class="popup-loc-links"><a class="popup-loc-link" href="https://evrace.by/forevo/minsk-rudobel-skaya-3" style="border-color:#b44fff;color:#b44fff">КАРТОЧКА ЛОКАЦИИ →</a><a class="popup-loc-link" href="https://evrace.by/zaryadka/minsk-inzhenernaya-18" style="border-color:#00cfff;color:#00cfff">КАРТОЧКА ЛОКАЦИИ →</a></div>

PASS: map location links OK
```

### Spot-checks (автоматика)

| Alias | Location URL |
|-------|----------------|
| Malanka DC | `https://evrace.by/malanka/minsk-k-turovskogo-6` |
| forEVo mix | `https://evrace.by/forevo/minsk-rudobel-skaya-3` |
| Zaryadka ACDC | `https://evrace.by/zaryadka/minsk-inzhenernaya-18` |

### Source audit (обязательные паттерны в `map.html`)

- `renderLocationLinks`, `buildLocationLookup`, `locationByKey`
- `popup-loc-link`, текст «КАРТОЧКА ЛОКАЦИИ →»
- fetch `/rest/v1/locations`
- `<a href="https://evrace.by/...">` через `escapePopupHtml`

---

## 4. Маркеры — регрессия

| Метрика | До P1-2 | После P1-2 |
|---------|---------|------------|
| Station rows с coords | 166 | **166** |
| Уникальных маркеров (`groupByCoords`) | 123 | **123** |
| Pin'ов с location link | 0 | **123** |
| Active locations в БД | 123 | 123 |

**Не изменялось:** clustering, фильтры (operator / type / time), heat map, mobile «МАРШРУТ», темы, tile layers.

---

## Реализация (кратко)

### Данные

Параллельный fetch при загрузке карты:

```
GET /rest/v1/stations?...&lat=not.is.null
GET /rest/v1/locations?select=operator,city,address,operator_slug,slug,location_name&is_active=eq.true
```

Lookup: `normalize(operator)|normalize(city)|normalize(address)` → `{ operator_slug, slug }`.

### Ссылка

- Абсолютный URL: `https://evrace.by/{operator_slug}/{slug}`
- Полноценный `<a href>` (не `#`, не `javascript:`)
- Fallback: нет slug в lookup → блок ссылки не рисуется, popup работает

### Crawler без JS

Location-ссылки **не** в исходном HTML `map.html` — только в popup после JS (Leaflet SPA). No-JS crawl path закрыт **P1-1 sitemap**. P1-2 — internal links для пользователей и JS-ботов.

---

## Definition of Done — P1-2

| # | Критерий | Статус |
|---|----------|--------|
| 1 | `locations` загружаются, lookup по `location_key` | ✅ |
| 2 | Popup: `<a href="https://evrace.by/{operator_slug}/{slug}">` | ✅ |
| 3 | Абсолютный URL | ✅ |
| 4 | Fallback без slug — без ошибок | ✅ |
| 5 | Smoke 3 spot-checks | ✅ |
| 6 | Маркеры 123, без регрессии | ✅ |
| 7 | `verify-map-location-links.mjs` → PASS | ✅ |

**Не в scope:** звёзды/reviews в popup, static HTML без JS, переписывание clustering.

---

## Файлы

| Файл | Изменение |
|------|-----------|
| [`map.html`](../map.html) | locations lookup + popup links + CSS |
| [`scripts/verify-map-location-links.mjs`](../scripts/verify-map-location-links.mjs) | smoke |
| [`docs/SEO-B-P1-2-MAP-LOCATION-PLAN.md`](SEO-B-P1-2-MAP-LOCATION-PLAN.md) | план |

---

## Manual QA после deploy

1. https://evrace.by/map.html — клик по маркеру Malanka / forEVo / Zaryadka  
2. «КАРТОЧКА ЛОКАЦИИ →» → 200 location page  
3. Mobile: ссылка + «МАРШРУТ» в одном popup  

---

## Roadmap SEO-B

| P1 | Задача | Статус |
|----|--------|--------|
| 1 | Dynamic sitemap | **CLOSED** (`2671277`) |
| 2 | Map → Location | **CLOSED** (`19be2b6`) |
| 3 | Stations → Location | **NEXT** |

---

## Smoke commands

```bash
node scripts/verify-map-location-links.mjs
node scripts/verify-sitemap-production.mjs
```
