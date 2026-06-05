# EV RACE Location Pages — SEO & Structured Data Audit (результат)

**Дата:** 2026-06-05  
**Тестовая страница:** https://evrace.by/zaryadka/minsk-inzhenernaya-18  
**Режим:** audit-only (код не менялся)  
**Источники:** `functions/[operator_slug]/[slug].js`, `supabase/functions/get-location/index.ts`, `functions/_lib/location-render.js`, prod, `sitemap.xml`, `robots.txt`

---

## Мнение о ТЗ v2

Документ **сильный и практичный**: правильно отделяет Infrastructure Layer от Race, ставит JSON-LD + sitemap + internal linking в блокер, AggregateRating честно откладывает до Stage 3. Раздел **Real Search Intent** — редкая, но очень нужная часть.

**Design choice в ТЗ:** H1 — «страница места без оператора», Title — «оператор обязателен». Это **нормально**: H1 для человека на странице, Title — для SERP/Telegram с оператором как дискриминатором.

---

## 1. HTML Heading Hierarchy — FAIL

**Фактическая структура:**

```
<h1> — Минск + Инженерная, 18  (desktop hero, без id)
<h1 id="loc-title"> — Минск + Инженерная, 18  (mobile hero)
<h2> — нет
<h3> — нет
```

Секции («СТАНЦИЙ В ЛОКАЦИИ», «ОТЗЫВЫ», «РЯДОМ»…) — `<span class="blk-title">`, не heading.

**Проблемы:**

- **Два `<h1>` в DOM** — desktop + mobile hero рендерятся одновременно; на desktop mobile блок скрыт CSS, но HTML остаётся.
- **Нет H2/H3** — иерархия семантически плоская.
- **H1 по смыслу** — ок для страницы без `location_name`: город + адрес. Оператор вне H1 — соответствует философии Infrastructure.

**Рекомендация:** один `<h1>`; mobile/desktop — один identity-блок или `<h1>` только в одном месте. Секции → `<h2 class="blk-title">` без смены визуала.

---

## 2. Page Title — FAIL (частично ok)

**Фактический title (prod + код):**

```html
<title>Минск, Инженерная, 18 — зарядка | EVRACE.BY</title>
```

| Критерий | Статус |
|----------|--------|
| Оператор (Zaryadka) | нет |
| Адрес (город + улица) | да |
| Бренд | да (`EVRACE.BY`) |
| Уникальность | да (per-location) |
| ≤ 60 символов | да (~43 символа) |
| Смысл ≈ H1 | да (близко; «— зарядка» добавлено) |

**Keyword coverage:** адрес — да; оператор — нет; «зарядка» есть; «электромобиля» нет.

**Шаблон сейчас:** `buildOgTitle()` → `{city, address} — зарядка` (без оператора).

---

## 3. Meta Description — FAIL

**Фактический шаблон** (`buildOgDescription()`):

```
DC {maxDc} кВт. AC {maxAc} кВт. {connectors raw}. {city, address}
```

(+ рейтинг, если есть отзывы)

**Для тестовой страницы** (оценка по контенту, ~8 постов, CCS/GBT/Type 2):

```
DC 160 кВт. AC 44 кВт. CCS2, GBT, Type 2. Минск, Инженерная, 18
```

~65 символов — **слишком коротко** для целевых 150–160.

| Критерий | Статус |
|----------|--------|
| Уникальность | да |
| Адрес | да |
| Оператор | нет |
| DC/AC + разъёмы | да (raw labels: CCS2, не CCS) |
| Читаемость | скорее телеграф, не предложение |
| 150–160 символов | нет |
| «зарядка электромобиля» | нет |

---

## 4. URL Architecture — FAIL (частично ok)

| Проверка | Статус |
|----------|--------|
| `/{operator_slug}/{slug}` | да |
| lowercase в canonical/API | да |
| 301 с `/Zaryadka/...` | **в коде нет** — worker нормализует slug для API, но не редиректит при другом регистре URL |
| trailing slash | slug обрезается в worker; явного 301 на URL без `/` не видно — риск дублей |
| query-дубли | нет |
| operator_slug ↔ оператор | да |

**Ручная проверка:** `curl -I` для `/Zaryadka/...` и `.../` — ожидается **200 + canonical на lowercase**, не 301. Canonical частично спасает, но слабее чем 301.

---

## 5. Canonical — PASS

```html
<link rel="canonical" href="https://evrace.by/zaryadka/minsk-inzhenernaya-18">
```

lowercase, без trailing slash, формат верный.

---

## 6. Schema Consistency — FAIL

| Слой | Значение |
|------|----------|
| H1 | `Минск` + `Инженерная, 18` |
| Title | `Минск, Инженерная, 18 — зарядка \| EVRACE.BY` |
| og:title | `Минск, Инженерная, 18 — зарядка` |
| og:url | `https://evrace.by/zaryadka/minsk-inzhenernaya-18` |
| Canonical | то же |
| JSON-LD name | **отсутствует** |
| JSON-LD url | **отсутствует** |

Title ≠ H1 по формулировке (допустимо). JSON-LD пустой — consistency не закрыта.

---

## 7. Open Graph — FAIL

**Фактически:**

| Тег | Значение | По ТЗ |
|-----|----------|-------|
| og:type | `place` | должен быть `website` |
| og:title | без оператора | оператор + адрес |
| og:description | копия meta description | уникальный для OG |
| og:url | canonical | ok |
| og:image | `https://evrace.by/og.png` | рекомендуется og-map для локаций |
| og:locale | `ru_BY` | ok |
| og:site_name | `EVRACE.BY` | «EV RACE» (без года) |

Для Telegram критичны title + description + image — сейчас превью generic и без Zaryadka.

---

## 8. Twitter Card — FAIL (некритично)

Тегов `twitter:*` нет. Для BY — ok отложить.

---

## 9. JSON-LD — ОТСУТСТВУЕТ (критично)

| Тип | Статус |
|-----|--------|
| ElectricVehicleChargingStation | **ОТСУТСТВУЕТ** |
| BreadcrumbList | **ОТСУТСТВУЕТ** |
| AggregateRating | N/A до Stage 3 |

В `<head>` нет `application/ld+json`.

**Целевые структуры (из ТЗ):**

```json
{
  "@context": "https://schema.org",
  "@type": "ElectricVehicleChargingStation",
  "name": "Zaryadka — Минск, Инженерная 18",
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
  "amenityFeature": [
    {"@type": "LocationFeatureSpecification", "name": "DC charging", "value": true},
    {"@type": "LocationFeatureSpecification", "name": "CCS", "value": true},
    {"@type": "LocationFeatureSpecification", "name": "GBT", "value": true}
  ],
  "url": "https://evrace.by/zaryadka/minsk-inzhenernaya-18"
}
```

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Главная", "item": "https://evrace.by/"},
    {"@type": "ListItem", "position": 2, "name": "Зарядные станции", "item": "https://evrace.by/stations.html"},
    {"@type": "ListItem", "position": 3, "name": "Минск"},
    {"@type": "ListItem", "position": 4, "name": "Инженерная, 18"}
  ]
}
```

Примечание: «Зарядные станции», не «Станции 2026» — Infrastructure Layer.

---

## 10. Geo-теги — FAIL (средний)

На location page нет:

```html
<meta name="geo.region" content="BY">
<meta name="geo.placename" content="Минск">
<meta name="geo.position" content="53.842938;27.689904">
<meta name="ICBM" content="53.842938, 27.689904">
```

На главной `geo.region=BY` есть. Координаты есть в данных и Leaflet.

---

## 11. Sitemap — FAIL

`sitemap.xml` — только статические URL. **Location URLs отсутствуют.**

Нет dynamic sitemap, priority 0.7, changefreq weekly, lastmod.

---

## 12. Robots / Indexing — PASS

- Location: `index, follow`
- 404: `noindex`
- `robots.txt`: `Allow: /`, sitemap указан
- Блокировки `/zaryadka/` и т.п. нет

---

## 13. Internal Linking

| Источник | Статус | Комментарий |
|----------|--------|-------------|
| stations.html | **FAIL** | адрес без ссылки на `/{slug}` |
| map.html | **FAIL** | нет «ОТКРЫТЬ ЛОКАЦИЮ» |
| Блок «РЯДОМ» | **PASS** | ссылки на соседние локации |
| Страница оператора | **FAIL** | только общий реестр |

---

## 14. Rich Snippets Readiness

| Тип rich snippet | Готовность | Что нужно |
|------------------|------------|-----------|
| Адрес + координаты | ~15% | ElectricVehicleChargingStation JSON-LD + geo |
| Хлебные крошки | ~10% | BreadcrumbList JSON-LD |
| Звёздочки рейтинга | 0% | AggregateRating — только после Stage 3 (≥3 отзыва) |
| Фото | 0% | Stage 4 |

---

## 15. Real Search Intent

Оценка для https://evrace.by/zaryadka/minsk-inzhenernaya-18

| Интент | H1 | Title | Description | JSON-LD | Контент |
|--------|----|-------|-------------|---------|---------|
| зарядка электромобиля Минск Инженерная | MED | MED | LOW | LOW | HIGH |
| зарядная станция Zaryadka Минск | LOW | LOW | LOW | LOW | MED |
| GBT зарядка Минск | LOW | LOW | MED | LOW | HIGH |
| CCS зарядка Минск | LOW | LOW | MED | LOW | HIGH |
| быстрая зарядка электромобиля Минск | LOW | LOW | LOW | LOW | MED |
| зарядка возле Инженерной 18 | HIGH | HIGH | MED | LOW | HIGH |
| зарядка для китайского ЭМ (GBT) Минск | LOW | LOW | MED | LOW | HIGH |
| GBT зарядка Минск Инженерная | MED | MED | MED | LOW | HIGH |

**Хорошо покрыто:** адресная навигация, технический контент (мощность, CCS/GBT/Type 2 в KPI и списке станций).

**Слабо:** оператор в meta-слоях, «зарядка электромобиля», «быстрая зарядка», structured data для локального поиска.

**Менять ли H1?** — нет, H1 место-ориентированный ok. **Title + Description** — да, шаблоны. **Контент страницы** — менять не обязательно.

---

## Итоговая таблица

| Компонент | Статус | Приоритет |
|-----------|--------|-----------|
| H1/H2 | FAIL | ВЫСОКИЙ |
| Title | FAIL | ВЫСОКИЙ |
| Description | FAIL | ВЫСОКИЙ |
| URL Architecture | FAIL | КРИТИЧНО |
| Canonical | PASS | КРИТИЧНО |
| Schema Consistency | FAIL | ВЫСОКИЙ |
| Open Graph | FAIL | СРЕДНИЙ (ВЫСОКИЙ для Telegram) |
| Twitter Card | FAIL | НИЗКИЙ |
| JSON-LD ElectricVehicleChargingStation | FAIL | КРИТИЧНО |
| JSON-LD BreadcrumbList | FAIL | КРИТИЧНО |
| JSON-LD AggregateRating | N/A | ПОСЛЕ Stage 3 |
| Geo-теги | FAIL | СРЕДНИЙ |
| Sitemap | FAIL | КРИТИЧНО |
| Robots | PASS | КРИТИЧНО |
| Internal Linking | FAIL | КРИТИЧНО |
| Real Search Intent Coverage | FAIL | ВЫСОКИЙ |

---

## Финальный вывод

### 1. Можно ли запускать Stage 3 без SEO-доработок?

**Нет.** Stage 3 можно параллелить проектированием, но **релиз отзывов на prod** без SEO-батча — плохая идея: UGC и AggregateRating лягут поверх дыр в индексации, sitemap и structured data.

### 2. Обязательно ДО отзывов

1. ElectricVehicleChargingStation JSON-LD
2. BreadcrumbList JSON-LD
3. Один H1 + желательно H2 для секций
4. Title / Description — шаблоны: оператор + адрес + «зарядка электромобиля» + разъёмы + 150–160 символов
5. 301 на lowercase + без trailing slash
6. Dynamic sitemap (priority 0.7, weekly; lastmod = updated_at)
7. Internal linking — stations + map (2.2b)
8. og:type → website, og:site_name → EV RACE, отдельный og:description
9. Общий og-map.png для Telegram-превью

### 3. После отзывов

- AggregateRating (≥3 отзыва)
- lastmod в sitemap при новых отзывах
- Twitter Card
- geo.position / ICBM
- per-location og:image
- Meta keywords — не нужны

---

## Предлагаемый порядок реализации

```
Батч SEO-1 (блокер):  JSON-LD ×2 + H1 fix + Title/Description templates
Батч SEO-2 (блокер):  sitemap + canonical 301 + internal links
Батч SEO-3 (TG):      OG fixes + og-map.png
Батч SEO-4 (nice):    geo meta + H2 semantics + Twitter
Stage 3:              отзывы + AggregateRating
```

---

## Резюме

ТЗ v2 — точное и достаточное. UI страницы ~90%, **SEO-готовность к индексации ~35–40%**. Критичные дыры: нет JSON-LD, нет sitemap, нет входных ссылок, двойной H1, слабые title/description. Один SEO-батч до Stage 3 — и отзывы лягут на готовый фундамент.

**Следующий шаг (до кода):** утвердить шаблоны Title / Description / JSON-LD name под Infrastructure tone (без race-лексики).
