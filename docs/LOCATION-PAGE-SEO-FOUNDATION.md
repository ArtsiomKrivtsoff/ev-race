# SEO-фундамент EV RACE — production-анализ и план до Stage 3

**Дата:** 2026-06-05  
**Контекст:** аудит production (Claude + ChatGPT) + сверка с live HTML  
**Эталоны:**  
- `https://evrace.by/zaryadka/minsk-inzhenernaya-18`  
- `https://evrace.by/orange/minsk-per-rabochiy-6`

**Статус документа:** решения зафиксированы в [`SEO-A-DECISIONS.md`](SEO-A-DECISIONS.md)

---

## Позиция

Не согласны с формулировкой «SEO-A закрыт на 90%» и переносом критичных задач в SEO-B / Stage 3.

**Цель EV RACE:** не «валидная страница», а **максимально сильная SEO-карточка зарядной локации** и **быстрая индексация сотен URL** сразу после релиза.

**SEO-фундамент (до Stage 3 / отзывов):**

1. ElectricVehicleChargingStation — расследование + formal PASS  
2. Single H1  
3. Internal linking (`stations.html`, `map.html` → location)  
4. Dynamic sitemap (все location pages)  
5. Description — закреплённый контракт (тип станции + коннекторы)

Stage 3 (отзывы) — **только после** закрытия фундамента.

---

## Терминология

| Блок | Содержание | Статус |
|------|------------|--------|
| **SEO-A** | Schema, terminology, power, H1, description, JSON-LD на location page | P0 — закрытие после fix |
| **SEO-B** | dynamic sitemap → `map.html` → location → `stations.html` → location | P1 — **NEXT** |
| **Platform** | Reviews, Ratings, Photos, Tags, Community | После SEO-A + SEO-B |

Internal linking и sitemap — **SEO-B**, не Stage 3. Могут быть важнее JSON-LD для индексации.

Подробности: [`SEO-A-DECISIONS.md`](SEO-A-DECISIONS.md).

---

## 1. ElectricVehicleChargingStation — расследование

### Вопросы и ответы по production HTML (2026-06-05)

| Вопрос | Ответ |
|--------|-------|
| Есть ли EVCS в production HTML? | **Да** — один `<script type="application/ld+json">` с `@graph` |
| Полный блок? | `WebPage` + `ElectricVehicleChargingStation` + `BreadcrumbList` |
| Валиден ли по Schema.org? | **Да** — тип существует, поля на месте, связка через `@id` / `mainEntity` |

### Пример production JSON-LD (сокращённо)

URL: `https://evrace.by/zaryadka/minsk-inzhenernaya-18`

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://evrace.by/zaryadka/minsk-inzhenernaya-18",
      "mainEntity": { "@id": "https://evrace.by/zaryadka/minsk-inzhenernaya-18#evcs" },
      "breadcrumb": { "@id": "https://evrace.by/zaryadka/minsk-inzhenernaya-18#breadcrumb" }
    },
    {
      "@type": "ElectricVehicleChargingStation",
      "@id": "https://evrace.by/zaryadka/minsk-inzhenernaya-18#evcs",
      "name": "Зарядная станция Zaryadka — Минск, Инженерная, 18",
      "url": "https://evrace.by/zaryadka/minsk-inzhenernaya-18",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Инженерная, 18",
        "addressLocality": "Минск",
        "addressCountry": "BY"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 53.842938,
        "longitude": 27.689904
      },
      "operator": { "@type": "Organization", "name": "Zaryadka" },
      "additionalProperty": [
        { "@type": "PropertyValue", "name": "connector_types", "value": "CCS, GBT, Type 2" },
        { "@type": "PropertyValue", "name": "max_power_kw", "value": 160 },
        { "@type": "PropertyValue", "name": "station_count", "value": 8 },
        { "@type": "PropertyValue", "name": "simultaneous_charging_count", "value": 16 },
        { "@type": "PropertyValue", "name": "max_dc_kw", "value": 160 },
        { "@type": "PropertyValue", "name": "max_ac_kw", "value": 44 }
      ]
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://evrace.by/zaryadka/minsk-inzhenernaya-18#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://evrace.by/" },
        { "@type": "ListItem", "position": 2, "name": "Зарядные станции", "item": "https://evrace.by/stations.html" },
        { "@type": "ListItem", "position": 3, "name": "Минск, Инженерная, 18", "item": "https://evrace.by/zaryadka/minsk-inzhenernaya-18" }
      ]
    }
  ]
}
```

### Почему Rich Results Test показывает BreadcrumbList, но не EVCS?

| Инструмент | Что показывает |
|------------|----------------|
| **Google Rich Results Test** | Типы, **eligible for visual rich results** в Google Search |
| **Schema Markup Validator** (validator.schema.org) | **Все** найденные Schema.org-объекты |

- **BreadcrumbList** — в [Google Search Gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) → RRT его показывает.  
- **ElectricVehicleChargingStation** — **нет в Gallery**. Google **не обещает** отдельный rich snippet для EVCS. RRT может **не выводить** его в списке «Rich results», хотя объект **есть в HTML** и **валиден**.

Это не «объект отсутствует» — это «Google не считает EVCS rich result type».

### Критерии PASS для EVCS (предложение)

| Уровень | Критерий | Статус (2026-06-05) |
|---------|----------|---------------------|
| **A. Infrastructure PASS** | EVCS в production HTML; Schema.org Validator — 0 errors на объекте | HTML ✅; Validator — нужен скрин |
| **B. Rich Results PASS** | EVCS в RRT «Detected structured data» | **N/A / не гарантируется Google** |

**Formal close пункта 1:**

1. Schema.org Validator — 0 errors на EVCS (скрин по URL).  
2. Production HTML — EVCS present (факт зафиксирован выше).  
3. RRT — задокументировать: «0 eligible rich results для EVCS — ожидаемо, не блокер».

**Rich Results Test:**  
https://search.google.com/test/rich-results?url=https%3A%2F%2Fevrace.by%2Fzaryadka%2Fminsk-inzhenernaya-18

**Вывод:** формулировка аудита «EVCS не найден» отражала **старую prod-версию** (до `@graph`) или **интерпретацию RRT**, а не отсутствие разметки в текущем HTML.

---

## 2. Single H1

### Что показал production-аудит

- Два `<h1>` в DOM: desktop + mobile hero одновременно; один скрыт CSS.  
- Системная ошибка шаблона, воспроизводится на всех локациях.

### Production сейчас (2026-06-05)

Проверено на `minsk-inzhenernaya-18` и `minsk-per-rabochiy-6`:

| Маркер | Значение |
|--------|----------|
| `<h1>` count | **1** |
| Разметка | `<h1 class="loc-hero-name" id="loc-title"><span class="loc-hero-city">…</span><span class="loc-hero-street">…</span></h1>` |
| Shell | `loc-hero-shell` + `display: contents` — без второго identity в DOM |

**Вывод:** проблема **была реальной**; на текущем prod **исправлена**. Для закрытия — повторный production-снимок (View Source / verifier).

**Gate (предложение):** `node scripts/verify-location-seo-production.mjs` + ручная проверка 3–5 URL.

---

## 3. Internal linking — план и объём

### Факт production

- `stations.js` — строки таблицы **без** `href` на `/{operator_slug}/{slug}` (только `data-loc-id`).  
- `map.html` — popup: маршрут есть, **ссылки на location page нет**.  
- В `docs/IMPLEMENTATION_SPEC.md` §9.11 описано, **не реализовано**.

### План: `stations.html` → location

1. В Supabase-запрос — JOIN `locations` → `operator_slug`, `slug` (и опционально `cached_avg_rating`).  
2. В `renderTableRow` / `renderGroupRows` / mobile cards:  
   - адрес / локация → `<a href="https://evrace.by/{operator_slug}/{slug}">`  
   - групповой заголовок — та же ссылка.  
3. Fallback: если slug нет — строка без ссылки (не ломать UI).

### План: `map.html` → location

1. В данные маркера — `operator_slug` + `slug`.  
2. В popup: «Подробнее →» / «КАРТОЧКА ЛОКАЦИИ» после адреса.  
3. Surgical change — не переписывать popup logic.

### Оценка объёма

| Задача | Оценка | Риск |
|--------|--------|------|
| Slug в API stations/map | 0.5–1 д | JOIN по `location_key` |
| stations.html (desktop + mobile + group) | 1–1.5 д | Regression таблицы |
| map.html popup link | 0.5 д | Низкий |
| Smoke 10–20 URL | 0.5 д | — |
| **Итого** | **~2.5–3.5 дня** | Зависит от полноты slug в БД |

**Приоритет:** выше Stage 3. Без входных ссылок Google находит location pages дольше.

---

## 4. Dynamic sitemap — план и пример

### Факт production

`sitemap.xml` — **статический**, **10 URL**, **0 location pages**:

- `/`, `stations.html`, `map.html`, `tour.html`, `letters.html`  
- 5× `operators/*.html`

Location pages **не покрыты**.

### План

**Вариант A — Cloudflare Function `/sitemap.xml` (рекомендуется):**

- Pages Function или edge route.  
- Supabase: `SELECT operator_slug, slug, updated_at FROM locations …`  
- Cache 1–24 ч.  
- Статические URL + все locations.

**Вариант B — GitHub Actions cron** (как в IMPLEMENTATION_SPEC §8.1):

- Nightly → commit `sitemap.xml`.  
- Минус: задержка до 24 ч на новые локации.

### Пример entry

```xml
<url>
  <loc>https://evrace.by/zaryadka/minsk-inzhenernaya-18</loc>
  <lastmod>2026-06-05</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
```

Проверить: `robots.txt` → `Sitemap: https://evrace.by/sitemap.xml`.

### Оценка объёма

| Задача | Оценка |
|--------|--------|
| Supabase query + edge function | ~1 д |
| XML generation + cache | ~0.5 д |
| Search Console submit | ~0.5 ч |
| **Итого** | **~1.5–2 дня** |

**Приоритет:** обязателен до массового релиза сотен URL.

---

## 5. Description — контракт

### Правила intro (по `station_type`)

| Тип в БД | Intro |
|----------|-------|
| **DC** | Быстрая зарядная станция |
| **ACDC** | Быстрая зарядная станция |
| **AC** (локация без DC/ACDC) | Зарядная станция переменного тока |

Термин slow-AC на русском — **не использовать**.

### Коннекторы (обязательно)

Блок «Разъёмы …» с **raw labels из БД:**

- CCS, CCS2, GBT, CHAdeMO, Type 2, …

Поисковые запросы: «GBT зарядка Минск», «CCS зарядка Минск», «Type 2 зарядка Минск».

### Production snapshot (2026-06-05)

Zaryadka:

```text
Быстрая зарядная станция Zaryadka — Минск, Инженерная, 18. Зарядка электромобилей до 160 кВт. Разъёмы CCS, GBT и Type 2. Отзывы, фото и маршрут на EV RACE.
```

Orange:

```text
Быстрая зарядная станция Orange — Минск, пер. Рабочий, 6. Зарядка электромобилей до 160 kW. Разъёмы CCS и GBT. …
```

**Замечание:** сверить raw labels (CCS2 vs CCS) на 2–3 локациях при formal close.

---

## 6. H1 — контракт (визуал)

| Случай | DOM |
|--------|-----|
| Без `location_name` | `<h1>`: строка 1 — город (`loc-hero-city`), строка 2 — адрес (`loc-hero-street`, `data-fit-line`) |
| С `location_name` | город + адрес + venue (`loc-hero-venue`) |
| Количество `<h1>` | **Ровно 1** на странице |

---

## 7. Очередность работ

| # | Блок | Prod (2026-06-05) | Действие |
|---|------|---------------------|----------|
| 1 | EVCS investigation | HTML ✅; RRT — уточнить критерий | Formal report: HTML + Schema Validator + пояснение RRT |
| 2 | Single H1 | ✅ (1 h1) | Re-verify + зафиксировать |
| 3 | Internal linking | ❌ | Реализация ~3 д |
| 4 | Dynamic sitemap | ❌ | Реализация ~2 д |
| 5 | Description contract | ⚠️ mostly done | AC-only smoke + raw connector labels |

**Stage 3** — после пунктов 1–4 (+ description contract).

---

## 8. Чеклист закрытия SEO-фундамента

- [ ] EVCS: production HTML dump + Schema.org Validator 0 errors (скрин)  
- [ ] EVCS: документировано поведение Rich Results Test  
- [ ] H1: production — ровно 1 на 5+ URL  
- [ ] Description: DC / AC / ACDC smoke на 3 локациях  
- [ ] Description: коннекторы raw из БД в meta  
- [ ] `stations.html` → ссылки на все локации со slug  
- [ ] `map.html` → ссылка в popup  
- [ ] `sitemap.xml` → все location URLs + lastmod  
- [ ] Search Console: sitemap submitted  

**Только после всех пунктов → Stage 3.**

---

## 9. Вопросы для согласования

1. **EVCS PASS:** принимаем Schema.org Validator + presence in HTML, если RRT не показывает EVCS как rich result?  
2. **H1:** достаточно re-verify на prod или автоматический прогон 10 URL?  
3. **Sitemap:** dynamic Cloudflare Function или cron+commit (IMPLEMENTATION_SPEC)?  
4. **Stations linking:** ссылка на всю строку/карточку или только на адрес?

---

## Связанные документы

- `docs/LOCATION-PAGE-SEO-AUDIT.md` — исходный аудит  
- `docs/LOCATION-PAGE-SEO-A-VERIFICATION.md` — verification report (частично устарел до `@graph`)  
- `docs/IMPLEMENTATION_SPEC.md` — §8.1 sitemap, §9.11 internal linking  
- `scripts/verify-location-seo-production.mjs` — автоматическая проверка location page  
