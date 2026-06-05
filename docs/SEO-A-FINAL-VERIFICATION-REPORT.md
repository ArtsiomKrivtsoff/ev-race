# EV RACE — Final SEO-A Verification

**URL:** https://evrace.by/malanka/minsk-k-turovskogo-6  
**Дата:** 2026-06-05  
**Deploy:** `8caf522` (`provider` → `parentOrganization`)

---

## Контекст

После деплоя правки `provider → parentOrganization` выполнен полный аудит location page для решения: можно ли официально закрыть SEO-A и переходить к SEO-B.

**Итоговый вердикт:** **SEO-A CLOSED** — критичных ошибок нет, можно переходить к SEO-B.

---

## Проверка №1 — Schema.org Validator

**Источник:** POST `https://validator.schema.org/validate` (официальный API)

| Критерий | Результат |
|----------|-----------|
| LocalBusiness | ✅ |
| Organization | ✅ |
| BreadcrumbList | ✅ |
| WebPage | ✅ |
| `parentOrganization` → `https://evrace.by/operator/malanka` | ✅ валиден |
| `provider` | ✅ **отсутствует** |
| `WebPage.mainEntity` | ✅ отсутствует |
| **Errors** | **0** |
| **Warnings** | **0** |

**Оставшиеся warnings:** нет.

---

## Проверка №2 — Google Rich Results Test

Программный парсинг RRT недоступен (интерактивный UI). Оценка по валидной разметке и production HTML:

| Критерий | Ожидание / статус |
|----------|-------------------|
| Structured Data читается | ✅ JSON-LD один script, `@graph` 4 узла |
| BreadcrumbList | ✅ 3 item; eligible breadcrumbs — **возможны** |
| Critical issues после `provider` → `parentOrganization` | ✅ **нет** (validator 0/0) |
| Регрессия provider | ✅ `provider` отсутствует в HTML |

**Итог RRT (ожидаемый):** страница **без critical schema errors**. LocalBusiness **не даёт** отдельного rich snippet в Gallery — это норма, не ошибка SEO-A.

**Ручная проверка:**  
https://search.google.com/test/rich-results?url=https%3A%2F%2Fevrace.by%2Fmalanka%2Fminsk-k-turovskogo-6

---

## Проверка №3 — Финальный HTML

| Элемент | Значение | OK |
|---------|----------|-----|
| **H1** (×1) | `Минск` + `К. Туровского, 6` | ✅ локация, не оператор |
| **canonical** | `https://evrace.by/malanka/minsk-k-turovskogo-6` | ✅ = URL |
| **title** | `Зарядная станция Malanka — Минск, К. Туровского, 6 \| EV RACE` | ✅ |
| **description** | `…до 120 кВт. Разъёмы CCS и GBT…` | ✅ DC intro |
| **robots** | `index, follow` | ✅ |
| **og:type / url / image / site_name** | website, canonical, og-map.png, EV RACE | ✅ |
| **JSON-LD scripts** | 1 | ✅ |
| **X.X placeholder** | present (desktop + mobile) | ✅ |

### LocalBusiness из production HTML (целиком)

```json
{
  "@type": "LocalBusiness",
  "@id": "https://evrace.by/malanka/minsk-k-turovskogo-6#business",
  "mainEntityOfPage": {
    "@id": "https://evrace.by/malanka/minsk-k-turovskogo-6"
  },
  "name": "Зарядная станция Malanka — Минск, К. Туровского, 6",
  "description": "Быстрая зарядная станция Malanka — Минск, К. Туровского, 6. Зарядка электромобилей до 120 кВт. Разъёмы CCS и GBT. Отзывы, фото и маршрут на EV RACE.",
  "url": "https://evrace.by/malanka/minsk-k-turovskogo-6",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "К. Туровского, 6",
    "addressLocality": "Минск",
    "addressCountry": "BY"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 53.932787,
    "longitude": 27.654798
  },
  "parentOrganization": {
    "@id": "https://evrace.by/operator/malanka"
  },
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "DC charging", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "CCS", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "GBT", "value": true }
  ],
  "additionalProperty": [
    { "@type": "PropertyValue", "name": "connector_types", "value": "CCS, GBT" },
    { "@type": "PropertyValue", "name": "max_power_kw", "value": 120 },
    { "@type": "PropertyValue", "name": "total_installed_kw", "value": 360 },
    { "@type": "PropertyValue", "name": "station_count", "value": 3 },
    { "@type": "PropertyValue", "name": "simultaneous_charging_count", "value": 3 },
    { "@type": "PropertyValue", "name": "max_dc_kw", "value": 120 }
  ]
}
```

### Organization (отдельный узел `@graph`)

```json
{
  "@type": "Organization",
  "@id": "https://evrace.by/operator/malanka",
  "name": "Malanka",
  "url": "https://evrace.by/operator/malanka"
}
```

### Power contract на этой странице

| Слой | Значение |
|------|----------|
| description «до … кВт» | 120 |
| UI infra KPI | 360 КВТ (sum, по макету) |
| JSON-LD | max 120 / total 360 |

---

## Проверка №4 — Internal SEO-A Audit

Автоматический прогон: `node scripts/audit-seo-a-page.mjs` → **0 issues**.

| Область | Статус |
|---------|--------|
| Дубли H1 | ✅ 1 |
| Дубли title | ✅ 1 |
| broken canonical | ✅ нет |
| schema.org errors | ✅ 0/0 (validator API) |
| robots | ✅ index, follow |
| EVCS legacy | ✅ отсутствует |
| AC terminology | ✅ |
| Structured data | ✅ |

**Критичных SEO-A блокеров не найдено.**

Sitemap, stations/map linking — scope **SEO-B**, в этот аудит не включались.

---

## Итоговый вердикт

### Вариант A — SEO-A CLOSED

Критичных ошибок нет.  
**Можно переходить к SEO-B.**

| Gate | Status |
|------|--------|
| Schema (LocalBusiness + Organization) | ✅ validator **0 errors / 0 warnings** |
| SEO-A Core (H1, meta, OG, terminology, power) | ✅ |
| Structured data architecture | ✅ freeze до Stage 3 |

---

## Следующий трек — SEO-B

1. **Dynamic sitemap** (эффект на весь сайт сразу)  
2. `map.html` → location pages  
3. `stations.html` → location pages  

**Platform** (Reviews, Ratings, Photos, Tags, Community) — **не раньше SEO-B**.

---

## Справка: ключевые коммиты SEO-A

| Коммит | Содержание |
|--------|------------|
| `4105b64` | P0: terminology, power, EVCS mainEntityOfPage (superseded) |
| `2c5ff11` | Phase A: LocalBusiness migration |
| `8caf522` | `provider` → `parentOrganization` |
| `688ce4d` | UI: revert infra KPI to sum (макет) |
| `8f18a39` | UI: restore X.X rating placeholder |

---

## Справка: smoke URLs (Phase A)

| Alias | Kind | URL |
|-------|------|-----|
| AC-MST | AC | https://evrace.by/zaryadka/minsk-mstislavca-6 |
| MIX-ZAR | ACDC | https://evrace.by/zaryadka/minsk-inzhenernaya-18 |
| DC-ORG | DC | https://evrace.by/orange/minsk-per-rabochiy-6 |
| **Final audit** | DC (Malanka) | https://evrace.by/malanka/minsk-k-turovskogo-6 |
