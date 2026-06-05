# Phase A — Schema Migration Verification Report

**Статус:** IMPLEMENTED, NOT VERIFIED (production)  
**Дата:** 2026-06-05  
**Миграция:** `ElectricVehicleChargingStation` → `LocalBusiness` + `Organization`

---

## Решения (утверждено)

| # | Решение |
|---|---------|
| Organization `@id` | `https://evrace.by/operator/{slug}` — **постоянный**, без `#org` |
| `additionalType` | **не использовать** |
| SEO-A Core | terminology + power + H1 — **отдельный gate** |
| Schema Migration | **отдельный gate** (этот документ) |
| SEO-B | **параллельно** с Phase A |

---

## Целевой @graph (4 узла)

```text
WebPage
BreadcrumbList
Organization   @id = https://evrace.by/operator/{slug}
LocalBusiness  @id = {canonical}#business
               provider → Organization
               mainEntityOfPage → WebPage
```

**Запрещено:** `ElectricVehicleChargingStation`, `WebPage.mainEntity`

---

## Local PASS

```bash
node scripts/verify-location-seo-local.mjs
```

| Check | Result |
|-------|--------|
| Graph types | WebPage, BreadcrumbList, Organization, LocalBusiness |
| EVCS absent | ✅ |
| Organization `@id` | `https://evrace.by/operator/zaryadka` |
| provider link | ✅ |
| infra props | max_power_kw, total_installed_kw, … |

---

## Production gate (3 URL)

| Alias | Kind | URL |
|-------|------|-----|
| AC-MST | AC | `https://evrace.by/zaryadka/minsk-mstislavca-6` |
| MIX-ZAR | ACDC | `https://evrace.by/zaryadka/minsk-inzhenernaya-18` |
| DC-ORG | DC | `https://evrace.by/orange/minsk-per-rabochiy-6` |

### Автоматическая smoke (View Source audit)

```bash
node scripts/verify-phase-a-schema-production.mjs
```

### Ручная приёмка (обязательно)

На **каждом** URL из таблицы:

| # | Инструмент | Критерий |
|---|------------|----------|
| 1 | [validator.schema.org](https://validator.schema.org/) | **0 errors, 0 warnings** |
| 2 | [Google Rich Results Test](https://search.google.com/test/rich-results) | типы распознаны; 0 critical errors |
| 3 | View Source | `@graph` содержит WebPage, BreadcrumbList, LocalBusiness, Organization; нет EVCS |

### Production results

| URL | validator | Rich Results | View Source script | PASS |
|-----|-----------|--------------|-------------------|------|
| AC-MST | ⏳ | ⏳ | ⏳ | ⏳ |
| MIX-ZAR | ⏳ | ⏳ | ⏳ | ⏳ |
| DC-ORG | ⏳ | ⏳ | ⏳ | ⏳ |

---

## Schema foundation = ЗАКРЫТ когда

```text
Все 3 URL: validator 0/0 + verify-phase-a-schema-production PASS
```

После закрытия — **не возвращаемся к архитектуре structured data до Stage 3** (Phase B/C: AggregateRating, Review).

---

## Файлы Phase A

| Файл | Изменение |
|------|-----------|
| `functions/_lib/location-seo.js` | `buildLocationJsonLdGraph`, `buildOperatorOrganizationId` |
| `scripts/verify-phase-a-schema-production.mjs` | новый |
| `scripts/verify-location-seo-local.mjs` | LocalBusiness checks |
| `scripts/verify-seo-a-p0-production.mjs` | LocalBusiness checks |
| `scripts/verify-location-seo-production.mjs` | LocalBusiness checks |

Meta / H1 / UI / power — **без изменений**.
