# Phase A — Schema Migration Verification Report

**Статус:** IMPLEMENTED — **production View Source PASS** (2026-06-05)  
**Коммит:** `2c5ff11`  
**Manual pending:** validator.schema.org + Google Rich Results Test (0/0 sign-off)

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

## Production — automated audit PASS

**Deploy:** `2c5ff11` · **Date:** 2026-06-05

```bash
node scripts/verify-phase-a-schema-production.mjs   # overall: PASS (3/3)
node scripts/verify-seo-a-p0-production.mjs         # overall: PASS (3/3)
```

| Alias | Kind | Graph types | EVCS | Org `@id` | max / sum kW | Auto |
|-------|------|-------------|------|-----------|--------------|------|
| AC-MST | AC | WebPage, BreadcrumbList, Organization, LocalBusiness | absent | `/operator/zaryadka` | 44 / 176 | **PASS** |
| MIX-ZAR | ACDC | same | absent | `/operator/zaryadka` | 160 / 732 | **PASS** |
| DC-ORG | DC | same | absent | `/operator/orange` | 160 / 320 | **PASS** |

Подтверждено на prod HTML:

- `LocalBusiness.mainEntityOfPage` → canonical ✅
- `WebPage.mainEntity` **отсутствует** ✅
- `LocalBusiness.provider` → `Organization.@id` ✅
- SEO-A Core: terminology + power alignment ✅

### Production results — manual tools

| URL | validator 0/0 | Rich Results | PASS |
|-----|---------------|--------------|------|
| AC-MST | ⏳ ваш sign-off | ⏳ | ⏳ |
| MIX-ZAR | ⏳ | ⏳ | ⏳ |
| DC-ORG | ⏳ | ⏳ | ⏳ |

Ссылки (AC-MST пример):

- [validator.schema.org](https://validator.schema.org/#url=https%3A%2F%2Fevrace.by%2Fzaryadka%2Fminsk-mstislavca-6)
- [Rich Results Test](https://search.google.com/test/rich-results?url=https%3A%2F%2Fevrace.by%2Fzaryadka%2Fminsk-mstislavca-6)

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
