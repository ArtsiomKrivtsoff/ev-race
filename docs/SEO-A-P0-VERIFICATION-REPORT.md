# SEO-A P0 — Verification Report

**Статус:** **IMPLEMENTED, NOT VERIFIED**  
**Коммиты:** `4105b64`, `2464238`  
**Дата отчёта:** 2026-06-05

Код принят. Закрытие SEO-A — **только после production PASS** по чеклисту §Production gate.

---

## Production gate (обязательно перед закрытием)

### Smoke URLs

| Alias | URL |
|-------|-----|
| AC-MST | `https://evrace.by/zaryadka/minsk-mstislavca-6` |
| MIX-ZAR | `https://evrace.by/zaryadka/minsk-inzhenernaya-18` |
| DC-ORG | `https://evrace.by/orange/minsk-per-rabochiy-6` |

### 1. validator.schema.org

На каждом URL — JSON-LD из View Source:

```text
0 errors / 0 warnings
```

| URL | Errors | Warnings | PASS |
|-----|--------|----------|------|
| AC-MST | ⏳ | ⏳ | ⏳ |
| MIX-ZAR | ⏳ | ⏳ | ⏳ |
| DC-ORG | ⏳ | ⏳ | ⏳ |

### 2. Schema structure

| Check | AC-MST | MIX-ZAR | DC-ORG |
|-------|--------|---------|--------|
| `ElectricVehicleChargingStation.mainEntityOfPage` → canonical | ⏳ | ⏳ | ⏳ |
| `WebPage.mainEntity` **отсутствует** | ⏳ | ⏳ | ⏳ |

### 3. AC terminology

```bash
node scripts/check-ac-terminology.mjs   # репо → exit 0
node scripts/check-ac-terminology.mjs
node scripts/verify-seo-a-p0-production.mjs
```

| Check | Result |
|-------|--------|
| Repo `grep` | ✅ 0 (local) |
| Production HTML (3 URL) | ⏳ |
| Legend: `AC — ЗАРЯДКА ПЕРЕМЕННЫМ ТОКОМ` | ⏳ |

### 4. Power contract

На каждом URL:

| Слой | Поле | PASS |
|------|------|------|
| Description | «до N кВт» = max post | ⏳ |
| UI primary KPI | `ДО N КВТ` = max post | ⏳ |
| UI secondary KPI | `{sum} КВТ СУММАРНО` (если sum ≠ max) | ⏳ |
| JSON-LD | `max_power_kw` + `total_installed_kw` | ⏳ |

**Эталон AC-MST:**

| Слой | Ожидание |
|------|----------|
| Description / UI primary / `max_power_kw` | **44** |
| UI secondary / `total_installed_kw` | **176** |

---

## Local verification (done)

| P0 | Result |
|----|--------|
| Schema logic | ✅ `verify-location-seo-local.mjs` |
| AC terminology | ✅ `check-ac-terminology.mjs` |
| Power logic | ✅ shared `computeSeoMaxPostKw()` |

---

## Итог

| | |
|---|---|
| **Сейчас** | IMPLEMENTED, NOT VERIFIED |
| **SEO-A закрыт** | когда §Production gate = PASS на всех 4 блоках |
| **Дальше** | SEO-B (stations, map, sitemap) — **только после** закрытия SEO-A |
| **Stage 3** | **не раньше SEO-B** |

### Команда для финальной smoke

```bash
node scripts/verify-seo-a-p0-production.mjs
```

Пришлите JSON-вывод + скрины Validator → обновим таблицы §1–§4 и зафиксируем **SEO-A = ЗАКРЫТ**.
