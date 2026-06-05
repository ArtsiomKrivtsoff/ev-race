# SEO-A P0 — Verification Report

**Дата:** 2026-06-05  
**Коммит:** `4105b64` — `fix(seo-a): P0 schema, AC terminology, and power alignment`  
**Deploy:** push в `main` выполнен; Cloudflare Pages — дождаться green deploy.

---

## 1. Schema fix (P0-1)

### Изменения

| Было | Стало |
|------|-------|
| `WebPage.mainEntity → #evcs` | **удалено** |
| — | `ElectricVehicleChargingStation.mainEntityOfPage → canonical` |
| — | `additionalProperty.total_installed_kw` (sum) |

**Файл:** `functions/_lib/location-seo.js`

### Local PASS

```bash
node scripts/verify-location-seo-local.mjs
```

- `WebPage.mainEntity` — absent ✅  
- `EVCS.mainEntityOfPage.@id` = canonical ✅  
- `total_installed_kw` present ✅  

### Production (ручная приёмка)

После deploy — на **3 URL**:

1. `https://evrace.by/zaryadka/minsk-mstislavca-6` (AC-MST)
2. `https://evrace.by/zaryadka/minsk-inzhenernaya-18` (MIX-ZAR)
3. `https://evrace.by/orange/minsk-per-rabochiy-6` (DC-ORG)

**validator.schema.org** — вставить JSON-LD из View Source:

```text
0 errors / 0 warnings
```

Автоматическая smoke:

```bash
node scripts/verify-seo-a-p0-production.mjs
```

---

## 2. AC terminology (P0-2)

### Изменения

| Файл | Было | Стало |
|------|------|-------|
| `functions/_lib/station-badges.js` | AC — МЕДЛЕННЫЕ СТАНЦИИ | AC — ЗАРЯДКА ПЕРЕМЕННЫМ ТОКОМ |
| `index.html`, `index_new.html`, `v2/index_new.html` | то же | то же |
| `CSS/arcade.css` | comment «медленнее» | «переменный ток» |

### Local PASS

```bash
grep -ri "МЕДЛЕНН"   # → 0 результатов
node scripts/check-ac-terminology.mjs   # → exit 0
```

---

## 3. Power alignment (P0-3)

### Модель

| Слой | Значение | Пример AC-MST |
|------|----------|---------------|
| **SEO** (meta, JSON-LD `max_power_kw`) | max одного поста | до **44** кВт |
| **UI primary KPI** | `ДО {max} КВТ` | **ДО 44 КВТ** |
| **UI secondary** | sum | **176 КВТ СУММАРНО** (если sum ≠ max) |
| **JSON-LD** | `total_installed_kw` | 176 |

**Файлы:** `location-seo.js`, `location-render.js`, `CSS/location-page.css` (`.loc-infra-sub`)

### Local logic

`computeSeoMaxPostKw()` — единая формула для SEO phrase и UI primary.

### Production criteria

На каждом smoke URL:

```text
meta description «до N кВт» = UI «ДО N КВТ» = JSON-LD max_power_kw
```

---

## 4. Сводка статуса

| P0 | Local | Production |
|----|-------|------------|
| Schema | **PASS** | ⏳ после deploy + Validator |
| AC terminology | **PASS** | ⏳ `verify-seo-a-p0-production.mjs` |
| Power alignment | **PASS** (logic) | ⏳ smoke 3 URL |

**SEO-A = ЗАКРЫТ** только когда все три строки Production = **PASS**.

---

## 5. Следующий шаг — SEO-B

После PASS по таблице §4:

1. `stations.html` → location pages  
2. `map.html` → location pages  
3. Dynamic sitemap  

Stage 3 (отзывы) — **не раньше SEO-B**.
