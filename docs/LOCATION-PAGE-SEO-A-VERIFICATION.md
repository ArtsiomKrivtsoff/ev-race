# SEO-A — Production Verification Report

**Дата проверки:** 2026-06-05  
**Эталон URL:** https://evrace.by/zaryadka/minsk-inzhenernaya-18  
**Коммит с исправлениями:** `892a2eb` (main, pushed)  
**Supabase `get-location`:** redeployed 2026-06-05  
**Cloudflare Pages:** **новый bundle ещё НЕ на production** (см. маркеры ниже)

---

## Итог

| Критерий | Production (сейчас) | После деплоя `892a2eb` |
|----------|---------------------|-------------------------|
| **ElectricVehicleChargingStation** | ⚠️ PARTIAL | ✅ ожидается PASS |
| **BreadcrumbList** | ❌ FAIL | ✅ ожидается PASS |
| **Single H1** | ✅ PASS | ✅ PASS |
| **Description Logic** | ❌ FAIL | ✅ ожидается PASS |
| **Connector Coverage** | ⚠️ PARTIAL | ✅ ожидается PASS |
| **SEO-A закрыт** | **❌ НЕТ** | после деплоя + повторной проверки |

**Блокер:** push в `main` выполнен, но HTML на `evrace.by` всё ещё от **старого** Pages bundle (нет `@graph`, нет `loc-hero-grid`, `og.png` вместо `og-map.png`). Нужен успешный deploy проекта `ev-race` в Cloudflare Pages (Dashboard → Deployments → commit `892a2eb`).

---

## 1. ElectricVehicleChargingStation

### Production (факт HTML, 2026-06-05)

- JSON-LD **есть**, отдельный script, `@type: ElectricVehicleChargingStation`
- Поля: `name`, `url`, `address`, `geo`, `operator`, `amenityFeature`, `additionalProperty` (max_dc_kw, max_ac_kw, station_count, …)
- **Нет** единого `@graph` с `WebPage.mainEntity`
- **Нет** `additionalProperty.connector_types` (только amenityFeature по разъёмам)

### Почему Rich Results Test мог показать «НЕ ПОДТВЕРЖДЁН»

1. **BreadcrumbList на той же странице с ошибками** — тест подсвечивает invalid items; общее впечатление «structured data broken».
2. **EVCS не даёт visual rich snippet** в Google Search (тип не в [Structured data gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)) — но **должен** появляться в блоке **Detected structured data** без ошибок на самом объекте.
3. На prod **два** `<script type="application/ld+json">` вместо связанного `@graph` — валидно, но слабее для связности с `WebPage`.

### После `892a2eb` (локальная проверка кода)

```text
@graph: WebPage + ElectricVehicleChargingStation + BreadcrumbList
EVCS.additionalProperty: connector_types, max_power_kw, station_count,
  simultaneous_charging_count, max_dc_kw, max_ac_kw
WebPage.mainEntity → #evcs, WebPage.breadcrumb → #breadcrumb
```

**Rich Results Test (ручная проверка после деплоя):**  
https://search.google.com/test/rich-results?url=https%3A%2F%2Fevrace.by%2Fzaryadka%2Fminsk-inzhenernaya-18

Ожидание: в **Detected structured data** — `ElectricVehicleChargingStation` **без errors**; возможны **0 eligible rich result types** (это нормально для EVCS).

---

## 2. BreadcrumbList

### Production — ❌ FAIL (корневая причина)

Второй JSON-LD script на prod:

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "position": 1, "name": "Главная", "item": "https://evrace.by/" },
    { "position": 2, "name": "Зарядные станции", "item": "https://evrace.by/stations.html" },
    { "position": 3, "name": "Минск" },
    { "position": 4, "name": "Инженерная, 18" }
  ]
}
```

**Ошибка:** у `ListItem` position **3** и **4** отсутствует обязательное поле **`item`** (URL). Google Rich Results Test помечает BreadcrumbList как invalid.

### После `892a2eb` — ожидается ✅ PASS

3 уровня, у **каждого** `ListItem` есть `item`:

| position | name | item |
|----------|------|------|
| 1 | Главная | `https://evrace.by/` |
| 2 | Зарядные станции | `https://evrace.by/stations.html` |
| 3 | Минск, Инженерная, 18 | canonical URL страницы |

---

## 3. Single H1 — ✅ PASS (production)

```
H1 count in DOM: 1
<h1 class="loc-hero-h1" id="loc-title" data-fit-line>Минск, Инженерная, 18</h1>
```

После `892a2eb`: один блок identity в `.loc-hero-grid`, без mobile-дубликата заголовка.

---

## 4. Description Logic — ❌ FAIL (production)

**Production meta description:**

```text
Зарядная станция Zaryadka — Минск, Инженерная, 18. Быстрая зарядка электромобилей до 160 кВт Разъёмы CCS, GBT и Type 2. Отзывы, фото и маршрут на EV RACE.
```

| Правило | Факт |
|---------|------|
| DC/ACDC → «Быстрая зарядная станция …» | ❌ intro = «Зарядная станция …» |
| AC-only → «Зарядная станция переменного тока …» | не проверено на этой локации (есть DC) |
| Power → «Зарядка электромобилей до N кВт» | ❌ «Быстрая зарядка …» |

**После `892a2eb` (локально, DC+AC локация):**

```text
Быстрая зарядная станция Zaryadka — Минск, Инженерная, 18. Зарядка электромобилей до 160 кВт. Разъёмы CCS2, GBT и Type 2. Отзывы, фото и маршрут на EV RACE.
```

---

## 5. Connector Coverage — ⚠️ PARTIAL (production)

| Слой | Production |
|------|------------|
| meta description | ✅ «Разъёмы CCS, GBT и Type 2» |
| JSON-LD `connector_types` | ❌ нет в `additionalProperty` |
| raw labels (CCS2 vs CCS) | ⚠️ в description «CCS», не «CCS2» |

После `892a2eb`: raw labels из БД + `additionalProperty.connector_types`.

---

## 6. og:image

| | |
|-|-|
| Production | `https://evrace.by/og.png` |
| После deploy | `https://evrace.by/og-map.png` (файл на prod отдаёт **200**) |

Не блокер SEO-A, но переключение в коде готово.

---

## 7. Маркеры версии на production

| Маркер | Production | Commit `892a2eb` |
|--------|------------|------------------|
| `@graph` в JSON-LD | ❌ | ✅ |
| `loc-hero-grid` в HTML | ❌ | ✅ |
| `location-page.css?v=21` | ❌ | ✅ |
| JSON-LD scripts | 2 | 1 (@graph) |
| og-map.png | ❌ | ✅ |

---

## 8. Автоматическая проверка

```bash
node scripts/verify-location-seo-production.mjs https://evrace.by/zaryadka/minsk-inzhenernaya-18
```

```bash
node scripts/verify-location-seo-local.mjs
```

**Сейчас** production-скрипт на старом HTML вернёт **FAIL** (`@graph`, description intro, breadcrumb items).

---

## 9. Чеклист закрытия SEO-A

- [ ] Cloudflare Pages: deployment commit `892a2eb` **Success**
- [ ] Production: `@graph` + `loc-hero-grid` в HTML
- [ ] Rich Results Test: BreadcrumbList **0 errors**
- [ ] Rich Results Test: ElectricVehicleChargingStation **detected, 0 errors on item**
- [ ] `verify-location-seo-production.mjs` → exit 0
- [ ] AC-only локация: description intro «переменного тока» ( smoke )

**Только после всех пунктов → SEO-A = ЗАКРЫТ → SEO-B.**

---

## SEO-B (не начинаем)

- stations → location
- map → location  
- sitemap
- 301 redirects
