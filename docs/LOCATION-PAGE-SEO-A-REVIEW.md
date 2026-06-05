# SEO-A — review (не в prod)

**Статус:** реализация в ветке рабочей копии, **не задеплоено**  
**Эталон:** https://evrace.by/zaryadka/minsk-inzhenernaya-18  
**Код:** `functions/_lib/location-seo.js`, `functions/[operator_slug]/[slug].js`, `functions/_lib/location-render.js`, `supabase/functions/get-location/index.ts`

---

## Пример итогового HTML `<head>` (тестовая локация)

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Зарядная станция Zaryadka — Минск, Инженерная, 18 | EV RACE</title>
<meta name="description" content="Зарядная станция Zaryadka — Минск, Инженерная, 18. Быстрая зарядка электромобилей до 160 кВт. Разъёмы CCS2, GBT и Type 2. Отзывы, фото и маршрут на EV RACE.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://evrace.by/zaryadka/minsk-inzhenernaya-18">
<meta property="og:type" content="website">
<meta property="og:title" content="Зарядная станция Zaryadka — Минск, Инженерная, 18 | EV RACE">
<meta property="og:description" content="Быстрая зарядка до 160 кВт. CCS2, GBT и Type 2. Минск, Инженерная, 18.">
<meta property="og:url" content="https://evrace.by/zaryadka/minsk-inzhenernaya-18">
<meta property="og:image" content="https://evrace.by/og.png">
<meta property="og:locale" content="ru_BY">
<meta property="og:site_name" content="EV RACE">
<script type="application/ld+json">…ElectricVehicleChargingStation…</script>
<script type="application/ld+json">…BreadcrumbList…</script>
```

**H1 в body (один на странице):**

```html
<h1 class="loc-hero-h1" id="loc-title" data-fit-line>Минск, Инженерная, 18</h1>
```

Mobile-дубликат identity использует `<p class="loc-hero-h1">` с тем же текстом (не второй H1).

---

## Пример JSON-LD — ElectricVehicleChargingStation

```json
{
  "@context": "https://schema.org",
  "@type": "ElectricVehicleChargingStation",
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
  "operator": {
    "@type": "Organization",
    "name": "Zaryadka"
  },
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "DC charging", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "AC charging", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "CCS2", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "GBT", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Type 2", "value": true }
  ],
  "additionalProperty": [
    { "@type": "PropertyValue", "name": "max_dc_kw", "value": 160 },
    { "@type": "PropertyValue", "name": "max_ac_kw", "value": 44 },
    { "@type": "PropertyValue", "name": "station_count", "value": 8 },
    { "@type": "PropertyValue", "name": "simultaneous_vehicles", "value": 16 }
  ]
}
```

Координаты и точные counts — из API `get-location` (в примере — ожидаемые для тестовой локации).

---

## Пример JSON-LD — BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Главная",
      "item": "https://evrace.by/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Зарядные станции",
      "item": "https://evrace.by/stations.html"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Минск"
    },
    {
      "@type": "ListItem",
      "position": 4,
      "name": "Инженерная, 18"
    }
  ]
}
```

Visible breadcrumbs: «Зарядные станции» (не «Станции 2026»).

---

## Self-review vs SEO Audit v2

| Задача SEO-A | Статус | Комментарий |
|--------------|--------|-------------|
| 1. Один H1 | ✅ | Desktop `h1`, mobile `p` |
| 2. Title template | ✅ | `{operator} — {city}, {address} \| EV RACE` |
| 3. Meta Description | ✅ | ~165 символов, оператор + адрес + kW + разъёмы |
| 4. EVCS JSON-LD | ✅ | name, address, geo, url, operator, features |
| 5. BreadcrumbList | ✅ | Infrastructure wording |
| 6. Open Graph | ✅ | type=website, site_name=EV RACE, short og:description |

### Что SEO-A закрывает из аудита

| Было FAIL | После SEO-A |
|-----------|-------------|
| Title | PASS |
| Description | PASS |
| H1 (двойной) | PASS |
| Schema Consistency (meta слои) | PASS |
| Open Graph | PASS |
| JSON-LD EVCS | PASS |
| JSON-LD BreadcrumbList | PASS |

### Что остаётся **вне** SEO-A (следующие батчи)

| Компонент | Статус |
|-----------|--------|
| URL 301 lowercase / trailing slash | FAIL — не в scope SEO-A |
| Sitemap location URLs | FAIL |
| Internal linking (stations, map) | FAIL |
| Geo meta-теги | FAIL |
| Twitter Card | FAIL |
| AggregateRating | N/A до Stage 3 |
| og:image per-location (og-map.png) | частично — пока общий og.png |

### Замечания для утверждения

1. **H1 с `location_name`:** одна строка `{location_name}` (например «ТЦ Корона — Кальварийская, 24») — адрес в H1 не дублируется; адрес остаётся в Title/JSON-LD.
2. **Description intro** — нейтральный шаблон `{operator} — {city}, {address}.` без склонения города и адреса (Infrastructure, долгоживущий).
3. **Разъёмы в Description** — raw labels из БД (CCS2), в KPI на странице — CCS (это ok: разные слои).
4. **Деплой:** нужны **Pages Function** + **Supabase `get-location`** (meta в API синхронизирован, но SSR считает SEO в Workers независимо).

---

## Чеклист перед prod

- [ ] Автор утверждает шаблоны Title / Description / H1
- [ ] Проверить 2–3 локации: с `location_name`, без, только AC
- [ ] Google Rich Results Test / Яндекс Вебмастер — JSON-LD
- [ ] Telegram preview — og:title + og:description
- [ ] Deploy Pages + `get-location`
- [ ] SEO-B: sitemap, 301, internal links
