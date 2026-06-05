# SEO-A Final Audit — POST AUDIT FIXES

**Дата:** 2026-06-05  
**Тип:** аудит production + код (без реализации)  
**Эталонные URL:**

| Код | URL | Профиль |
|-----|-----|---------|
| AC-MST | `https://evrace.by/zaryadka/minsk-mstislavca-6` | AC-only, validator error |
| DC-ORG | `https://evrace.by/orange/minsk-per-rabochiy-6` | DC |
| MIX-ZAR | `https://evrace.by/zaryadka/minsk-inzhenernaya-18` | DC + AC |
| DC-MAL | `https://evrace.by/malanka/minsk-goshkevicha-3` | Malanka DC hub |

**Lighthouse:** `https://evrace.by/zaryadka/minsk-inzhenernaya-18` (MIX-ZAR)

**Статусы:** `PASS` · `FAIL` · `RECOMMENDATION`

> **Зафиксированные решения (2026-06-05):** см. [`SEO-A-DECISIONS.md`](SEO-A-DECISIONS.md) — источник истины для реализации и приёмки. Open questions ниже закрыты.

---

## Executive Summary

| # | Блок | Статус | Блокер Stage 3? |
|---|------|--------|-----------------|
| 1 | Schema Validator — `mainEntity` → EVCS | **FAIL** | **Да** |
| 2 | AC terminology (UI + контракт) | **FAIL** | **Да** |
| 3 | Power semantics (SEO vs UI) | **FAIL** | **Да** |
| 4 | Lighthouse | **RECOMMENDATION** | Нет (до замеров — не блокер) |
| 5 | SEO consistency (5 слоёв) | **FAIL** (частично) | **Да** (power + JSON-LD name) |

**SEO-A закрыт:** **НЕТ**

**Gate до Stage 3:**

```text
validator.schema.org = 0 errors (на AC-MST и ещё 2 URL)
location pages = единая power/terminology модель
```

---

## 1. CRITICAL — Schema Validator Error

### Статус: **FAIL**

### Факт (production AC-MST)

`validator.schema.org` на `https://evrace.by/zaryadka/minsk-mstislavca-6`:

> **ElectricVehicleChargingStation** — недопустимый тип целевого объекта для свойства **mainEntity**

### Production JSON-LD (фрагмент)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://evrace.by/zaryadka/minsk-mstislavca-6",
      "mainEntity": { "@id": "https://evrace.by/zaryadka/minsk-mstislavca-6#evcs" }
    },
    {
      "@type": "ElectricVehicleChargingStation",
      "@id": "https://evrace.by/zaryadka/minsk-mstislavca-6#evcs",
      "name": "Зарядная станция Zaryadka — Минск, Мстиславца, 6",
      "address": { "@type": "PostalAddress", … },
      "geo": { "@type": "GeoCoordinates", … }
    },
    {
      "@type": "BreadcrumbList",
      …
    }
  ]
}
```

Объект **EVCS присутствует** в HTML. Ошибка — в **связке** `WebPage.mainEntity → @id → EVCS`, а не в отсутствии типа.

### Расследование: допустима ли связка WebPage → mainEntity → EVCS?

| Источник | Вывод |
|----------|-------|
| **Schema.org (spec)** | `WebPage.mainEntity` → range **Thing**. `ElectricVehicleChargingStation` ⊂ … ⊂ **Thing**. Формально допустимо. |
| **validator.schema.org (Google)** | **Отклоняет** EVCS как target `mainEntity` на WebPage. Валидатор использует **ужесточённый профиль типов**, не полный OWL-граф schema.org. |
| **Rich Results Test** | BreadcrumbList — eligible. EVCS — **не rich result type** (отдельная тема). |

**Вывод:** Rich Results Test «видит BreadcrumbList, не видит EVCS как rich result» и Validator error — **разные phenomena**. Validator error — **реальный FAIL**, требует правки разметки.

### Альтернативы

#### Вариант A — `@graph` без `WebPage.mainEntity` (**рекомендуется**)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": "…", "url": "…", "name": "…", "description": "…", "breadcrumb": { "@id": "…#breadcrumb" } },
    { "@type": "ElectricVehicleChargingStation", "@id": "…#evcs", "mainEntityOfPage": { "@id": "…" }, … },
    { "@type": "BreadcrumbList", "@id": "…#breadcrumb", … }
  ]
}
```

- Убрать `WebPage.mainEntity`.
- На EVCS добавить **`mainEntityOfPage`** → `@id` страницы (inverse property, [schema.org/mainEntityOfPage](https://schema.org/mainEntityOfPage)).
- EVCS остаётся полным объектом в graph.

**Ожидание:** 0 errors на Validator (проверить на 3 URL после деплоя).

#### Вариant A-minimal — flat graph, без cross-links

Два/три независимых узла в `@graph` без `mainEntity` / `mainEntityOfPage`.  
Проще, но слабее семантическая связь «страница описывает станцию».

#### Вариант B — `mainEntity` → Place / LocalBusiness

```json
"mainEntity": { "@type": ["Place", "ElectricVehicleChargingStation"], … }
```

или nested inline object вместо `@id` reference.

**Риск:** Validator может принять Place, но **дублирование** с отдельным EVCS-узлом; возможны новые warnings. Требует A/B теста в Validator **до** выбора.

#### Вариант C — только EVCS script, без WebPage

Минимализм. BreadcrumbList придётся вешать отдельно или терять связь с WebPage.

### Рекомендация

| Приоритет | Действие |
|-----------|----------|
| **1** | **Вариант A** — убрать `mainEntity` с WebPage, добавить `mainEntityOfPage` на EVCS |
| **2** | Прогнать Validator на AC-MST, MIX-ZAR, DC-ORG → **0 errors, 0 warnings** |
| **3** | Зафиксировать скрины Validator в verification report |

### Критерий PASS

```text
validator.schema.org (AC-MST + 2 mixed URLs) = 0 errors, 0 warnings
EVCS object still present in HTML @graph
```

---

## 2. AC Terminology Fix

### Статус: **FAIL**

### Факт production

На **всех** location pages в блоке легенды инфраструктуры (HTML):

```text
AC — ЗАРЯДКА ПЕРЕМЕННЫМ ТОКОМ
```

(до P0-fix: устаревшая формулировка в `station-badges.js`, удалена)

Источник: `functions/_lib/station-badges.js` → `renderDcAcLegend()`.

Production AC-MST: строка **присутствует** в HTML (`SLOW: True`).

### Description / SEO слои — PASS по intro

AC-MST meta description:

```text
Зарядная станция переменного тока Zaryadka — Минск, Мстиславца, 6. Зарядка электромобилей до 44 кВт. …
```

| `station_type` | Intro (meta, og, JSON-LD description) | Статус |
|----------------|----------------------------------------|--------|
| DC | Быстрая зарядная станция | ✅ PASS |
| ACDC | Быстрая зарядная станция | ✅ (логика в коде) |
| AC (pure) | Зарядная станция переменного тока | ✅ PASS на AC-MST |

### UI — FAIL

| Место | Текущее | Требуется |
|-------|---------|-----------|
| Location legend | устаревший slow-AC термин (удалён) | `AC — ПЕРЕМЕННЫЙ ТОК` или `AC — ЗАРЯДКА ПЕРЕМЕННЫМ ТОКОМ` |
| index.html, index_new.html, v2 | то же (legacy home) | синхронизировать при общем рефакторе |

**Запрещено:** slow-AC термин на русском — в UI, SEO, JSON-LD.

### Description Contract (зафиксировать глобально)

```text
DC     → Быстрая зарядная станция {operator} — {city}, {address}.
ACDC   → Быстрая зарядная станция {operator} — {city}, {address}.
AC     → Зарядная станция переменного тока {operator} — {city}, {address}.
```

Применяется к: `meta description`, `og:description`, JSON-LD `description`, UI copy.

**Исключение (осознанное):** JSON-LD `name` сегодня нейтральный (`Зарядная станция …` без intro) — см. §5.

### Рекомендация

1. Заменить строку в `station-badges.js` (1 строка, все location pages).  
2. `node scripts/check-ac-terminology.mjs` → exit 0 в user-facing copy.  
3. Smoke AC-MST + MIX-ZAR после деплоя.

### Критерий PASS

```text
Production HTML: нет запрещённого slow-AC термина на location pages
Description contract: AC/DC/ACDC smoke на 3 URL
```

---

## 3. Power Semantics Audit

### Статус: **FAIL** (системный конфликт SEO ↔ UI)

### Две модели в коде сегодня

| Слой | Функция | Формула | Смысл |
|------|---------|---------|-------|
| **UI KPI** | `computeLocationMetrics()` | `Σ (dc_power + ac_power) × count` | Суммарная установленная мощность локации |
| **SEO** | `computeSeoStationStats()` + `formatPowerPhrase()` | `max(dc_power)`, `max(ac_power)` | **Максимум одного поста** («до N кВт») |

### Production факты

| URL | UI KPI | SEO «до … кВт» | Станций | Авто |
|-----|--------|----------------|---------|------|
| AC-MST | **176 кВт** | **44 кВт** | 4 | 8 |
| DC-ORG | **320 кВт** | **160 кВт** | 2 | ? |
| MIX-ZAR | **732 кВт** | **160 кВт** | 8 | 16 |
| DC-MAL | **360 кВт** | **120 кВт** | ? | ? |

**AC-MST:** 4 × 44 kW AC = 176 UI; SEO берёт max = 44. Пользователь видит **176** и читает в Google **44** — разные истории.

**MIX-ZAR:** UI 732 (DC+AC sum); SEO «до 160» = max DC post. Разрыв **4.5×**.

### Предлагаемый SEO контракт (на утверждение)

Принцип: **«до X кВт» = максимальная мощность одного зарядного поста** (лучше для поиска «160 kW CCS Минск»). UI должен **не противоречить**, а **уточнять масштаб локации**.

| Категория | SEO description | UI KPI (primary) | UI secondary (optional) |
|-----------|-----------------|------------------|-------------------------|
| **Single DC** (count=1) | до `{maxDc}` кВт | до `{maxDc}` кВт | — |
| **Multi DC** | до `{maxDc}` кВт | **до `{maxDc}` кВт** (не sum) | «`{stationCount}` постов · `{totalDc}` кВт суммарно» |
| **Single AC** | до `{maxAc}` кВт | до `{maxAc}` кВт | — |
| **Multi AC** | до `{maxAc}` кВт | **до `{maxAc}` кВт** | «`{stationCount}` постов · `{totalAc}` кВт суммарно» |
| **Multi DC + AC (mixed)** | до `{maxDc}` кВт (fast intro) | **до `{maxDc}` кВт** | «`{stationCount}` постов · `{totalPower}` кВт на локации» |
| **ACDC** | Быстрая … до `{max(maxDc, dc side)}` кВт | max DC post | указать AC max отдельно в infra, не в SEO phrase |

**JSON-LD `additionalProperty`:**

| Property | Значение |
|----------|----------|
| `max_power_kw` | max single post (как SEO) |
| `max_dc_kw` / `max_ac_kw` | как сейчас |
| `total_installed_kw` | **новое** — UI sum (опционально) |
| `station_count` | как сейчас |
| `simultaneous_charging_count` | как сейчас |

### Рекомендация

1. **Утвердить контракт** (таблица выше) — product decision.  
2. Изменить **UI KPI primary** с sum → «до {max} кВт» (aligned with SEO).  
3. Sum / station count — вторичная строка в infra block (уже есть badge «N станций»).  
4. После деплоя — таблица AC-MST / MIX-ZAR должна совпадать по primary power.

### Критерий PASS

```text
На 4 эталонных URL: SEO «до N кВт» = UI primary KPI (±0)
JSON-LD max_power_kw = N
```

---

## 4. Lighthouse Audit

### Статус: **RECOMMENDATION** (замеры выполнены; решение по карте — после обсуждения)

**URL:** MIX-ZAR · **Дата:** 2026-06-05 · **Tool:** Lighthouse 13.3.0 (Headless Chrome)

### Category scores

| | Mobile | Desktop |
|---|--------|---------|
| **Performance** | **85** | **63** |
| **Accessibility** | **84** | **84** |
| **Best Practices** | **77** | **77** |
| **SEO** | **100** | **100** |

### Core metrics (lab)

| Metric | Mobile | Desktop |
|--------|--------|---------|
| **LCP** | 2.7 s | 2.7 s |
| **CLS** | 0.045 | 0.003 |
| **TBT** | 170 ms | 170 ms |
| **INP** | n/a (lab) | n/a (lab) |

LCP element — hero text / layout (не карта как LCP на mobile при текущих замерах).

### Влияние Leaflet

На каждой location page подключается:

- `/CSS/vendor/leaflet.css`
- `/JS/location-map.js` → Leaflet + CARTO tiles (network)

Bootup-time audit: `location-map.js`, `mc.yandex.ru/metrika`, unused CSS.

### Варианты (решение после обсуждения)

| Вариант | Суть | Плюсы | Минусы |
|---------|------|-------|--------|
| **A — as is** | Карта сразу | Простота, SEO 100 | Desktop Perf 63 |
| **B — lazy load** | Leaflet после `IntersectionObserver` / idle | −JS/tiles на FCP | Карта пустая до scroll |
| **C — static + click** | `<img>` / static tile preview → «Открыть карту» | Лучший LCP/TBT | −UX интерактива до клика |

### Рекомендация

- **Сейчас:** не блокер Stage 3 (SEO 100, mobile perf 85).  
- **Перед массовым релизом:** **RECOMMENDATION B** — lazy init Leaflet после hero visible; повторить Lighthouse desktop (цель Perf ≥ 75).  
- **Field INP:** после релиза — Search Console Core Web Vitals (lab не меряет INP).

---

## 5. SEO Consistency Audit

### Статус: **FAIL** (частичный PASS)

Проверено 4 production URL (AC-only, DC, mixed, Malanka). ACDC-only URL на prod **не найден** в выборке — **RECOMMENDATION:** добавить 5-й URL после идентификации ACDC локации в БД.

### Матрица (production)

| Слой | AC-MST | DC-ORG | MIX-ZAR | DC-MAL | Логика |
|------|--------|--------|---------|--------|--------|
| **Title** | Зарядная станция {op} — {place} \| EV RACE | ✅ | ✅ | ✅ | ✅ PASS |
| **H1** | {city}, {address} (2 строки) | ✅ | ✅ | ✅ | ✅ PASS |
| **Meta desc intro** | переменного тока | Быстрая | Быстрая | Быстрая | ✅ PASS |
| **Meta desc power** | 44 kW | 160 kW | 160 kW | 120 kW | ⚠️ vs UI — см. §3 |
| **OG title** | = Title | ✅ | ✅ | ✅ | ✅ PASS |
| **OG desc** | короткий, без intro | ✅ by design | ✅ | ✅ | ✅ PASS |
| **JSON-LD name** | нейтральный «Зарядная станция …» | ✅ | ✅ | ✅ | ⚠️ **без intro** |
| **JSON-LD description** | = meta description | ✅ | ✅ | ✅ | ✅ PASS |

### Выявленные конфликты

| # | Конфликт | Статус |
|---|----------|--------|
| 1 | UI power ≠ SEO power | **FAIL** (§3) |
| 2 | JSON-LD `name` без charge-kind intro, description — с intro | **RECOMMENDATION:** унифицировать: либо name += intro prefix, либо document as intentional |
| 3 | Title / H1 / JSON-LD name — разные шаблоны (H1 без «Зарядная станция», name без intro) | **RECOMMENDATION:** OK для UX если задокументировано; Title остаётся primary SERP |
| 4 | slow-AC термин в UI vs «переменного тока» в SEO | **FAIL** (§2) |

### Single H1 (regression check)

AC-MST production: **`<h1>` count = 1** — **PASS** (post-fix hero shell).

---

## Приоритеты реализации (после утверждения)

| Order | Task | Effort | Blocks Stage 3 |
|-------|------|--------|----------------|
| **P0** | Schema: убрать `WebPage.mainEntity`, `mainEntityOfPage` на EVCS | ~0.5 d | **SEO-A** |
| **P0** | AC terminology — `check-ac-terminology.mjs` → exit 0 | ~0.1 d | **SEO-A** |
| **P0** | Power contract + UI KPI align | ~1 d | **SEO-A** |
| **P1** | `stations.html` → location | ~1–1.5 d | **SEO-B** |
| **P1** | `map.html` → location | ~0.5 d | **SEO-B** |
| **P1** | Dynamic sitemap | ~1.5–2 d | **SEO-B** |

---

## Open Questions (для обсуждения)

~~1. **Schema fix:** подтверждаем **Вариант A** (`mainEntityOfPage` на EVCS)?~~ → **Да.** [`SEO-A-DECISIONS.md`](SEO-A-DECISIONS.md) §1  
~~2. **Power:** primary KPI = «до max kW»; sum — secondary в UI?~~ → **Да.** §3  
~~3. **JSON-LD name:** оставляем нейтральным или добавляем intro?~~ → **Нейтральный, без intro.** §4  
~~4. **Lighthouse:** lazy map до массового релиза или после?~~ → **Backlog, не блокер.** §5  
~~5. **ACDC URL:** указать эталонную локацию?~~ → **Не искать; smoke 5–10 случайных URL.** §6  

---

## Связанные документы

- `docs/LOCATION-PAGE-SEO-FOUNDATION.md` — приоритеты linking + sitemap  
- `docs/LOCATION-PAGE-SEO-A-VERIFICATION.md` — предыдущий verification (частично устарел)  
- `functions/_lib/location-seo.js` — SEO templates  
- `functions/_lib/location-render.js` — UI metrics  
- `functions/_lib/station-badges.js` — AC legend  

---

## Sign-off checklist (после fixes)

- [ ] validator.schema.org — 0 errors, 0 warnings (AC-MST, MIX-ZAR, DC-ORG)  
- [ ] Production HTML — EVCS in `@graph`  
- [ ] Single H1 — 5 URL  
- [ ] No slow-AC banned term on location pages  
- [ ] Power SEO = UI primary on 4 эталона  
- [ ] Description contract AC/DC/ACDC — 3 URL  
- [ ] Internal linking plan approved → implementation  
- [ ] Dynamic sitemap plan approved → implementation  

**Только после sign-off → Stage 3 (Reviews & Ratings).**
